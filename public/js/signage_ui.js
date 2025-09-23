// public/js/signage_ui.js

/**
 * @file This script manages the user interface for the public-facing signage display
 * (`signage.html`). It updates the current call display, call histories, and handles
 * the playback and cycling of audio announcements and banner media. It primarily
 * relies on Server-Sent Events (SSE) for real-time data updates from the backend.
 * 
 * Updated to support multiple TTS audio URLs for stem audio fallback.
 * 
 * @author LedoKun <romamp100@gmail.com>
 * @version 1.1.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // Cache references to key HTML elements for efficient access and manipulation.
    const callIdElement = document.getElementById('current-call-id'); // Displays the current call ID.
    const locationElement = document.getElementById('current-location'); // Displays the current call location.
    const listHistoryCalls = document.getElementById('list-history-calls'); // <ul> for recently called history.
    const listSkippedCalls = document.getElementById('list-skipped-calls'); // <ul> for no-show/skipped calls.
    const announcementBannerContainer = document.getElementById('announcement-banner-container'); // Container for banner images/videos.
    let announcementPlaceholderSpan = document.getElementById('announcement-placeholder'); // Span shown when no banner is active.
    const chimeAudio = document.getElementById("chimeAudio"); // <audio> element for the chime sound.
    const announcementAudioPlayer = document.getElementById('announcement-audio-player'); // <audio> element for announcement audio files.
    const ttsAudioPlayer = document.getElementById('tts-audio-player'); // <audio> element for Text-to-Speech audio.
    const sseStatusIndicator = document.getElementById('sse-status-indicator'); // Visual indicator for SSE connection status.

    // --- Internal State Variables ---
    /**
     * @type {Array<string>} Stores the ordered list of supported TTS language codes,
     * fetched from the backend. Used to determine which TTS audio to request/expect for calls.
     */
    let orderedTtsLangCodes = [];

    /**
     * @type {number|null} Stores the interval ID for cycling through announcement banners.
     * This allows the interval to be cleared if the banner set changes or disappears.
     */
    let bannerIntervalId = null;

    /** @constant {number} MAX_HISTORY_ITEMS_DISPLAY Maximum number of completed calls to display in the history list. */
    const MAX_HISTORY_ITEMS_DISPLAY = 7;

    /** @constant {number} MAX_SKIPPED_ITEMS_TO_DISPLAY Maximum number of skipped calls to display in the list. */
    const MAX_SKIPPED_ITEMS_TO_DISPLAY = 4;

    /**
     * @type {Array<object>} The main event queue. Events (new calls, announcements) from SSE
     * are pushed here and processed sequentially to manage audio playback and UI updates.
     */
    let eventQueue = [];

    /**
     * @type {object|null} The event object currently being processed (i.e., its audio is playing or being prepared).
     * Ensures only one event's audio sequence (e.g., chime + TTS for a call) is active at a time.
     */
    let currentProcessingEvent = null;

    /**
     * @type {Array<object>} A queue of audio file URLs and their player types (chime, tts, announcement),
     * specific to the `currentProcessingEvent`. Audio files are played sequentially from this queue.
     */
    let audioPlaybackQueue = [];

    /**
     * @type {boolean} Flag indicating if an audio file from the `audioPlaybackQueue` is currently playing.
     * Prevents multiple audio tracks from playing concurrently.
     */
    let isAudioFilePlaying = false;

    /**
     * @type {object|null} Stores the data of the last call that was successfully displayed/announced.
     * Used to keep the last call's details on screen when no new events are pending and the queue is idle.
     */
    let lastShownCallData = null;

    /** @constant {number} TTS_TIMEOUT_DURATION Duration in milliseconds to wait for TTS audio files before giving up for a specific call. */
    const TTS_TIMEOUT_DURATION = 10000; // 10 seconds

    // --- Critical Dependency Check ---
    // Ensures that 'common.js' (providing UI_TEXT, sanitizeText, formatDisplayTime) is loaded before this script.
    if (typeof UI_TEXT === 'undefined' || typeof sanitizeText === 'undefined' || typeof formatDisplayTime === 'undefined') {
        console.error("SignageUI: CRITICAL - 'common.js' might not be loaded correctly or before 'signage_ui.js'. Some essential utilities are missing.");
        alert("Signage UI cannot initialize fully. Please check browser console for errors related to common.js loading.");
        return; // Stop further initialization if critical dependencies are missing.
    }

    // --- Audio Playback Logic ---

    /**
     * Initiates playback of the next audio file in the `audioPlaybackQueue`.
     * This function is called recursively when a track ends or an error occurs,
     * ensuring sequential playback. It also handles the TTS waiting logic with timeout.
     * @private
     */
    function playNextAudioFileInSequence() {
        // Check if the dedicated audio queue for the current event is empty.
        if (audioPlaybackQueue.length === 0) {
            isAudioFilePlaying = false; // No audio from the queue is playing now.
            console.log("SignageUI: Audio playback queue for current event is empty.");

            // If the current event is a call, special conditions apply (chime, TTS).
            if (currentProcessingEvent && currentProcessingEvent.type === 'call') {
                // Wait for the chime to finish playing before proceeding with TTS or completing the event.
                if (!currentProcessingEvent.chimeFinished) {
                    console.log(`SignageUI: Call event ${currentProcessingEvent.id}-${currentProcessingEvent.location} chime not yet finished, awaiting its completion.`);
                    return; // Chime 'ended' event will recall this function.
                }
                // If TTS is required for this call and not all TTS files are ready.
                if (currentProcessingEvent.requiredTts && currentProcessingEvent.requiredTts.length > 0 && !currentProcessingEvent.ttsReady) {
                    console.log(`SignageUI: Call event ${currentProcessingEvent.id}-${currentProcessingEvent.location} chime finished, but TTS is not ready. Waiting for TTS data to arrive or timeout.`);
                    // Start a timeout if one isn't already running for this call's TTS.
                    if (!currentProcessingEvent.ttsWaitTimeoutId) {
                        console.log(`SignageUI: Starting ${TTS_TIMEOUT_DURATION / 1000}s TTS timeout for ${currentProcessingEvent.id}-${currentProcessingEvent.location}.`);
                        currentProcessingEvent.ttsWaitTimeoutId = setTimeout(() => {
                            // Check if this timeout is still relevant when it fires.
                            if (currentProcessingEvent && // Is there still a current event?
                                currentProcessingEvent.type === 'call' && // Is it a call?
                                !currentProcessingEvent.ttsReady && // Is TTS still not ready?
                                currentProcessingEvent.ttsWaitTimeoutId) { // Was this specific timeout not cleared by incoming TTS?
                                console.warn(`SignageUI: TTS for call ${currentProcessingEvent.id}-${currentProcessingEvent.location} timed out after ${TTS_TIMEOUT_DURATION / 1000} seconds. Proceeding without this TTS.`);
                                currentProcessingEvent.requiredTts = []; // Give up on waiting for these specific TTS files.
                                currentProcessingEvent.ttsReady = true;   // Mark TTS as "resolved" to unblock the event.
                                delete currentProcessingEvent.ttsWaitTimeoutId; // Clear the timeout ID from the event.
                                playNextAudioFileInSequence(); // Re-attempt to process the event, which should now complete.
                            }
                        }, TTS_TIMEOUT_DURATION);
                    }
                    return; // Exit and wait for TTS data or for the timeout to fire.
                }
                console.log(`SignageUI: Call event ${currentProcessingEvent.id}-${currentProcessingEvent.location} all audio (chime and TTS if applicable) finished or TTS not required.`);
            } else if (currentProcessingEvent) {
                // For non-call events (e.g., announcements), if queue is empty, audio is done.
                console.log(`SignageUI: All audio finished for event type: ${currentProcessingEvent.type}.`);
            }

            // --- Event Completion ---
            // If we reach here, all audio for the currentProcessingEvent is considered complete or resolved.

            // Clear any pending TTS timeout if the event finishes successfully before the timeout fires.
            if (currentProcessingEvent && currentProcessingEvent.ttsWaitTimeoutId) {
                clearTimeout(currentProcessingEvent.ttsWaitTimeoutId);
                delete currentProcessingEvent.ttsWaitTimeoutId;
            }

            // Remove event listeners from all audio players to prevent memory leaks and unexpected behavior.
            removeAudioEventListeners(chimeAudio);
            removeAudioEventListeners(announcementAudioPlayer);
            removeAudioEventListeners(ttsAudioPlayer);

            if (currentProcessingEvent) {
                let eventDescription = currentProcessingEvent.type === 'call'
                    ? `call ${currentProcessingEvent.id}-${currentProcessingEvent.location}`
                    : currentProcessingEvent.type;
                console.log(`SignageUI: Finished processing ALL audio for event:`, eventDescription, currentProcessingEvent);
            }
            currentProcessingEvent = null; // Clear the current event, making the system ready for the next one.
            processNextEventFromQueue(); // Attempt to process the next event from the main queue.
            return;
        }

        // Prevent multiple audio files from playing simultaneously if this function is called unexpectedly.
        if (isAudioFilePlaying) {
            console.log("SignageUI: 'playNextAudioFileInSequence' called, but an audio file is already playing. Waiting for current track to finish.");
            return;
        }

        isAudioFilePlaying = true; // Set flag: an audio file is about to play.
        const nextAudio = audioPlaybackQueue.shift(); // Get and remove the first audio item from the event's dedicated queue.

        let player; // Select the appropriate HTMLAudioElement based on the audio type.
        switch (nextAudio.playerType) {
            case 'chime': player = chimeAudio; break;
            case 'announcement': player = announcementAudioPlayer; break;
            case 'tts': player = ttsAudioPlayer; break;
            default:
                console.error("SignageUI: Unknown player type encountered in audio queue:", nextAudio.playerType);
                isAudioFilePlaying = false; // Reset flag.
                playNextAudioFileInSequence(); // Skip this unknown item and try the next.
                return;
        }

        // Prepare the player for the new audio.
        removeAudioEventListeners(player); // Remove any old listeners.
        player.addEventListener('ended', handleAudioFileEnded); // Calls playNextAudioFileInSequence on completion.
        player.addEventListener('error', handleAudioFileError); // Calls playNextAudioFileInSequence on error.

        console.log(`SignageUI: Attempting to play audio file: ${nextAudio.src} using ${nextAudio.playerType} player.`);
        player.src = nextAudio.src; // Set the audio source.
        // Adjust playback rate for TTS and announcements for a "snappier" feel. Chime plays at normal speed.
        player.playbackRate = 1.1;

        // Attempt to play the audio. player.play() returns a Promise.
        player.play()
            .then(() => {
                console.log(`SignageUI: Playback started successfully for ${nextAudio.src}`);
            })
            .catch(e => {
                // Catch errors that might occur if play() is interrupted or fails (e.g., browser restrictions).
                console.error(`SignageUI: Error calling play() for ${nextAudio.src} (${nextAudio.playerType}):`, e);
                isAudioFilePlaying = false; // Reset flag.
                handleAudioFileError({ target: player }); // Manually trigger error handler to ensure queue progresses.
            });
    }

    /**
     * Event handler for when an audio file finishes playing (`ended` event).
     * @param {Event} event - The `ended` event from the audio player.
     * @private
     */
    function handleAudioFileEnded(event) {
        console.log(`SignageUI: Audio file ended: ${event.target.currentSrc}`);
        removeAudioEventListeners(event.target); // Clean up listeners for this specific playback.
        isAudioFilePlaying = false; // Reset playback flag.

        // If the chime audio for a call event finishes, mark it as done on the event object.
        if (currentProcessingEvent && event.target === chimeAudio && currentProcessingEvent.type === 'call') {
            currentProcessingEvent.chimeFinished = true;
            let eventDescription = `call ${currentProcessingEvent.id}-${currentProcessingEvent.location}`;
            console.log(`SignageUI: Chime finished for event ${eventDescription}.`);
        }
        playNextAudioFileInSequence(); // Try to play the next audio file in the sequence.
    }

    /**
     * Event handler for when an audio file encounters an error during playback (`error` event).
     * @param {Event} event - The `error` event from the audio player.
     * @private
     */
    function handleAudioFileError(event) {
        const src = event.target.currentSrc || (event.target.src || "unknown source");
        console.error(`SignageUI: Audio file error encountered for: ${src}. Error details:`, event.target.error);
        removeAudioEventListeners(event.target); // Clean up listeners.
        isAudioFilePlaying = false; // Reset playback flag.

        // If the chime audio for a call event errors, still mark it as "finished"
        // to allow subsequent TTS to proceed if available (or for the TTS timeout to engage).
        if (currentProcessingEvent && event.target === chimeAudio && currentProcessingEvent.type === 'call' && !currentProcessingEvent.chimeFinished) {
            currentProcessingEvent.chimeFinished = true; // Treat error as completion for sequencing purposes.
            let eventDescription = `call ${currentProcessingEvent.id}-${currentProcessingEvent.location}`;
            console.warn(`SignageUI: Chime errored for event ${eventDescription}, marking as finished to attempt TTS.`);
        }
        playNextAudioFileInSequence(); // Attempt to play the next audio, skipping the problematic one.
    }

    /**
     * Removes the 'ended' and 'error' event listeners from a given audio player.
     * @param {HTMLAudioElement} player - The audio player element.
     * @private
     */
    function removeAudioEventListeners(player) {
        player.removeEventListener('ended', handleAudioFileEnded);
        player.removeEventListener('error', handleAudioFileError);
    }

    /**
     * Processes the next event from the main `eventQueue`.
     * This is the central function that orchestrates displaying new calls/announcements
     * and queuing their associated audio. It only proceeds if no other event is currently
     * being processed and no audio is playing.
     * @private
     */
    function processNextEventFromQueue() {
        // Prevent processing if an event is already active or audio is playing from its sequence.
        if (currentProcessingEvent || isAudioFilePlaying) {
            console.log("SignageUI: 'processNextEventFromQueue' called, but system is busy. Skipping.", { currentProcessingEvent: !!currentProcessingEvent, isAudioFilePlaying });
            return;
        }

        // If the main event queue is empty, manage the display.
        if (eventQueue.length === 0) {
            console.log("SignageUI: Main event queue is empty AND no event currently processing its audio.");
            // If no call has ever been shown, or if the display is not already "----", clear it.
            if (!lastShownCallData) {
                if (callIdElement.textContent !== '----') { // Avoid redundant DOM updates if already placeholder
                    updateCurrentCallDisplay(null); // Clear the displayed call to "----".
                }
            } else {
                // If there's a last shown call, ensure its details remain on display.
                updateCurrentCallDisplay(lastShownCallData);
            }
            return;
        }

        // An event is available in the queue; dequeue and process it.
        currentProcessingEvent = eventQueue.shift();
        console.log("SignageUI: Processing next event from main queue:", currentProcessingEvent);

        audioPlaybackQueue = []; // Reset the dedicated audio queue for this new event.
        isAudioFilePlaying = false; // Ensure flag is reset for the new event's audio sequence.

        // Handle 'call' type events.
        if (currentProcessingEvent.type === 'call') {
            updateCurrentCallDisplay(currentProcessingEvent.callData); // Update the visual display with call ID and location.
            lastShownCallData = { ...currentProcessingEvent.callData }; // Store this call's data as the last shown.
            audioPlaybackQueue.push({ src: chimeAudio.src, playerType: 'chime' }); // Always add chime first for a call.
            currentProcessingEvent.chimeFinished = false; // Reset chime status for this new call.

            // If TTS for this call was somehow already marked ready (e.g., re-queued event), add its audio.
            if (currentProcessingEvent.ttsReady) {
                const ttsItems = [];
                // Handle multiple TTS URLs (stem audio fallback)
                if (currentProcessingEvent.receivedTtsUrls && currentProcessingEvent.receivedTtsUrls.length > 0) {
                    currentProcessingEvent.receivedTtsUrls.forEach(audioUrl => {
                        // Avoid adding duplicate TTS audio if somehow already present in queue.
                        if (audioUrl && !audioPlaybackQueue.some(item => item.src === audioUrl && item.playerType === 'tts')) {
                            ttsItems.push({ src: audioUrl, playerType: 'tts' });
                        }
                    });
                }
                if (ttsItems.length > 0) audioPlaybackQueue.push(...ttsItems);
            }
        } else if (currentProcessingEvent.type === 'announcement') {
            // For announcement events, the current call display (if any) should persist on screen.
            console.log("SignageUI: Processing announcement event. Current call display (if any) will persist.");
            // Add all audio files specified for this announcement to its playback queue.
            currentProcessingEvent.audioSequence.forEach(audioItem => audioPlaybackQueue.push({ ...audioItem }));
        }

        // Start playing audio if there are items in the event's playback queue.
        if (audioPlaybackQueue.length > 0) {
            playNextAudioFileInSequence();
        } else {
            // If an event has no audio (e.g., a misconfigured announcement, or a call type that hypothetically has no audio),
            // finish it immediately to prevent blocking the queue.
            let eventDescription = currentProcessingEvent.type === 'call' ? `${currentProcessingEvent.type} ${currentProcessingEvent.id}-${currentProcessingEvent.location}` : currentProcessingEvent.type;
            console.warn("SignageUI: Current event has no audio items in its sequence. Finishing event and attempting to move to next.", eventDescription, currentProcessingEvent);
            if (currentProcessingEvent && currentProcessingEvent.type === 'call') lastShownCallData = { ...currentProcessingEvent.callData }; // Keep its data on screen.

            // Ensure any TTS timeout is cleared if the event is ended prematurely here.
            if (currentProcessingEvent && currentProcessingEvent.ttsWaitTimeoutId) {
                clearTimeout(currentProcessingEvent.ttsWaitTimeoutId);
                delete currentProcessingEvent.ttsWaitTimeoutId;
            }
            currentProcessingEvent = null; // Mark event as processed.
            processNextEventFromQueue();   // Attempt to process the next event.
        }
    }

    // --- Initialization ---

    /**
     * Initializes the signage display by fetching initial states (TTS languages, queue, announcements),
     * setting up event listeners for SSE updates, and populating static placeholders.
     * @async
     * @private
     */
    async function initializeSignage() {
        console.log("SignageUI: Initializing signage page...");
        // Set page language for UI text (primarily for placeholders updated by this script).
        window.currentGlobalLanguage = document.documentElement.lang || 'en';
        updateStaticElementPlaceholders(); // Populate initial placeholders with correct language.

        // Fetch ordered TTS language codes from the backend.
        try {
            const response = await fetch(`${API_BASE_URL}/tts/ordered-languages`);
            if (response.ok) {
                orderedTtsLangCodes = await response.json();
                console.log("SignageUI: Fetched ordered TTS languages:", orderedTtsLangCodes);
            } else {
                console.error("SignageUI: Failed to fetch ordered TTS languages:", response.status, response.statusText);
                orderedTtsLangCodes = []; // Ensure it's an empty array on failure.
            }
        } catch (error) {
            console.error("SignageUI: Error fetching ordered languages:", error);
            orderedTtsLangCodes = []; // Ensure it's an empty array on network/fetch error.
        }

        await fetchInitialStates(); // Fetch initial queue and announcement states.

        // Attach custom event listeners for SSE updates dispatched by `sse_handler.js`.
        document.addEventListener('sse_queueupdate', handleQueueUpdateSSE);
        document.addEventListener('sse_announcementstatus', handleAnnouncementStatusSSE);
        document.addEventListener('sse_ttscomplete', handleTTSCompleteSSE);
        document.addEventListener('sse_status', handleSSEStatusChange);
        console.log("SignageUI: Initialization complete. Waiting for SSE events.");
    }

    /**
     * Fetches the initial queue and announcement states from the backend on page load.
     * This ensures the display is populated even before the first SSE update.
     * @async
     * @private
     */
    async function fetchInitialStates() {
        console.log("SignageUI: Fetching initial states (queue and announcements)...");
        dispatchSseStatusToIndicator('connecting', UI_TEXT[window.currentGlobalLanguage].loading); // Show loading status.
        try {
            // Fetch both states concurrently.
            const [queueRes, annRes] = await Promise.allSettled([
                fetch(`${API_BASE_URL}/queue/state`),
                fetch(`${API_BASE_URL}/announcements/status`)
            ]);

            // Process initial queue state.
            if (queueRes.status === 'fulfilled' && queueRes.value.ok) {
                const queueState = await queueRes.value.json();
                updateQueueDisplayInternals(queueState); // Populate history lists.
                if (queueState.current_call) {
                    updateCurrentCallDisplay(queueState.current_call); // Show current call.
                    lastShownCallData = { ...queueState.current_call }; // Set as last shown.
                } else {
                    updateCurrentCallDisplay(null); // No current call, show placeholders.
                    lastShownCallData = null;
                }
            } else {
                console.error("SignageUI: Failed to fetch initial queue state.");
                // Clear relevant UI parts if fetch fails.
                updateQueueDisplayInternals(null); updateCurrentCallDisplay(null); lastShownCallData = null;
            }

            // Process initial announcement status.
            if (annRes.status === 'fulfilled' && annRes.value.ok) {
                updateAnnouncementDisplay(await annRes.value.json()); // Update banner.
            } else {
                console.error("SignageUI: Failed to fetch initial announcement status.");
                updateAnnouncementDisplay(null); // Clear banner area.
            }
        } catch (error) {
            console.error("SignageUI: Network error during initial state fetch:", error);
            // On critical network error, clear all displays.
            updateQueueDisplayInternals(null); updateCurrentCallDisplay(null); lastShownCallData = null; updateAnnouncementDisplay(null);
        } finally {
            // After initial states are loaded, process event queue (likely empty at this point but good practice).
            processNextEventFromQueue();
        }
    }

    /**
     * Ensures the announcement banner placeholder elements exist inside the container.
     * Creates them dynamically if they were removed (e.g., by innerHTML resets).
     * @returns {{wrapper: HTMLElement|null, span: HTMLElement|null}}
     */
    function ensureBannerPlaceholderElement() {
        if (!announcementBannerContainer) {
            return { wrapper: null, span: null };
        }

        let wrapper = announcementPlaceholderSpan ? announcementPlaceholderSpan.parentElement : null;

        if (!announcementPlaceholderSpan || !wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'w-full h-full flex justify-center items-center bg-gray-750 rounded';

            const span = document.createElement('span');
            span.id = 'announcement-placeholder';
            span.className = 'text-gray-500 text-sm md:text-base';
            span.textContent = 'Announcements';

            wrapper.appendChild(span);
            announcementBannerContainer.appendChild(wrapper);
            announcementPlaceholderSpan = span;
            return { wrapper, span };
        }

        if (!announcementBannerContainer.contains(wrapper)) {
            announcementBannerContainer.appendChild(wrapper);
        }

        return { wrapper, span: announcementPlaceholderSpan };
    }

    /**
     * Removes all child nodes from the announcement banner container.
     */
    function clearBannerContainer(placeholderWrapper = null) {
        if (!announcementBannerContainer) return;
        Array.from(announcementBannerContainer.children).forEach(child => {
            if (!placeholderWrapper || child !== placeholderWrapper) {
                announcementBannerContainer.removeChild(child);
            }
        });
    }

    /**
     * Updates static text placeholders on the page (e.g., "Waiting for calls...")
     * based on the `window.currentGlobalLanguage`.
     * @private
     */
    function updateStaticElementPlaceholders() {
        const lang = window.currentGlobalLanguage || 'en';
        const labels = (UI_TEXT && UI_TEXT[lang]) ? UI_TEXT[lang] : (UI_TEXT && UI_TEXT.en ? UI_TEXT.en : {}); // Fallback to English then empty object.

        const historyLi = listHistoryCalls.querySelector('.italic');
        if (historyLi && listHistoryCalls.children.length <= 1) historyLi.textContent = labels.historyPlaceholder || "Waiting for calls...";

        const skippedLi = listSkippedCalls.querySelector('.italic');
        if (skippedLi && listSkippedCalls.children.length <= 1) skippedLi.textContent = labels.skippedPlaceholder || "No skipped calls.";

        const { span: placeholderSpan } = ensureBannerPlaceholderElement();
        if (placeholderSpan) {
            placeholderSpan.textContent = labels.announcementPlaceholder || "Announcements";
        }
    }

    // --- SSE Event Handlers ---

    /**
     * Handles `sse_queueupdate` custom events. Updates queue displays and queues new calls.
     * This version allows the `currentProcessingEvent` to complete its audio sequence
     * without being interrupted by new `queueState.current_call` data.
     * @param {CustomEvent} event - The custom event with `detail` containing the `queueState`.
     * @private
     */
    function handleQueueUpdateSSE(event) {
        const queueState = event.detail;
        console.log('SignageUI: SSE_QUEUEUPDATE received', queueState);
        updateQueueDisplayInternals(queueState); // Update the visual lists for history/skipped.

        const newCall = queueState.current_call;

        // The aggressive "stale check" that previously aborted currentProcessingEvent is REMOVED.
        // The philosophy is now that currentProcessingEvent should complete its audio sequence,
        // with the TTS timeout within playNextAudioFileInSequence being the safeguard against indefinite hangs.

        if (newCall) { // If there's a current call in the new state.
            let isNewCallToBeQueued = true;

            // Avoid re-queueing if this newCall is the one *currently* being announced.
            if (currentProcessingEvent && currentProcessingEvent.type === 'call' &&
                currentProcessingEvent.id === newCall.id && currentProcessingEvent.location === newCall.location) {
                isNewCallToBeQueued = false;
                console.log("SignageUI: Queue update is for the call currently being processed. Not re-queueing.");
            }

            // Avoid re-queueing if this newCall is already waiting in the eventQueue.
            if (isNewCallToBeQueued && eventQueue.some(evt => evt.type === 'call' && evt.id === newCall.id && evt.location === newCall.location)) {
                isNewCallToBeQueued = false;
                console.log("SignageUI: Queue update is for a call already in the event queue. Not re-queueing.");
            }

            if (isNewCallToBeQueued) {
                console.log("SignageUI: New unique call event identified for queueing:", newCall.id, "-", newCall.location);
                const callEvent = {
                    type: 'call', id: newCall.id, location: newCall.location, callData: { ...newCall },
                    requiredTts: [...orderedTtsLangCodes], receivedTtsUrls: [], // Changed to handle multiple URLs
                    chimeFinished: false, ttsReady: false, timestamp: new Date().toISOString()
                    // ttsWaitTimeoutId will be added dynamically if needed
                };
                eventQueue.push(callEvent);
                console.log("SignageUI: Added call event to main event queue. Queue size:", eventQueue.length);
                processNextEventFromQueue(); // Attempt to process if system is idle.
            } else {
                console.log("SignageUI: Call update received, but it's for an already processing or queued call. No new event created.", newCall.id);
            }
        } else { // No current_call in the new queueState.
            console.log("SignageUI: Queue update received with no current_call.");
            // If nothing is processing and the event queue is also empty,
            // processNextEventFromQueue will handle clearing the main display to "----".
            if (!currentProcessingEvent && eventQueue.length === 0) {
                processNextEventFromQueue();
            }
        }
    }

    /**
     * Handles `sse_announcementstatus` custom events. Updates announcement display
     * and queues new announcement audio sequences.
     * @param {CustomEvent} event - The custom event with `detail` containing `announcementStatus`.
     * @private
     */
    function handleAnnouncementStatusSSE(event) {
        const announcementStatus = event.detail;
        console.log('SignageUI: SSE_ANNOUNCEMENTSTATUS received', announcementStatus);
        updateAnnouncementDisplay(announcementStatus); // Update banner display.

        const announcementAudioFiles = announcementStatus.current_audio_playlist || [];
        if (announcementAudioFiles.length > 0) {
            const primaryAudioSrc = announcementAudioFiles[0]; // Used to identify unique announcements.
            let isNewAnnouncementToBeQueued = true;

            // Avoid re-queueing if this announcement is *currently* playing.
            if (currentProcessingEvent && currentProcessingEvent.type === 'announcement' &&
                currentProcessingEvent.audioSequence.some(item => item.src === primaryAudioSrc && item.playerType === 'announcement')) {
                isNewAnnouncementToBeQueued = false;
            }
            // Avoid re-queueing if this announcement is already in the eventQueue.
            if (isNewAnnouncementToBeQueued && eventQueue.some(evt => evt.type === 'announcement' && evt.audioSequence.some(item => item.src === primaryAudioSrc && item.playerType === 'announcement'))) {
                isNewAnnouncementToBeQueued = false;
            }

            if (isNewAnnouncementToBeQueued) {
                console.log('SignageUI: New unique announcement event identified for queueing.');
                const audioItemsForSequence = [{ src: chimeAudio.src, playerType: 'chime' }]; // Prepend chime.
                announcementAudioFiles.forEach(audioSrc => audioItemsForSequence.push({ src: audioSrc, playerType: 'announcement' }));

                const announcementEvent = {
                    type: 'announcement', data: { ...announcementStatus },
                    audioSequence: audioItemsForSequence, timestamp: new Date().toISOString()
                };
                eventQueue.push(announcementEvent);
                processNextEventFromQueue(); // Attempt to process if system is idle.
            } else {
                console.log('SignageUI: Announcement update received for an already processing or queued announcement.');
            }
        } else {
            console.log('SignageUI: Announcement status received, but no audio playlist. No announcement event created.');
        }
    }

    /**
     * Handles `sse_ttscomplete` custom events. Stores received TTS audio URLs for a call
     * and potentially unblocks its processing if all TTS files are ready.
     * Updated to handle multiple audio URLs for stem audio fallback.
     * @param {CustomEvent} event - The custom event with `detail` containing `ttsData`.
     * @private
     */
    function handleTTSCompleteSSE(event) {
        const ttsData = event.detail; // Contains id, location, lang, audio_urls.
        console.log('SignageUI: SSE_TTSCOMPLETE received:', ttsData);

        // Validate that audio_urls is an array
        if (!Array.isArray(ttsData.audio_urls) || ttsData.audio_urls.length === 0) {
            console.warn('SignageUI: Received TTSComplete event with invalid or empty audio_urls:', ttsData);
            return;
        }

        let targetEventForTTS = null;
        // Check if TTS is for the currently processing call.
        if (currentProcessingEvent && currentProcessingEvent.type === 'call' &&
            currentProcessingEvent.id === ttsData.id && currentProcessingEvent.location === ttsData.location) {
            targetEventForTTS = currentProcessingEvent;
        } else {
            // If not current, search for the call event in the main `eventQueue`.
            targetEventForTTS = eventQueue.find(evt => evt.type === 'call' &&
                evt.id === ttsData.id && evt.location === ttsData.location);
        }

        if (targetEventForTTS) {
            // Check if we already have TTS data for this language to avoid reprocessing
            const langIndex = targetEventForTTS.requiredTts.indexOf(ttsData.lang);
            if (langIndex === -1) {
                console.log(`SignageUI: TTS data received for lang '${ttsData.lang}' but it's not in required languages for call ${targetEventForTTS.id}-${targetEventForTTS.location}. Ignoring.`);
                return;
            }

            // Store the TTS audio URLs for this language
            console.log(`SignageUI: Storing TTS audio URLs (${ttsData.lang}) for call event ${targetEventForTTS.id}-${targetEventForTTS.location}. URLs: ${ttsData.audio_urls.length}`);

            // Remove this language from required list and store the URLs
            targetEventForTTS.requiredTts.splice(langIndex, 1);

            // For multiple languages, we could store per-language, but for simplicity,
            // we'll use the first complete language set received
            if (!targetEventForTTS.receivedTtsUrls || targetEventForTTS.receivedTtsUrls.length === 0) {
                targetEventForTTS.receivedTtsUrls = [...ttsData.audio_urls];
            }

            // Check if all required TTS languages have been received (or we have at least one complete set)
            const allRequiredTTSReceived = targetEventForTTS.requiredTts.length === 0 || targetEventForTTS.receivedTtsUrls.length > 0;

            if (allRequiredTTSReceived && !targetEventForTTS.ttsReady) {
                targetEventForTTS.ttsReady = true; // Mark the event's TTS as ready.
                console.log(`SignageUI: TTS now ready for call event ${targetEventForTTS.id}-${targetEventForTTS.location} with ${targetEventForTTS.receivedTtsUrls.length} audio files.`);

                // Clear any pending TTS timeout for this event as TTS has now completed.
                if (targetEventForTTS.ttsWaitTimeoutId) {
                    console.log(`SignageUI: Clearing TTS timeout for ${targetEventForTTS.id}-${targetEventForTTS.location} as TTS is now ready.`);
                    clearTimeout(targetEventForTTS.ttsWaitTimeoutId);
                    delete targetEventForTTS.ttsWaitTimeoutId;
                }

                // If the target event is the one currently being processed, add its TTS files to the live playback queue.
                if (currentProcessingEvent === targetEventForTTS) {
                    console.log("SignageUI: Adding newly ready TTS audio to live audioPlaybackQueue for CURRENT event.");
                    const ttsAudioItemsToAdd = [];

                    // Add all TTS audio URLs to the playback queue
                    targetEventForTTS.receivedTtsUrls.forEach(audioUrl => {
                        // Ensure it's not already in the live queue (e.g. from a re-entrant call).
                        if (audioUrl && !audioPlaybackQueue.some(item => item.src === audioUrl && item.playerType === 'tts')) {
                            ttsAudioItemsToAdd.push({ src: audioUrl, playerType: 'tts' });
                        }
                    });

                    if (ttsAudioItemsToAdd.length > 0) {
                        // Insert TTS audio after the chime if chime hasn't finished.
                        const chimeIndex = audioPlaybackQueue.findIndex(item => item.playerType === 'chime');
                        if (chimeIndex !== -1 && !targetEventForTTS.chimeFinished) {
                            audioPlaybackQueue.splice(chimeIndex + 1, 0, ...ttsAudioItemsToAdd);
                        } else { // Chime finished, or no chime, add to end.
                            audioPlaybackQueue.push(...ttsAudioItemsToAdd);
                        }
                        // If the system was paused waiting for this TTS and chime is done, restart playback.
                        if (targetEventForTTS.chimeFinished && !isAudioFilePlaying) {
                            playNextAudioFileInSequence();
                        }
                    } else if (!isAudioFilePlaying && audioPlaybackQueue.length === 0 && targetEventForTTS.chimeFinished) {
                        // Case: All TTS declared ready but no URLs to add, chime finished, and the audio queue is empty. 
                        // Proceed to finish the event.
                        playNextAudioFileInSequence();
                    }
                }
            }
        } else {
            console.log("SignageUI: Received TTS for an unknown or outdated call event (not current and not in queue). Ignoring:", ttsData);
        }
    }

    /**
     * Handles `sse_status` custom events. Updates the visual SSE connection status indicator.
     * @param {CustomEvent} event - The custom event with `detail` containing status info.
     * @private
     */
    function handleSSEStatusChange(event) {
        dispatchSseStatusToIndicator(event.detail.status, event.detail.message);
    }

    /**
     * Updates the visual display of the SSE connection status indicator.
     * @param {string} statusKey - The status key (e.g., 'connecting', 'connected', 'disconnected').
     * @param {string} [message=''] - An optional human-readable message.
     * @private
     */
    function dispatchSseStatusToIndicator(statusKey, message = '') {
        if (!sseStatusIndicator) return;
        sseStatusIndicator.textContent = message || statusKey;
        let bgColor = sseStatusIndicator.dataset.lastBgColor || 'bg-gray-500'; // Default.
        switch (statusKey) {
            case 'connecting': bgColor = 'bg-yellow-500'; break;
            case 'connected': bgColor = 'bg-green-500'; break;
            case 'disconnected': bgColor = 'bg-red-500'; break;
            default: bgColor = 'bg-gray-600'; // Fallback for unknown status.
        }
        sseStatusIndicator.className = `fixed bottom-1 right-1 p-1 px-2 text-xs rounded-full text-white opacity-75 z-50 ${bgColor}`;
        sseStatusIndicator.dataset.lastBgColor = bgColor; // Store for persistence if needed.
    }

    // --- UI Update Helper Functions ---

    /**
     * Updates the main display for the current call ID and location.
     * @param {object|null} callData - The call object to display, or `null` to clear.
     * @private
     */
    function updateCurrentCallDisplay(callData) {
        if (callData && callData.id && callData.location) {
            callIdElement.textContent = sanitizeText(callData.id);
            locationElement.textContent = sanitizeText(callData.location);
        } else {
            callIdElement.textContent = '----'; // Placeholder for no current call.
            locationElement.textContent = '----';
        }
    }

    /**
     * Updates the displayed lists for completed and skipped call histories.
     * @param {object|null} queueState - The queue state object, or `null` to clear.
     * @private
     */
    function updateQueueDisplayInternals(queueState) {
        const lang = window.currentGlobalLanguage || 'en';
        const labels = (UI_TEXT && UI_TEXT[lang]) ? UI_TEXT[lang] : (UI_TEXT.en || {});

        // Update completed call history list.
        listHistoryCalls.innerHTML = ''; // Clear previous items.
        if (queueState && queueState.completed_history && queueState.completed_history.length > 0) {
            queueState.completed_history.slice(0, MAX_HISTORY_ITEMS_DISPLAY).forEach(call => {
                const li = document.createElement('li');
                li.className = 'history-item flex justify-between items-center';
                li.innerHTML = `<span><strong class="font-semibold id-part">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold id-part">${sanitizeText(call.location)}</strong></span>
                                <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                listHistoryCalls.appendChild(li); // Appends: newest (from server) appears at top if server sends newest first.
            });
        } else {
            listHistoryCalls.innerHTML = `<li class="history-item italic text-gray-500">${labels.historyPlaceholder || "Waiting for calls..."}</li>`;
        }

        // Update skipped call history list.
        listSkippedCalls.innerHTML = ''; // Clear previous items.
        if (queueState && queueState.skipped_history && queueState.skipped_history.length > 0) {
            queueState.skipped_history.slice(0, MAX_SKIPPED_ITEMS_TO_DISPLAY).forEach(call => {
                const li = document.createElement('li');
                li.className = 'history-item flex justify-between items-center';
                li.innerHTML = `<span><strong class="font-semibold id-part text-yellow-400">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold id-part text-yellow-400">${sanitizeText(call.location)}</strong></span>
                                <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                listSkippedCalls.appendChild(li);
            });
        } else {
            listSkippedCalls.innerHTML = `<li class="history-item italic text-gray-500">${labels.skippedPlaceholder || "No skipped calls."}</li>`;
        }
    }

    /**
     * Updates the announcement display area, managing banner image/video cycling.
     * @param {object|null} announcementStatus - Current announcement status, or `null` to clear.
     * @private
     */
    function updateAnnouncementDisplay(announcementStatus) {
        if (!announcementBannerContainer) return;

        // Clear any existing banner cycling interval.
        if (bannerIntervalId) {
            clearInterval(bannerIntervalId);
            bannerIntervalId = null;
        }

        const { wrapper: placeholderWrapper, span: placeholderSpan } = ensureBannerPlaceholderElement();

        clearBannerContainer(placeholderWrapper);

        // If no announcement or no banners, show the placeholder text.
        if (!announcementStatus || !announcementStatus.current_banner_playlist || announcementStatus.current_banner_playlist.length === 0) {
            if (placeholderWrapper) {
                placeholderWrapper.classList.remove('hidden');
                announcementBannerContainer.appendChild(placeholderWrapper);
            }
            if (placeholderSpan) {
                const lang = window.currentGlobalLanguage || 'en';
                const labels = (UI_TEXT && UI_TEXT[lang]) ? UI_TEXT[lang] : (UI_TEXT && UI_TEXT.en ? UI_TEXT.en : {});
                placeholderSpan.textContent = labels.announcementPlaceholder || "Announcements";
            }
            return;
        }

        if (placeholderWrapper) {
            placeholderWrapper.classList.add('hidden');
        }

        const banners = announcementStatus.current_banner_playlist.slice();
        let currentBannerIdx = 0; // Start with the first banner.

        /** Displays the banner at `currentBannerIdx`. Handles images and videos. */
        function displayCurrentBanner() {
            if (banners.length === 0) {
                if (placeholderWrapper) {
                    announcementBannerContainer.appendChild(placeholderWrapper);
                }
                return;
            }

            const bannerUrl = banners[currentBannerIdx];
            const extension = bannerUrl.split('.').pop().toLowerCase();
            clearBannerContainer(placeholderWrapper);

            if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) {
                const img = document.createElement('img');
                img.src = bannerUrl;
                img.alt = "Announcement Banner";
                img.className = "banner-media";
                announcementBannerContainer.appendChild(img);
            } else if (["mp4", "webm", "ogg", "mov"].includes(extension)) {
                const video = document.createElement('video');
                video.src = bannerUrl;
                video.className = "banner-media";
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.loop = (banners.length === 1);
                if (banners.length > 1) {
                    video.onended = () => {
                        currentBannerIdx = (currentBannerIdx + 1) % banners.length;
                        displayCurrentBanner();
                    };
                }
                announcementBannerContainer.appendChild(video);
                video.play().catch(e => console.error("SignageUI: Error playing banner video:", bannerUrl, e));
            } else {
                console.warn('SignageUI: Unsupported banner media type:', bannerUrl);
                if (placeholderWrapper) {
                    placeholderWrapper.classList.remove('hidden');
                    announcementBannerContainer.appendChild(placeholderWrapper);
                }
            }
        }

        displayCurrentBanner(); // Display the first banner immediately.

        // If multiple banners, and they are all images, set up an interval to cycle them.
        // Videos handle their own cycling via the 'onended' event.
        if (banners.length > 1) {
            const isImagePlaylist = banners.every(url => {
                const ext = url.split('.').pop().toLowerCase();
                return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
            });

            if (isImagePlaylist) {
                const imageCycleTime = (announcementStatus.banner_cycle_interval_seconds || 10) * 1000; // Default to 10s.
                bannerIntervalId = setInterval(() => {
                    currentBannerIdx = (currentBannerIdx + 1) % banners.length;
                    displayCurrentBanner();
                }, imageCycleTime);
            }
        }
    }

    // Start the initialization process once the DOM is fully loaded.
    initializeSignage();
});
