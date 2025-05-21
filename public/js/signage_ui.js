// public/js/signage_ui.js

/**
 * @file This script manages the user interface for the public-facing signage display
 * (`signage.html`). It updates the current call display, call histories, and handles
 * the playback and cycling of audio announcements and banner media. It primarily
 * relies on Server-Sent Events (SSE) for real-time data updates from the backend.
 * @author LedoKun <romamp100@gmail.com>
 * @version 1.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // Cache references to key HTML elements for efficient access and manipulation.
    const callIdElement = document.getElementById('current-call-id');
    const locationElement = document.getElementById('current-location');

    const listHistoryCalls = document.getElementById('list-history-calls');
    const listSkippedCalls = document.getElementById('list-skipped-calls');

    const announcementBannerContainer = document.getElementById('announcement-banner-container');
    const announcementPlaceholderSpan = document.getElementById('announcement-placeholder');

    // Audio players. HTML media elements need to be pre-defined with IDs.
    const chimeAudio = document.getElementById("chimeAudio"); // Audio element for the "chime" sound.
    const announcementAudioPlayer = document.getElementById('announcement-audio-player'); // For announcement audio files.
    const ttsAudioPlayer = document.getElementById('tts-audio-player'); // For Text-to-Speech audio files.

    const sseStatusIndicator = document.getElementById('sse-status-indicator'); // Visual indicator for SSE connection status.

    // --- Internal State Variables ---
    /**
     * @type {Array<string>} Stores the ordered list of supported TTS language codes,
     * fetched from the backend, used to determine which TTS audio to request/expect.
     */
    let orderedTtsLangCodes = [];

    /**
     * @type {number|null} Stores the interval ID for cycling through announcement banners,
     * allowing it to be cleared when the banner set changes or disappears.
     */
    let bannerIntervalId = null;

    /**
     * @constant {number} MAX_HISTORY_ITEMS_DISPLAY - Maximum number of completed calls to display.
     */
    const MAX_HISTORY_ITEMS_DISPLAY = 7;

    /**
     * @constant {number} MAX_SKIPPED_ITEMS_TO_DISPLAY - Maximum number of skipped calls to display.
     */
    const MAX_SKIPPED_ITEMS_TO_DISPLAY = 4;

    /**
     * @type {Array<object>} The main event queue. Events (call, announcement) from SSE
     * are pushed here and processed sequentially to manage audio playback.
     */
    let eventQueue = [];

    /**
     * @type {object|null} The event object currently being processed (i.e., its audio is playing or being prepared).
     * Ensures only one event's audio sequence is active at a time.
     */
    let currentProcessingEvent = null;

    /**
     * @type {Array<object>} A queue of audio file URLs and their player types, specific to the `currentProcessingEvent`.
     * Audio files are played sequentially from this queue.
     */
    let audioPlaybackQueue = [];

    /**
     * @type {boolean} Flag indicating if an audio file is currently playing.
     * Prevents multiple audio tracks from playing concurrently.
     */
    let isAudioFilePlaying = false;

    /**
     * @type {object|null} Stores the data of the last call successfully displayed/announced.
     * Used to keep call details on screen when no new events are pending.
     */
    let lastShownCallData = null;

    // --- Critical Dependency Check ---
    // Ensure 'common.js' is loaded. `api_client.js` is not strictly required here
    // for this script to function, as all data comes via SSE after initial fetch.
    if (typeof UI_TEXT === 'undefined' || typeof sanitizeText === 'undefined' || typeof formatDisplayTime === 'undefined') {
        console.error("SignageUI: CRITICAL - 'common.js' might not be loaded correctly or before 'signage_ui.js'. Some essential utilities are missing.");
        alert("Signage UI cannot initialize fully. Please check browser console for errors related to common.js loading.");
        return; // Stop further initialization if critical dependencies are missing.
    }


    // --- Audio Playback Logic ---

    /**
     * Initiates playback of the next audio file in the `audioPlaybackQueue`.
     * This function is recursive, calling itself when a track ends.
     * It ensures only one audio file plays at a time.
     * @private
     */
    function playNextAudioFileInSequence() {
        // If the queue is empty, all audio for the current event has finished or is pending.
        if (audioPlaybackQueue.length === 0) {
            isAudioFilePlaying = false; // Mark that no audio is actively playing from the queue.
            console.log("SignageUI: Audio playback queue for current event is empty.");

            if (currentProcessingEvent && currentProcessingEvent.type === 'call') {
                // If chime hasn't finished, wait for it.
                if (!currentProcessingEvent.chimeFinished) {
                    console.log(`SignageUI: Call event ${currentProcessingEvent.id}-${currentProcessingEvent.location} chime not yet finished, awaiting its completion.`);
                    return; // Wait for chime to signal its completion via its 'ended' event.
                }
                // Chime IS finished. Now check if we were waiting for TTS that hasn't arrived.
                // If TTS is required but not yet ready, don't terminate the event.
                // handleTTSCompleteSSE will eventually call playNextAudioFileInSequence again.
                if (currentProcessingEvent.requiredTts && currentProcessingEvent.requiredTts.length > 0 && !currentProcessingEvent.ttsReady) {
                    console.log(`SignageUI: Call event ${currentProcessingEvent.id}-${currentProcessingEvent.location} chime finished, but TTS is not ready. Waiting for TTS data to arrive.`);
                    // Do NOT nullify currentProcessingEvent or call processNextEventFromQueue here.
                    // Rely on handleTTSCompleteSSE to push TTS to the queue and then call playNextAudioFileInSequence.
                    return;
                }
                console.log(`SignageUI: Call event ${currentProcessingEvent.id}-${currentProcessingEvent.location} all audio (chime and TTS if applicable) finished or TTS not required.`);
            } else if (currentProcessingEvent) {
                // For non-call events, or if it's a call event where TTS was ready or not required.
                console.log(`SignageUI: All audio finished for event type: ${currentProcessingEvent.type}.`);
            }

            // If we reach here, it means all audio for the current event has truly completed.
            // Remove event listeners to prevent memory leaks and unintended behavior.
            removeAudioEventListeners(chimeAudio);
            removeAudioEventListeners(announcementAudioPlayer);
            removeAudioEventListeners(ttsAudioPlayer);

            // Log completion of the current processing event and prepare for the next.
            if (currentProcessingEvent) {
                let eventDescription = currentProcessingEvent.type === 'call'
                    ? `call ${currentProcessingEvent.id}-${currentProcessingEvent.location}`
                    : currentProcessingEvent.type;
                console.log(`SignageUI: Finished processing ALL audio for event:`, eventDescription, currentProcessingEvent);
            }
            currentProcessingEvent = null; // Clear the current event to allow processing the next.
            processNextEventFromQueue(); // Attempt to process the next event from the main queue.
            return;
        }

        // Prevent multiple audio files from playing simultaneously if this function is called unexpectedly.
        if (isAudioFilePlaying) {
            console.log("SignageUI: 'playNextAudioFileInSequence' called, but an audio file is already playing. Waiting for current track to finish.");
            return;
        }

        isAudioFilePlaying = true; // Set flag: an audio file is about to play.
        const nextAudio = audioPlaybackQueue.shift(); // Get and remove the first item from the queue.

        let player;
        // Select the appropriate HTML audio player element.
        switch (nextAudio.playerType) {
            case 'chime': player = chimeAudio; break;
            case 'announcement': player = announcementAudioPlayer; break;
            case 'tts': player = ttsAudioPlayer; break;
            default:
                console.error("SignageUI: Unknown player type encountered in audio queue:", nextAudio.playerType);
                isAudioFilePlaying = false; // Reset flag and try the next audio.
                playNextAudioFileInSequence(); // Skip this unknown item
                return;
        }

        // Remove old event listeners to prevent issues from previous plays.
        removeAudioEventListeners(player);
        // Add new event listeners for 'ended' and 'error' events.
        player.addEventListener('ended', handleAudioFileEnded);
        player.addEventListener('error', handleAudioFileError);

        console.log(`SignageUI: Attempting to play audio file: ${nextAudio.src} using ${nextAudio.playerType} player.`);
        player.src = nextAudio.src; // Set the audio source.
        // Adjust playback rate for faster announcements/TTS for a snappier feel.
        player.playbackRate = (nextAudio.playerType === 'announcement' || nextAudio.playerType === 'tts') ? 1.25 : 1.0;

        // Attempt to play the audio. `player.play()` returns a Promise.
        player.play()
            .then(() => {
                console.log(`SignageUI: Playback started successfully for ${nextAudio.src}`);
            })
            .catch(e => {
                // Catch errors that might occur if play() is interrupted or fails.
                console.error(`SignageUI: Error calling play() for ${nextAudio.src} (${nextAudio.playerType}):`, e);
                isAudioFilePlaying = false; // Reset flag.
                handleAudioFileError({ target: player }); // Manually trigger error handler to ensure queue progresses.
            });
    }

    /**
     * Event handler for when an audio file finishes playing (`ended` event).
     * Removes event listeners, resets flags, and attempts to play the next audio in sequence.
     * @param {Event} event - The `ended` event from the audio player.
     * @private
     */
    function handleAudioFileEnded(event) {
        console.log(`SignageUI: Audio file ended: ${event.target.currentSrc}`);
        removeAudioEventListeners(event.target); // Clean up listeners.
        isAudioFilePlaying = false; // Reset playback flag.

        // Special case: If the chime audio for a call event finishes, mark it as done.
        if (currentProcessingEvent && event.target === chimeAudio && currentProcessingEvent.type === 'call') {
            currentProcessingEvent.chimeFinished = true;
            let eventDescription = `call ${currentProcessingEvent.id}-${currentProcessingEvent.location}`;
            console.log(`SignageUI: Chime finished for event ${eventDescription}.`);
        }

        playNextAudioFileInSequence(); // Try to play the next audio file.
    }

    /**
     * Event handler for when an audio file encounters an error during playback (`error` event).
     * Logs the error, cleans up, and attempts to play the next audio in sequence.
     * @param {Event} event - The `error` event from the audio player.
     * @private
     */
    function handleAudioFileError(event) {
        const src = event.target.currentSrc || (event.target.src || "unknown source");
        console.error(`SignageUI: Audio file error encountered for: ${src}. Error details:`, event.target.error);
        removeAudioEventListeners(event.target); // Clean up listeners.
        isAudioFilePlaying = false; // Reset playback flag.

        // Special case: If the chime audio for a call event errors, still mark it as "finished" to allow TTS to proceed if available.
        if (currentProcessingEvent && event.target === chimeAudio && currentProcessingEvent.type === 'call' && !currentProcessingEvent.chimeFinished) {
            currentProcessingEvent.chimeFinished = true; // Treat error as completion for sequencing.
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
     * Processes the next event from the `eventQueue`.
     * This is the central function that orchestrates displaying new calls/announcements
     * and queuing their associated audio.
     * @private
     */
    function processNextEventFromQueue() {
        // Prevent processing if an event is already active or audio is playing.
        if (currentProcessingEvent || isAudioFilePlaying) {
            console.log("SignageUI: 'processNextEventFromQueue' called, but system is busy (event active or audio playing). Skipping.",
                { currentProcessingEvent: !!currentProcessingEvent, isAudioFilePlaying });
            return;
        }

        // If the main event queue is empty, and no event is currently being processed,
        // manage the display of the current call.
        if (eventQueue.length === 0) {
            console.log("SignageUI: Main event queue is empty AND no event currently processing its audio.");
            // If there's no `lastShownCallData` (meaning no call has ever been announced/displayed)
            // or if the current display is not the default '----', clear the display.
            if (!lastShownCallData) {
                const currentDisplayId = callIdElement.textContent;
                if (currentDisplayId !== '----') {
                    console.log("SignageUI: Event queue empty, no current processing, and no last shown call. Clearing display.");
                    updateCurrentCallDisplay(null); // Clear the displayed call.
                }
            } else {
                // If there's a last shown call, ensure its details remain on display.
                console.log("SignageUI: Event queue empty. Display remains on last shown call:", lastShownCallData.id);
                updateCurrentCallDisplay(lastShownCallData);
            }
            return;
        }

        // If we reach here, `eventQueue` has items, so process the next one.
        currentProcessingEvent = eventQueue.shift(); // Get and remove the next event.
        console.log("SignageUI: Processing next event from main queue:", currentProcessingEvent);

        // Reset audio playback queue for the new event.
        audioPlaybackQueue = [];
        // isAudioFilePlaying should be false here due to the guard at the start of this function,
        // but explicitly setting it ensures a clean state if logic changes.
        isAudioFilePlaying = false;

        // Handle 'call' type events.
        if (currentProcessingEvent.type === 'call') {
            updateCurrentCallDisplay(currentProcessingEvent.callData); // Update the visual display.
            lastShownCallData = { ...currentProcessingEvent.callData }; // Store for persistence.

            // Always add chime audio first for a call event.
            audioPlaybackQueue.push({ src: chimeAudio.src, playerType: 'chime' });
            currentProcessingEvent.chimeFinished = false; // Flag to track chime completion.

            // If TTS audio for this call is already ready (received before event was processed), add it to the audio queue.
            if (currentProcessingEvent.ttsReady) {
                const ttsItems = [];
                currentProcessingEvent.requiredTts.forEach(langCode => {
                    const audioUrl = currentProcessingEvent.receivedTts[langCode];
                    if (audioUrl) {
                        // Avoid adding duplicate TTS audio if somehow already present.
                        if (!audioPlaybackQueue.some(item => item.src === audioUrl && item.playerType === 'tts')) {
                            ttsItems.push({ src: audioUrl, playerType: 'tts' });
                        }
                    }
                });
                if (ttsItems.length > 0) {
                    audioPlaybackQueue.push(...ttsItems);
                    console.log("SignageUI: Call event TTS was already ready when event processing started, added to audio items queue:", ttsItems);
                }
            }
        } else if (currentProcessingEvent.type === 'announcement') {
            // For announcement events, the current call display (if any) should persist.
            console.log("SignageUI: Processing announcement event. Current call display (if any) will persist during announcement.");
            // Add all audio files for the announcement to the audio playback queue.
            currentProcessingEvent.audioSequence.forEach(audioItem => {
                audioPlaybackQueue.push({ ...audioItem });
            });
        }

        // Start playing audio if there are items in the playback queue.
        if (audioPlaybackQueue.length > 0) {
            playNextAudioFileInSequence();
        } else {
            // If an event has no audio (e.g., a silent announcement), finish it immediately.
            let eventDescription = currentProcessingEvent.type === 'call'
                ? `${currentProcessingEvent.type} ${currentProcessingEvent.id}-${currentProcessingEvent.location}`
                : currentProcessingEvent.type;
            console.warn("SignageUI: Current event has no audio items in its sequence. Finishing event and attempting to move to next.", eventDescription, currentProcessingEvent);
            // If it was a call with no audio (unlikely given chime is always added), ensure `lastShownCallData` is updated.
            if (currentProcessingEvent && currentProcessingEvent.type === 'call') {
                lastShownCallData = { ...currentProcessingEvent.callData };
            }
            currentProcessingEvent = null; // Mark event as processed.
            processNextEventFromQueue(); // Attempt to process the next event.
        }
    }

    // --- Initialization ---

    /**
     * Initializes the signage display by fetching initial states (TTS languages, queue, announcements),
     * setting up event listeners for SSE updates, and populating static placeholders.
     * @async
     */
    async function initializeSignage() {
        console.log("SignageUI: Initializing signage page...");
        // Set page language for UI text.
        window.currentGlobalLanguage = document.documentElement.lang || 'en';
        updateStaticElementPlaceholders(); // Populate initial placeholders with correct language.

        // Fetch ordered TTS language codes from the backend. This is crucial for knowing
        // which TTS audio files to expect for call announcements.
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

        fetchInitialStates(); // Fetch initial queue and announcement states.

        // Attach custom event listeners for SSE updates. These events are dispatched by `sse_handler.js`.
        document.addEventListener('sse_queueupdate', handleQueueUpdateSSE);
        document.addEventListener('sse_announcementstatus', handleAnnouncementStatusSSE);
        document.addEventListener('sse_ttscomplete', handleTTSCompleteSSE);
        document.addEventListener('sse_status', handleSSEStatusChange);

        console.log("SignageUI: Initialization complete. Waiting for SSE events to populate the main event queue...");
    }

    /**
     * Fetches the initial queue and announcement states from the backend on page load.
     * This ensures the display is populated even before the first SSE update.
     * @async
     * @private
     */
    async function fetchInitialStates() {
        console.log("SignageUI: Fetching initial states (queue and announcements)...");
        // Update SSE indicator to show loading status.
        dispatchSseStatusToIndicator('connecting', UI_TEXT[window.currentGlobalLanguage].loading);
        try {
            // Fetch both states concurrently.
            const [queueRes, annRes] = await Promise.allSettled([
                fetch(`${API_BASE_URL}/queue/state`),
                fetch(`${API_BASE_URL}/announcements/status`)
            ]);

            // Process initial queue state.
            if (queueRes.status === 'fulfilled' && queueRes.value.ok) {
                const queueState = await queueRes.value.json();
                console.log("SignageUI: Initial Queue State Received:", queueState);
                updateQueueDisplayInternals(queueState);
                // Initialize `lastShownCallData` based on the fetched current call.
                if (queueState.current_call) {
                    updateCurrentCallDisplay(queueState.current_call);
                    lastShownCallData = { ...queueState.current_call };
                } else {
                    updateCurrentCallDisplay(null);
                    lastShownCallData = null;
                }
            } else {
                console.error("SignageUI: Failed to fetch initial queue state:", queueRes.reason || queueRes.value?.statusText);
                updateQueueDisplayInternals(null); // Clear queue displays.
                updateCurrentCallDisplay(null); // Clear current call display.
                lastShownCallData = null;
            }

            // Process initial announcement status.
            if (annRes.status === 'fulfilled' && annRes.value.ok) {
                const announcementStatus = await annRes.value.json();
                console.log("SignageUI: Initial Announcement Status Received:", announcementStatus);
                updateAnnouncementDisplay(announcementStatus);
            } else {
                console.error("SignageUI: Failed to fetch initial announcement status:", annRes.reason || annRes.value?.statusText);
                updateAnnouncementDisplay(null); // Clear announcement display.
            }
        } catch (error) {
            console.error("SignageUI: Network error during initial state fetch:", error);
            // On a critical network error, clear all displays.
            updateQueueDisplayInternals(null);
            updateCurrentCallDisplay(null);
            lastShownCallData = null;
            updateAnnouncementDisplay(null);
        } finally {
            // Update SSE indicator to 'connected' after initial data is loaded.
            // This might be premature if SSE connection itself hasn't confirmed via sse_handler.js
            // dispatchSseStatusToIndicator('connected', UI_TEXT[window.currentGlobalLanguage].connected);

            // After initial states are loaded, if no events are queued and no current call was fetched,
            // the idle logic in `processNextEventFromQueue` will ensure the display is "----".
            processNextEventFromQueue();
        }
    }

    /**
     * Updates static text placeholders on the page (e.g., "Waiting for calls...")
     * based on the `window.currentGlobalLanguage`.
     * @private
     */
    function updateStaticElementPlaceholders() {
        const lang = window.currentGlobalLanguage || 'en';
        // Retrieve localized labels, falling back to English if the specific language is not found.
        const labels = (typeof UI_TEXT !== 'undefined' && UI_TEXT[lang])
            ? UI_TEXT[lang]
            : (typeof UI_TEXT !== 'undefined' ? UI_TEXT.en : {});

        // Update history list placeholder.
        const historyLi = listHistoryCalls.querySelector('.italic');
        if (historyLi && listHistoryCalls.children.length <= 1) { // Check if only the placeholder is present.
            historyLi.textContent = labels.historyPlaceholder || "Waiting for calls...";
        }

        // Update skipped list placeholder.
        const skippedLi = listSkippedCalls.querySelector('.italic');
        if (skippedLi && listSkippedCalls.children.length <= 1) { // Check if only the placeholder is present.
            skippedLi.textContent = labels.skippedPlaceholder || "No skipped calls.";
        }

        // Update announcement placeholder.
        if (announcementPlaceholderSpan) {
            announcementPlaceholderSpan.textContent = labels.announcementPlaceholder || "Announcements";
        }
    }


    // --- SSE Event Handlers ---

    /**
     * Handles `sse_queueupdate` custom events, triggered by `sse_handler.js`.
     * Processes new queue state, potentially queuing a new call event for playback.
     * @param {CustomEvent} event - The custom event with `detail` containing the `queueState`.
     * @private
     */
    function handleQueueUpdateSSE(event) {
        const queueState = event.detail;
        console.log('SignageUI: SSE_QUEUEUPDATE received', queueState);
        updateQueueDisplayInternals(queueState); // Update the visual queue lists.

        if (queueState && queueState.current_call) {
            const newCall = queueState.current_call;
            let isNewCallToBeQueued = true;

            // Check if this queue update is for the call currently being processed/played.
            if (currentProcessingEvent && currentProcessingEvent.type === 'call' &&
                currentProcessingEvent.id === newCall.id && currentProcessingEvent.location === newCall.location) {
                isNewCallToBeQueued = false;
                console.log("SignageUI: Queue update is for currently processing call. Not creating new event.");
            }
            // Check if this call is already in the event queue awaiting processing.
            if (isNewCallToBeQueued && eventQueue.length > 0) {
                const lastEventInQueue = eventQueue[eventQueue.length - 1];
                if (lastEventInQueue.type === 'call' && lastEventInQueue.id === newCall.id && lastEventInQueue.location === newCall.location) {
                    isNewCallToBeQueued = false;
                    console.log("SignageUI: Queue update is for call already in event queue. Not creating new event.");
                }
            }

            // If it's a new, unique call event, add it to the main `eventQueue`.
            if (isNewCallToBeQueued) {
                console.log("SignageUI: New unique call event identified for queueing:", newCall.id, "-", newCall.location);
                const callEvent = {
                    type: 'call', // Event type indicator.
                    id: newCall.id,
                    location: newCall.location,
                    callData: { ...newCall }, // Store a copy of the full call data.
                    requiredTts: [...orderedTtsLangCodes], // Which languages TTS is needed for.
                    receivedTts: {}, // Store received TTS audio URLs by language.
                    // audioSequence: [{ src: chimeAudio.src, playerType: 'chime' }], // Chime is added in processNextEventFromQueue
                    chimeFinished: false, // Flag to ensure chime completes before TTS.
                    ttsReady: false, // Flag indicating if all required TTS audio is received.
                    timestamp: new Date().toISOString() // Timestamp of when event was queued locally.
                };
                eventQueue.push(callEvent);
                console.log("SignageUI: Added call event to main event queue. Queue size:", eventQueue.length);
                processNextEventFromQueue(); // Attempt to process the event if the system is idle.
            } else {
                console.log("SignageUI: Call update received, but it appears to be for an already processing or queued call. No new event created.", newCall.id);
            }
        } else {
            console.log("SignageUI: Queue update received with no current_call. No new call event created.");
            // If queue becomes empty (no current_call), and no events are processing,
            // ensure the display might clear or show last call based on logic in processNextEventFromQueue.
            if (!currentProcessingEvent && eventQueue.length === 0) {
                processNextEventFromQueue(); // Check if display needs clearing.
            }
        }
    }

    /**
     * Handles `sse_announcementstatus` custom events, triggered by `sse_handler.js`.
     * Updates announcement display and potentially queues a new announcement event for playback.
     * @param {CustomEvent} event - The custom event with `detail` containing the `announcementStatus`.
     * @private
     */
    function handleAnnouncementStatusSSE(event) {
        const announcementStatus = event.detail;
        console.log('SignageUI: SSE_ANNOUNCEMENTSTATUS received', announcementStatus);
        updateAnnouncementDisplay(announcementStatus); // Update banner display and cooldown.

        const announcementAudioFiles = announcementStatus.current_audio_playlist || [];

        if (announcementAudioFiles.length > 0) {
            const primaryAudioSrc = announcementAudioFiles[0]; // Use the first audio file as a unique identifier for the announcement.
            let isNewAnnouncementToBeQueued = true;

            // Check if this announcement is already being processed.
            if (currentProcessingEvent && currentProcessingEvent.type === 'announcement' &&
                currentProcessingEvent.audioSequence.some(item => item.src === primaryAudioSrc && item.playerType === 'announcement')) {
                isNewAnnouncementToBeQueued = false;
            }
            // Check if this announcement is already in the queue awaiting processing.
            if (isNewAnnouncementToBeQueued && eventQueue.length > 0) {
                const lastEventInQueue = eventQueue[eventQueue.length - 1];
                if (lastEventInQueue.type === 'announcement' &&
                    lastEventInQueue.audioSequence.some(item => item.src === primaryAudioSrc && item.playerType === 'announcement')) {
                    isNewAnnouncementToBeQueued = false;
                }
            }

            // If it's a new, unique announcement event, add it to the main `eventQueue`.
            if (isNewAnnouncementToBeQueued) {
                console.log('SignageUI: New unique announcement event identified for queueing.');

                // Build the audio sequence for the announcement: chime followed by announcement audio.
                const audioItemsForSequence = [
                    { src: chimeAudio.src, playerType: 'chime' } // Chime for announcement
                ];
                announcementAudioFiles.forEach(audioSrc => {
                    audioItemsForSequence.push({ src: audioSrc, playerType: 'announcement' });
                });

                const announcementEvent = {
                    type: 'announcement',
                    data: { ...announcementStatus }, // Store a copy of the full status data.
                    audioSequence: audioItemsForSequence,
                    timestamp: new Date().toISOString()
                };
                eventQueue.push(announcementEvent);
                console.log("SignageUI: Added announcement event to main event queue. Sequence:", audioItemsForSequence, "Queue size:", eventQueue.length);
                processNextEventFromQueue(); // Attempt to process the event.
            } else {
                console.log('SignageUI: Announcement update received, but its primary audio appears to be for an already processing or queued announcement event.');
            }
        } else {
            console.log('SignageUI: Announcement status received, but no audio playlist. No announcement event created.');
        }
    }

    /**
     * Handles `sse_ttscomplete` custom events, triggered by `sse_handler.js`.
     * Stores the received TTS audio URL for a specific call event and checks if
     * all required TTS languages for that event have been received.
     * @param {CustomEvent} event - The custom event with `detail` containing the `ttsData`.
     * @private
     */
    function handleTTSCompleteSSE(event) {
        const ttsData = event.detail;
        console.log('SignageUI: SSE_TTSCOMPLETE received:', ttsData);

        let targetEventForTTS = null;

        // First, check if the TTS is for the currently processing call event.
        if (currentProcessingEvent && currentProcessingEvent.type === 'call' &&
            currentProcessingEvent.id === ttsData.id && currentProcessingEvent.location === ttsData.location) {
            targetEventForTTS = currentProcessingEvent;
        } else {
            // If not current, search for the call event in the main `eventQueue`.
            targetEventForTTS = eventQueue.find(evt =>
                evt.type === 'call' && evt.id === ttsData.id && evt.location === ttsData.location
            );
        }

        if (targetEventForTTS) {
            // If TTS for this event is already marked as ready, ignore new TTS files.
            // This could happen if an SSE event is re-sent or processed multiple times.
            if (targetEventForTTS.ttsReady && targetEventForTTS.receivedTts[ttsData.lang] === ttsData.audio_url) {
                console.log(`SignageUI: TTS data (${ttsData.lang}) for call ${targetEventForTTS.id}-${targetEventForTTS.location} already processed and marked ready. Ignoring duplicate.`);
                return;
            }

            // Store the received TTS audio URL by its language code.
            targetEventForTTS.receivedTts[ttsData.lang] = ttsData.audio_url;
            console.log(`SignageUI: Stored TTS (${ttsData.lang}) for call event ${targetEventForTTS.id}-${targetEventForTTS.location}. Received:`, targetEventForTTS.receivedTts);

            // Check if all required TTS audio files for this event have now been received.
            const allRequiredTTSForEventReceived = targetEventForTTS.requiredTts.every(lang => !!targetEventForTTS.receivedTts[lang]);

            if (allRequiredTTSForEventReceived && !targetEventForTTS.ttsReady) { // Check !targetEventForTTS.ttsReady to avoid re-processing
                targetEventForTTS.ttsReady = true; // Mark the event's TTS as fully ready.
                console.log(`SignageUI: All TTS now ready for call event ${targetEventForTTS.id}-${targetEventForTTS.location}.`);

                // If the target event is the one currently being processed,
                // add the newly ready TTS audio files to its live playback queue.
                if (currentProcessingEvent === targetEventForTTS) {
                    console.log("SignageUI: Adding newly ready TTS audio files to live audioPlaybackQueue for the CURRENT event.");
                    const ttsAudioItemsToAdd = [];
                    targetEventForTTS.requiredTts.forEach(langCode => {
                        const audioUrl = targetEventForTTS.receivedTts[langCode];
                        if (audioUrl) {
                            // Ensure the TTS audio is not already in the queue (e.g., if re-received for some reason).
                            if (!audioPlaybackQueue.some(item => item.src === audioUrl && item.playerType === 'tts')) {
                                ttsAudioItemsToAdd.push({ src: audioUrl, playerType: 'tts' });
                            }
                        }
                    });

                    if (ttsAudioItemsToAdd.length > 0) {
                        // Insert TTS audio after the chime (if present and not yet played)
                        // or at the appropriate place in the queue.
                        const chimeIndex = audioPlaybackQueue.findIndex(item => item.playerType === 'chime');
                        if (chimeIndex !== -1 && !targetEventForTTS.chimeFinished) { // Chime exists and hasn't finished
                            audioPlaybackQueue.splice(chimeIndex + 1, 0, ...ttsAudioItemsToAdd);
                        } else { // Chime finished, or no chime, or add to end if other items exist
                            audioPlaybackQueue.push(...ttsAudioItemsToAdd);
                        }
                        console.log("SignageUI: Appended/inserted TTS items to live audio items queue:", ttsAudioItemsToAdd, "New queue:", audioPlaybackQueue);

                        // If the chime has finished and audio is not currently playing
                        // (meaning the queue might be "stuck" waiting for this TTS), restart playback.
                        if (targetEventForTTS.chimeFinished && !isAudioFilePlaying) {
                            console.log("SignageUI: Chime finished for current event, new TTS added, and no audio playing. Restarting playback for TTS.");
                            playNextAudioFileInSequence();
                        } else if (targetEventForTTS.chimeFinished && isAudioFilePlaying) {
                            console.log("SignageUI: Chime finished, new TTS added, but other audio is currently playing. TTS will play next in sequence.");
                        } else if (!targetEventForTTS.chimeFinished) {
                            console.log("SignageUI: New TTS added to queue, but chime not yet finished. Waiting for chime to complete.");
                        }
                    } else if (!isAudioFilePlaying && audioPlaybackQueue.length === 0 && targetEventForTTS.ttsReady && targetEventForTTS.chimeFinished) {
                        // All TTS marked ready, chime finished, but no actual TTS files were added (e.g. requiredTts was empty)
                        // and queue is empty. This signals end of audio for this event.
                        console.log("SignageUI: All TTS marked ready for current event, audio queue empty, chime finished. Proceeding to finish event.");
                        playNextAudioFileInSequence(); // This will lead to event completion.
                    }
                }
            } else if (allRequiredTTSForEventReceived && targetEventForTTS.ttsReady) {
                console.log(`SignageUI: TTS for call ${targetEventForTTS.id}-${targetEventForTTS.location} was already marked ready. Additional TTS (${ttsData.lang}) received but likely redundant or already queued.`);
            }
        } else {
            console.log("SignageUI: Received TTS for an unknown or outdated call event (not current and not in queue). Ignoring:", ttsData);
        }
    }

    /**
     * Handles `sse_status` custom events, triggered by `sse_handler.js`.
     * Updates the visual SSE connection status indicator.
     * @param {CustomEvent} event - The custom event with `detail` containing the `status` data.
     * @private
     */
    function handleSSEStatusChange(event) {
        console.log('SignageUI: Received sse_status_change', event.detail);
        dispatchSseStatusToIndicator(event.detail.status, event.detail.message);
    }

    /**
     * Updates the visual display of the SSE connection status indicator.
     * @param {string} statusKey - The status key (e.g., 'connecting', 'connected', 'disconnected').
     * @param {string} [message=''] - An optional human-readable message to display.
     * @private
     */
    function dispatchSseStatusToIndicator(statusKey, message = '') {
        if (!sseStatusIndicator) return; // Exit if indicator element is not found.
        sseStatusIndicator.textContent = message || statusKey; // Display message or status key.

        // Determine background color based on status for clear visual feedback.
        let bgColor = sseStatusIndicator.dataset.lastBgColor || 'bg-gray-500'; // Default to a neutral gray.
        switch (statusKey) {
            case 'connecting': bgColor = 'bg-yellow-500'; break;
            case 'connected': bgColor = 'bg-green-500'; break;
            case 'disconnected': bgColor = 'bg-red-500'; break;
            default: bgColor = 'bg-gray-600'; // Fallback for unknown status.
        }
        // Apply new CSS classes and store the last background color for persistence.
        sseStatusIndicator.className = `fixed bottom-1 right-1 p-1 px-2 text-xs rounded-full text-white opacity-75 z-50 ${bgColor}`;
        sseStatusIndicator.dataset.lastBgColor = bgColor;
    }

    // --- UI Update Helper Functions ---

    /**
     * Updates the main display for the current call ID and location.
     * @param {object|null} callData - The call object to display, or `null` to clear the display.
     * @param {string} callData.id - The formatted call ID.
     * @param {string} callData.location - The call location.
     * @private
     */
    function updateCurrentCallDisplay(callData) {
        if (callData && callData.id && callData.location) {
            console.log(`SignageUI: Updating current call display - ID: ${callData.id}, Location: ${callData.location}`);
            callIdElement.textContent = sanitizeText(callData.id);
            locationElement.textContent = sanitizeText(callData.location);
        } else {
            console.log("SignageUI: Clearing current call display (callData is null or invalid). Setting to placeholders.");
            callIdElement.textContent = '----'; // Placeholder for no current call.
            locationElement.textContent = '----';
        }
    }

    /**
     * Updates the displayed lists for completed and skipped call histories.
     * Uses `MAX_HISTORY_ITEMS_DISPLAY` and `MAX_SKIPPED_ITEMS_TO_DISPLAY` constants.
     * @param {object|null} queueState - The queue state object containing histories, or `null` to clear.
     * @param {Array<object>} queueState.completed_history - Array of completed calls.
     * @param {Array<object>} queueState.skipped_history - Array of skipped calls.
     * @private
     */
    function updateQueueDisplayInternals(queueState) {
        const lang = window.currentGlobalLanguage || 'en';
        const labels = (typeof UI_TEXT !== 'undefined' && UI_TEXT[lang]) ? UI_TEXT[lang] : (UI_TEXT.en || {});

        // Update completed history list.
        listHistoryCalls.innerHTML = ''; // Clear previous list items.
        if (queueState && queueState.completed_history && queueState.completed_history.length > 0) {
            // Display only the most recent items up to MAX_HISTORY_ITEMS_DISPLAY.
            // Slice, then reverse to display newest at the top (if inserting at end).
            // Or, slice and insert at beginning.
            const historyToShow = queueState.completed_history.slice(0, MAX_HISTORY_ITEMS_DISPLAY);
            historyToShow.forEach(call => {
                const li = document.createElement('li');
                li.className = 'history-item flex justify-between items-center';
                li.innerHTML = `<span><strong class="font-semibold id-part">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold id-part">${sanitizeText(call.location)}</strong></span>
                                <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                listHistoryCalls.appendChild(li); // Append, assuming CSS handles order or server sends in display order.
                // If server sends newest first, this is correct.
                // Original code used insertBefore(li, listHistoryCalls.firstChild) which is fine too.
            });
        } else {
            // Display placeholder if history is empty.
            listHistoryCalls.innerHTML = `<li class="history-item italic text-gray-500">${labels.historyPlaceholder || "Waiting for calls..."}</li>`;
        }

        // Update skipped history list.
        listSkippedCalls.innerHTML = ''; // Clear previous list items.
        if (queueState && queueState.skipped_history && queueState.skipped_history.length > 0) {
            // Display only the `MAX_SKIPPED_ITEMS_TO_DISPLAY` most recent skipped items.
            const itemsToShow = queueState.skipped_history.slice(0, MAX_SKIPPED_ITEMS_TO_DISPLAY);
            itemsToShow.forEach(call => {
                const li = document.createElement('li');
                li.className = 'history-item flex justify-between items-center';
                // Use a different color for skipped calls for visual distinction.
                li.innerHTML = `<span><strong class="font-semibold id-part text-yellow-400">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold id-part text-yellow-400">${sanitizeText(call.location)}</strong></span>
                                <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                listSkippedCalls.appendChild(li); // Similar to completed history, depends on server sort order.
            });
        } else {
            // Display placeholder if skipped history is empty.
            listSkippedCalls.innerHTML = `<li class="history-item italic text-gray-500">${labels.skippedPlaceholder || "No skipped calls."}</li>`;
        }
    }

    /**
     * Updates the announcement display, managing banner image/video cycling.
     * This function is responsible for showing the correct banner media based on
     * the `announcementStatus.current_banner_playlist`.
     * @param {object|null} announcementStatus - The current announcement status, or `null` to clear.
     * @param {Array<string>} announcementStatus.current_banner_playlist - URLs of banner media.
     * @param {number} [announcementStatus.banner_cycle_interval_seconds=10] - Interval for image cycling.
     * @private
     */
    function updateAnnouncementDisplay(announcementStatus) {
        // Clear any existing banner cycling interval to prevent multiple timers.
        if (bannerIntervalId) {
            clearInterval(bannerIntervalId);
            bannerIntervalId = null;
        }

        // Clear previous banner content.
        announcementBannerContainer.innerHTML = '';
        // Get the parent of the placeholder span for conditional hiding/showing.
        const placeholderParentDiv = announcementPlaceholderSpan ? announcementPlaceholderSpan.parentElement : null;

        // If no announcement status or no banners, show the placeholder.
        if (!announcementStatus || !announcementStatus.current_banner_playlist || announcementStatus.current_banner_playlist.length === 0) {
            if (placeholderParentDiv) placeholderParentDiv.classList.remove('hidden');
            if (announcementPlaceholderSpan) {
                updateStaticElementPlaceholders(); // Ensure placeholder text is correct.
                announcementPlaceholderSpan.classList.remove('hidden');
            }
            return;
        }

        // Hide the placeholder if banners are present.
        if (placeholderParentDiv) placeholderParentDiv.classList.add('hidden');
        if (announcementPlaceholderSpan) announcementPlaceholderSpan.classList.add('hidden'); // Ensure placeholder is also hidden

        const banners = announcementStatus.current_banner_playlist;
        let currentBannerIdx = 0; // Start with the first banner.

        /**
         * Helper function to display the current banner in the sequence.
         * Handles both images and videos.
         * @private
         */
        function displayCurrentBanner() {
            if (banners.length === 0) {
                // This case should ideally be caught by the outer check, but as a safeguard.
                console.warn("SignageUI: 'displayCurrentBanner' called with empty banners list.");
                if (placeholderParentDiv) placeholderParentDiv.classList.remove('hidden'); // Show placeholder
                return;
            }
            const bannerUrl = banners[currentBannerIdx];
            const extension = bannerUrl.split('.').pop().toLowerCase();
            announcementBannerContainer.innerHTML = ''; // Clear previous banner.

            // Render based on media type.
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
                const img = document.createElement('img');
                img.src = bannerUrl;
                img.alt = "Announcement Banner";
                img.className = "banner-media"; // Apply styling class.
                announcementBannerContainer.appendChild(img);
            } else if (['mp4', 'webm', 'ogg'].includes(extension)) {
                const video = document.createElement('video');
                video.src = bannerUrl;
                video.className = "banner-media"; // Apply styling class.
                video.autoplay = true; // Auto-play when loaded.
                video.muted = true; // Mute by default for signage.
                video.playsInline = true; // Essential for iOS auto-play.
                // Loop video if it's the only banner; otherwise, advance on end.
                video.loop = banners.length === 1;
                if (banners.length > 1) {
                    video.onended = () => {
                        currentBannerIdx = (currentBannerIdx + 1) % banners.length; // Advance index.
                        displayCurrentBanner(); // Display next video.
                    };
                }
                announcementBannerContainer.appendChild(video);
                video.play().catch(e => console.error("SignageUI: Error playing banner video:", bannerUrl, e));
            } else {
                console.warn('SignageUI: Unsupported banner media type encountered:', bannerUrl);
                // Fallback to showing placeholder if an unsupported type is found.
                if (placeholderParentDiv) placeholderParentDiv.classList.remove('hidden');
            }
        }
        displayCurrentBanner(); // Display the first banner immediately.

        // If there are multiple banners, set up cycling for images.
        if (banners.length > 1) {
            // Only cycle images automatically. Videos handle their own sequencing via `onended`.
            const isImagePlaylist = banners.every(url => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(url.split('.').pop().toLowerCase()));
            if (isImagePlaylist) {
                // Use a default cycle time if not provided by backend.
                const imageCycleTime = (announcementStatus.banner_cycle_interval_seconds || 10) * 1000;
                bannerIntervalId = setInterval(() => {
                    currentBannerIdx = (currentBannerIdx + 1) % banners.length; // Advance index.
                    displayCurrentBanner(); // Display next image.
                }, imageCycleTime);
            }
        }
    }

    // --- DOM Content Loaded Event Listener ---
    // This ensures the script runs only after the entire HTML document has been parsed.
    initializeSignage();
});