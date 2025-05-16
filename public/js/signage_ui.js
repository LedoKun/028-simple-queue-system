// public/js/signage_ui.js

document.addEventListener('DOMContentLoaded', () => {
    const callIdElement = document.getElementById('current-call-id');
    const locationElement = document.getElementById('current-location');

    const listHistoryCalls = document.getElementById('list-history-calls');
    const listSkippedCalls = document.getElementById('list-skipped-calls');

    const announcementBannerContainer = document.getElementById('announcement-banner-container');
    const announcementPlaceholderSpan = document.getElementById('announcement-placeholder');
    const chimeAudio = document.getElementById("chimeAudio");
    const announcementAudioPlayer = document.getElementById('announcement-audio-player');
    const ttsAudioPlayer = document.getElementById('tts-audio-player');

    const sseStatusIndicator = document.getElementById('sse-status-indicator');

    let orderedTtsLangCodes = [];
    let bannerIntervalId = null;

    const MAX_HISTORY_ITEMS_DISPLAY = 7;
    const MAX_SKIPPED_ITEMS_TO_DISPLAY = 4;

    let eventQueue = [];
    let currentProcessingEvent = null;
    let audioPlaybackQueue = [];
    let isAudioFilePlaying = false;
    let lastShownCallData = null;


    function playNextAudioFileInSequence() {
        if (audioPlaybackQueue.length === 0) {
            isAudioFilePlaying = false;
            console.log("SignageUI: Audio playback queue for current event is empty.");

            if (currentProcessingEvent && currentProcessingEvent.type === 'call' && !currentProcessingEvent.chimeFinished) {
                console.log(`SignageUI: Call event ${currentProcessingEvent.id}-${currentProcessingEvent.location} chime not finished, waiting.`);
                return;
            }

            removeAudioEventListeners(chimeAudio);
            removeAudioEventListeners(announcementAudioPlayer);
            removeAudioEventListeners(ttsAudioPlayer);

            if (currentProcessingEvent) {
                let eventDescription = currentProcessingEvent.type === 'call'
                    ? `call ${currentProcessingEvent.id}-${currentProcessingEvent.location}`
                    : currentProcessingEvent.type;
                console.log(`SignageUI: Finished processing ALL audio for event:`, eventDescription, currentProcessingEvent);
                // If the event that just finished was a call, its details are in lastShownCallData
                // and should remain on display unless cleared by processNextEventFromQueue's idle logic.
            }
            currentProcessingEvent = null;
            processNextEventFromQueue();
            return;
        }

        if (isAudioFilePlaying) {
            console.log("SignageUI: playNextAudioFileInSequence called but isAudioFilePlaying is true. Waiting for current track to finish.");
            return;
        }

        isAudioFilePlaying = true;
        const nextAudio = audioPlaybackQueue.shift();

        let player;
        switch (nextAudio.playerType) {
            case 'chime': player = chimeAudio; break;
            case 'announcement': player = announcementAudioPlayer; break;
            case 'tts': player = ttsAudioPlayer; break;
            default:
                console.error("SignageUI: Unknown player type in audio queue:", nextAudio.playerType);
                isAudioFilePlaying = false;
                playNextAudioFileInSequence();
                return;
        }

        removeAudioEventListeners(player);
        player.addEventListener('ended', handleAudioFileEnded);
        player.addEventListener('error', handleAudioFileError);

        console.log(`SignageUI: Attempting to play audio file: ${nextAudio.src} using ${nextAudio.playerType} player.`);
        player.src = nextAudio.src;
        player.playbackRate = (nextAudio.playerType === 'announcement' || nextAudio.playerType === 'tts') ? 1.25 : 1.0;

        player.play()
            .then(() => {
                console.log(`SignageUI: Playback started successfully for ${nextAudio.src}`);
            })
            .catch(e => {
                console.error(`SignageUI: Error calling play() for ${nextAudio.src} (${nextAudio.playerType}):`, e);
                isAudioFilePlaying = false;
                handleAudioFileError({ target: player });
            });
    }

    function handleAudioFileEnded(event) {
        console.log(`SignageUI: Audio file ended: ${event.target.currentSrc}`);
        removeAudioEventListeners(event.target);
        isAudioFilePlaying = false;

        // Special case: If chime ends, set chimeFinished flag
        if (currentProcessingEvent && event.target === chimeAudio) {
            currentProcessingEvent.chimeFinished = true;
            let eventDescription = currentProcessingEvent.type === 'call'
                ? `call ${currentProcessingEvent.id}-${currentProcessingEvent.location}`
                : currentProcessingEvent.type;
            console.log(`SignageUI: Chime finished for event ${eventDescription}`);
        }

        playNextAudioFileInSequence();
    }

    function handleAudioFileError(event) {
        const src = event.target.currentSrc || (event.target.src || "unknown source");
        console.error(`SignageUI: Audio file error encountered for: ${src}. Error details:`, event.target.error);
        removeAudioEventListeners(event.target);
        isAudioFilePlaying = false;
        playNextAudioFileInSequence();
    }

    function removeAudioEventListeners(player) {
        player.removeEventListener('ended', handleAudioFileEnded);
        player.removeEventListener('error', handleAudioFileError);
    }

    function processNextEventFromQueue() {
        if (currentProcessingEvent || isAudioFilePlaying) {
            console.log("SignageUI: processNextEventFromQueue called, but system is busy or audio is playing.",
                { currentProcessingEvent: !!currentProcessingEvent, isAudioFilePlaying });
            return;
        }

        if (eventQueue.length === 0) { // No more events in the main queue
            console.log("SignageUI: Main event queue is empty AND no event currently processing its audio.");
            // currentProcessingEvent is null here (it was nulled after its audio finished).
            // We check if there was a last shown call. If so, we keep its display.
            // Only clear to "----" if there's no last call context (e.g., on startup with no calls).
            if (!lastShownCallData) { // If no call was ever shown, or explicitly cleared.
                const currentDisplayId = callIdElement.textContent;
                if (currentDisplayId !== '----') { // Only clear if not already "----"
                    console.log("SignageUI: Event queue empty, no current processing, and no last shown call. Clearing display.");
                    updateCurrentCallDisplay(null);
                }
            } else {
                console.log("SignageUI: Event queue empty. Display remains on last shown call:", lastShownCallData);
                // Ensure the display actually reflects lastShownCallData if it somehow got out of sync,
                // though typically it should still be showing it.
                updateCurrentCallDisplay(lastShownCallData);
            }
            return;
        }

        // If we reach here, eventQueue has items.
        currentProcessingEvent = eventQueue.shift();
        console.log("SignageUI: Processing next event from main queue:", currentProcessingEvent);

        audioPlaybackQueue = [];
        isAudioFilePlaying = false;

        if (currentProcessingEvent.type === 'call') {
            updateCurrentCallDisplay(currentProcessingEvent.callData);
            lastShownCallData = { ...currentProcessingEvent.callData }; // Update last shown call

            // Ensure chime plays first
            audioPlaybackQueue.push({ src: chimeAudio.src, playerType: 'chime' });
            currentProcessingEvent.chimeFinished = false; // Flag to track chime completion

            if (currentProcessingEvent.ttsReady) {
                const ttsItems = [];
                currentProcessingEvent.requiredTts.forEach(langCode => {
                    const audioUrl = currentProcessingEvent.receivedTts[langCode]; // Corrected line
                    if (audioUrl) {
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
            // For announcements, the current call display (lastShownCallData) should persist.
            console.log("SignageUI: Processing announcement event. Current call display (if any) will persist.");
            currentProcessingEvent.audioSequence.forEach(audioItem => {
                audioPlaybackQueue.push({ ...audioItem });
            });
        }

        if (audioPlaybackQueue.length > 0) {
            playNextAudioFileInSequence();
        } else {
            let eventDescription = currentProcessingEvent.type === 'call'
                ? `${currentProcessingEvent.type} ${currentProcessingEvent.id}-${currentProcessingEvent.location}`
                : currentProcessingEvent.type;
            console.warn("SignageUI: Current event has no audio items in its sequence. Finishing event and attempting to move to next.", eventDescription, currentProcessingEvent);
            // If the event had no audio, it's effectively done. Nullify and try next.
            if (currentProcessingEvent && currentProcessingEvent.type === 'call') {
                // It was a call but had no audio (unlikely if chime is always added), update lastShownCallData
                lastShownCallData = { ...currentProcessingEvent.callData };
            }
            currentProcessingEvent = null;
            processNextEventFromQueue();
        }
    }

    async function initializeSignage() {
        window.currentGlobalLanguage = document.documentElement.lang || 'en';
        updateStaticElementPlaceholders();

        try {
            const response = await fetch(`${API_BASE_URL}/tts/ordered-languages`);
            if (response.ok) {
                orderedTtsLangCodes = await response.json();
                console.log("SignageUI: Ordered TTS languages:", orderedTtsLangCodes);
            } else {
                console.error("SignageUI: Failed to fetch ordered TTS languages:", response.status, response.statusText);
                orderedTtsLangCodes = [];
            }
        } catch (error) {
            console.error("SignageUI: Error fetching ordered languages:", error);
            orderedTtsLangCodes = [];
        }

        fetchInitialStates();

        document.addEventListener('sse_queueupdate', handleQueueUpdateSSE);
        document.addEventListener('sse_announcementstatus', handleAnnouncementStatusSSE);
        document.addEventListener('sse_ttscomplete', handleTTSCompleteSSE);
        document.addEventListener('sse_status', handleSSEStatusChange);

        console.log("SignageUI: Initialized. Waiting for SSE events to populate the main event queue...");
    }

    async function fetchInitialStates() {
        console.log("SignageUI: Fetching initial states...");
        dispatchSseStatusToIndicator('connecting', 'Loading initial data...');
        try {
            const [queueRes, annRes] = await Promise.allSettled([
                fetch(`${API_BASE_URL}/queue/state`),
                fetch(`${API_BASE_URL}/announcements/status`)
            ]);

            if (queueRes.status === 'fulfilled' && queueRes.value.ok) {
                const queueState = await queueRes.value.json();
                console.log("SignageUI: Initial Queue State Received:", queueState);
                updateQueueDisplayInternals(queueState);
                if (queueState.current_call) {
                    updateCurrentCallDisplay(queueState.current_call);
                    lastShownCallData = { ...queueState.current_call }; // Initialize lastShownCallData
                } else {
                    updateCurrentCallDisplay(null);
                    lastShownCallData = null; // No initial call
                }
            } else {
                console.error("SignageUI: Failed to fetch initial queue state", queueRes.reason || queueRes.value?.statusText);
                updateQueueDisplayInternals(null);
                updateCurrentCallDisplay(null);
                lastShownCallData = null;
            }

            if (annRes.status === 'fulfilled' && annRes.value.ok) {
                const announcementStatus = await annRes.value.json();
                console.log("SignageUI: Initial Announcement Status Received:", announcementStatus);
                updateAnnouncementDisplay(announcementStatus);
            } else {
                console.error("SignageUI: Failed to fetch initial announcement status", annRes.reason || annRes.value?.statusText);
                updateAnnouncementDisplay(null);
            }
        } catch (error) {
            console.error("SignageUI: Error fetching initial states:", error);
            updateQueueDisplayInternals(null);
            updateCurrentCallDisplay(null);
            lastShownCallData = null;
            updateAnnouncementDisplay(null);
        } finally {
            dispatchSseStatusToIndicator('connected', 'Initial data loaded.');
            // After initial states, if no events are queued and no current call was fetched,
            // processNextEventFromQueue's idle logic will ensure display is "----" if lastShownCallData is null.
            processNextEventFromQueue();
        }
    }

    function updateStaticElementPlaceholders() {
        const lang = window.currentGlobalLanguage || 'en';
        const labels = (typeof UI_TEXT !== 'undefined' && UI_TEXT[lang])
            ? UI_TEXT[lang]
            : (typeof UI_TEXT !== 'undefined' ? UI_TEXT.en : {});

        const historyLi = listHistoryCalls.querySelector('.italic');
        if (historyLi && listHistoryCalls.children.length <= 1) historyLi.textContent = labels.historyPlaceholder || "Waiting for calls...";

        const skippedLi = listSkippedCalls.querySelector('.italic');
        if (skippedLi && listSkippedCalls.children.length <= 1) skippedLi.textContent = labels.skippedPlaceholder || "No skipped calls.";

        if (announcementPlaceholderSpan) {
            announcementPlaceholderSpan.textContent = labels.announcementPlaceholder || "Announcements";
        }
    }

    function handleQueueUpdateSSE(event) {
        const queueState = event.detail;
        console.log('SignageUI: SSE_QUEUEUPDATE received', queueState);
        updateQueueDisplayInternals(queueState);

        if (queueState && queueState.current_call) {
            const newCall = queueState.current_call;
            let isNewCallToBeQueued = true;

            if (currentProcessingEvent && currentProcessingEvent.type === 'call' &&
                currentProcessingEvent.id === newCall.id && currentProcessingEvent.location === newCall.location) {
                isNewCallToBeQueued = false;
                console.log("SignageUI: Queue update is for currently processing call, ignoring.");
            }
            if (isNewCallToBeQueued && eventQueue.length > 0) {
                const lastEventInQueue = eventQueue[eventQueue.length - 1];
                if (lastEventInQueue.type === 'call' && lastEventInQueue.id === newCall.id && lastEventInQueue.location === newCall.location) {
                    isNewCallToBeQueued = false;
                    console.log("SignageUI: Queue update is for call already in queue, ignoring.");
                }
            }

            if (isNewCallToBeQueued) {
                console.log("SignageUI: New unique call event identified for queueing:", newCall.id, "-", newCall.location);
                const callEvent = {
                    type: 'call',
                    id: newCall.id,
                    location: newCall.location,
                    callData: { ...newCall },
                    requiredTts: [...orderedTtsLangCodes],
                    receivedTts: {},
                    audioSequence: [{ src: chimeAudio.src, playerType: 'chime' }],
                    chimeFinished: false, // Add chimeFinished flag
                    ttsReady: false,
                    timestamp: new Date().toISOString()
                };
                eventQueue.push(callEvent);
                console.log("SignageUI: Added call event to main event queue. Queue size:", eventQueue.length);
                processNextEventFromQueue();
            } else {
                console.log("SignageUI: Call update received, but it appears to be for an already processing or queued call. No new event created.", newCall.id);
            }
        } else {
            console.log("SignageUI: Queue update received with no current_call. No call event created.");
        }
    }

    function handleAnnouncementStatusSSE(event) {
        const announcementStatus = event.detail;
        console.log('SignageUI: SSE_ANNOUNCEMENTSTATUS received', announcementStatus);
        updateAnnouncementDisplay(announcementStatus);

        const announcementAudioFiles = announcementStatus.current_audio_playlist || [];

        if (announcementAudioFiles.length > 0) {
            const primaryAudioSrc = announcementAudioFiles[0];
            let isNewAnnouncementToBeQueued = true;

            if (currentProcessingEvent && currentProcessingEvent.type === 'announcement' &&
                currentProcessingEvent.audioSequence.some(item => item.src === primaryAudioSrc && item.playerType === 'announcement')) {
                isNewAnnouncementToBeQueued = false;
            }
            if (isNewAnnouncementToBeQueued && eventQueue.length > 0) {
                const lastEventInQueue = eventQueue[eventQueue.length - 1];
                if (lastEventInQueue.type === 'announcement' &&
                    lastEventInQueue.audioSequence.some(item => item.src === primaryAudioSrc && item.playerType === 'announcement')) {
                    isNewAnnouncementToBeQueued = false;
                }
            }

            if (isNewAnnouncementToBeQueued) {
                console.log('SignageUI: New unique announcement event identified for queueing.');

                const audioItemsForSequence = [
                    { src: chimeAudio.src, playerType: 'chime' }
                ];

                announcementAudioFiles.forEach(audioSrc => {
                    audioItemsForSequence.push({ src: audioSrc, playerType: 'announcement' });
                });

                const announcementEvent = {
                    type: 'announcement',
                    data: { ...announcementStatus },
                    audioSequence: audioItemsForSequence,
                    timestamp: new Date().toISOString()
                };
                eventQueue.push(announcementEvent);
                console.log("SignageUI: Added announcement event to main event queue. Sequence:", audioItemsForSequence, "Queue size:", eventQueue.length);
                processNextEventFromQueue();
            } else {
                console.log('SignageUI: Announcement update received, but its primary audio appears to be for an already processing or queued announcement event.');
            }
        } else {
            console.log('SignageUI: Announcement status received, but no audio playlist. No announcement event created.');
        }
    }

    function handleTTSCompleteSSE(event) {
        const ttsData = event.detail;
        console.log('SignageUI: SSE_TTSCOMPLETE received:', ttsData);

        let targetEventForTTS = null;

        if (currentProcessingEvent && currentProcessingEvent.type === 'call' &&
            currentProcessingEvent.id === ttsData.id && currentProcessingEvent.location === ttsData.location) {
            targetEventForTTS = currentProcessingEvent;
        } else {
            targetEventForTTS = eventQueue.find(evt =>
                evt.type === 'call' && evt.id === ttsData.id && evt.location === ttsData.location
            );
        }

        if (targetEventForTTS) {
            if (targetEventForTTS.ttsReady) {
                console.log(`SignageUI: TTS data (${ttsData.lang}) received for call ${targetEventForTTS.id}-${targetEventForTTS.location}, but its TTS was already marked fully ready. Ignoring this specific TTS file.`);
                return;
            }

            targetEventForTTS.receivedTts[ttsData.lang] = ttsData.audio_url;
            console.log(`SignageUI: Stored TTS (${ttsData.lang}) for call event ${targetEventForTTS.id}-${targetEventForTTS.location}.`);

            const allRequiredTTSForEventReceived = targetEventForTTS.requiredTts.every(lang => !!targetEventForTTS.receivedTts[lang]);

            if (allRequiredTTSForEventReceived) {
                targetEventForTTS.ttsReady = true;
                console.log(`SignageUI: All TTS now ready for call event ${targetEventForTTS.id}-${targetEventForTTS.location}.`);

                if (currentProcessingEvent === targetEventForTTS) {
                    console.log("SignageUI: Adding newly ready TTS audio files to live audioPlaybackQueue for the CURRENT event.");
                    const ttsAudioItemsToAdd = [];
                    targetEventForTTS.requiredTts.forEach(langCode => {
                        const audioUrl = targetEventForTTS.receivedTts[langCode];
                        if (audioUrl) {
                            if (!audioPlaybackQueue.some(item => item.src === audioUrl && item.playerType === 'tts')) {
                                ttsAudioItemsToAdd.push({ src: audioUrl, playerType: 'tts' });
                            }
                        }
                    });

                    if (ttsAudioItemsToAdd.length > 0) {
                        audioPlaybackQueue.push(...ttsAudioItemsToAdd);
                        console.log("SignageUI: Appended TTS items to live audio items queue:", ttsAudioItemsToAdd);

                        if (!isAudioFilePlaying && audioPlaybackQueue.length > 0 && currentProcessingEvent.chimeFinished) {
                            console.log("SignageUI: Chime finished and new TTS added. Restarting playback for TTS.");
                            playNextAudioFileInSequence();
                        }
                    } else if (!isAudioFilePlaying && audioPlaybackQueue.length === 0 && targetEventForTTS.ttsReady && currentProcessingEvent.chimeFinished) {
                        console.log("SignageUI: All TTS marked ready for current event, and its audio queue is empty. Proceeding to finish event.");
                        playNextAudioFileInSequence();
                    }
                }
            }
        } else {
            console.log("SignageUI: Received TTS for an unknown call event (not current and not in queue). Ignoring:", ttsData);
        }
    }

    function handleSSEStatusChange(event) {
        console.log('SignageUI: Received sse_status_change', event.detail);
        dispatchSseStatusToIndicator(event.detail.status, event.detail.message);
    }

    function dispatchSseStatusToIndicator(statusKey, message = '') {
        if (!sseStatusIndicator) return;
        sseStatusIndicator.textContent = message || statusKey;
        let bgColor = sseStatusIndicator.dataset.lastBgColor || 'bg-gray-500';
        switch (statusKey) {
            case 'connecting': bgColor = 'bg-yellow-500'; break;
            case 'connected': bgColor = 'bg-green-500'; break;
            case 'disconnected': bgColor = 'bg-red-500'; break;
            default: bgColor = 'bg-gray-600';
        }
        sseStatusIndicator.className = `fixed bottom-1 right-1 p-1 px-2 text-xs rounded-full text-white opacity-75 z-50 ${bgColor}`;
        sseStatusIndicator.dataset.lastBgColor = bgColor;
    }

    function updateCurrentCallDisplay(callData) {
        if (callData && callData.id && callData.location) {
            console.log(`SignageUI: Updating display - ID: ${callData.id}, Location: ${callData.location}`);
            callIdElement.textContent = sanitizeText(callData.id);
            locationElement.textContent = sanitizeText(callData.location);
        } else {
            console.log("SignageUI: Clearing current call display (callData is null or invalid).");
            callIdElement.textContent = '----';
            locationElement.textContent = '----';
        }
    }

    function updateQueueDisplayInternals(queueState) {
        const lang = window.currentGlobalLanguage || 'en';
        const labels = (typeof UI_TEXT !== 'undefined' && UI_TEXT[lang]) ? UI_TEXT[lang] : (typeof UI_TEXT !== 'undefined' ? UI_TEXT.en : {});

        listHistoryCalls.innerHTML = '';
        if (queueState && queueState.completed_history && queueState.completed_history.length > 0) {
            queueState.completed_history.slice(0, MAX_HISTORY_ITEMS_DISPLAY).forEach(call => {
                const li = document.createElement('li');
                li.className = 'history-item flex justify-between items-center';
                li.innerHTML = `<span><strong class="font-semibold id-part">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold id-part">${sanitizeText(call.location)}</strong></span>
                                <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                listHistoryCalls.insertBefore(li, listHistoryCalls.firstChild);
            });
        } else {
            listHistoryCalls.innerHTML = `<li class="history-item italic text-gray-500">${labels.historyPlaceholder}</li>`;
        }

        listSkippedCalls.innerHTML = '';
        if (queueState && queueState.skipped_history && queueState.skipped_history.length > 0) {
            const itemsToShow = queueState.skipped_history.slice(-MAX_SKIPPED_ITEMS_TO_DISPLAY);
            itemsToShow.forEach(call => {
                const li = document.createElement('li');
                li.className = 'history-item flex justify-between items-center';
                li.innerHTML = `<span><strong class="font-semibold id-part text-yellow-400">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold id-part text-yellow-400">${sanitizeText(call.location)}</strong></span>
                                <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                listSkippedCalls.insertBefore(li, listSkippedCalls.firstChild);
            });
        } else {
            listSkippedCalls.innerHTML = `<li class="history-item italic text-gray-500">${labels.skippedPlaceholder}</li>`;
        }
    }

    function updateAnnouncementDisplay(announcementStatus) {
        if (bannerIntervalId) { clearInterval(bannerIntervalId); bannerIntervalId = null; }
        announcementBannerContainer.innerHTML = '';
        const placeholderParentDiv = announcementPlaceholderSpan ? announcementPlaceholderSpan.parentElement : null;

        if (!announcementStatus || !announcementStatus.current_banner_playlist || announcementStatus.current_banner_playlist.length === 0) {
            if (placeholderParentDiv) placeholderParentDiv.classList.remove('hidden');
            if (announcementPlaceholderSpan) {
                updateStaticElementPlaceholders();
                announcementPlaceholderSpan.classList.remove('hidden');
            }
            return;
        }

        if (placeholderParentDiv) placeholderParentDiv.classList.add('hidden');
        const banners = announcementStatus.current_banner_playlist;
        let currentBannerIdx = 0;

        function displayCurrentBanner() {
            if (banners.length === 0) return;
            const bannerUrl = banners[currentBannerIdx];
            const extension = bannerUrl.split('.').pop().toLowerCase();
            announcementBannerContainer.innerHTML = '';

            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
                const img = document.createElement('img');
                img.src = bannerUrl; img.alt = "Announcement Banner"; img.className = "banner-media";
                announcementBannerContainer.appendChild(img);
            } else if (['mp4', 'webm', 'ogg'].includes(extension)) {
                const video = document.createElement('video');
                video.src = bannerUrl; video.className = "banner-media";
                video.autoplay = true; video.loop = banners.length === 1;
                video.muted = true; video.playsInline = true;
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
                if (placeholderParentDiv) placeholderParentDiv.classList.remove('hidden');
            }
        }
        displayCurrentBanner();

        if (banners.length > 1) {
            const isImagePlaylist = banners.every(url => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(url.split('.').pop().toLowerCase()));
            if (isImagePlaylist) {
                const imageCycleTime = (announcementStatus.banner_cycle_interval_seconds || 10) * 1000;
                bannerIntervalId = setInterval(() => {
                    currentBannerIdx = (currentBannerIdx + 1) % banners.length;
                    displayCurrentBanner();
                }, imageCycleTime);
            }
        }
    }

    initializeSignage();
});