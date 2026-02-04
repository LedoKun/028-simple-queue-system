/**
 * Custom signage page module for TV with QR code display.
 * Features a combined call history list (served + missed) sorted by time.
 */
import { API_BASE_URL, SSE_URL, getLabels, setCurrentLanguage } from '../../core/constants.js';
import { createSseIndicatorUpdater } from '../../core/uiHelpers.js';
import { sanitizeText, formatDisplayTime } from '../../core/formatting.js';
import { scheduleAutoRefresh } from '../../core/refresh.js';
import { EventStream } from '../../sse/eventStream.js';

const MAX_COMBINED_ITEMS_DISPLAY = 8;
const TTS_TIMEOUT_DURATION = 10_000;

/**
 * Renders a combined call list with served and skipped items, sorted by timestamp.
 * @param {HTMLElement} container - The UL element to render into
 * @param {Array} servedItems - Array of served/completed call items
 * @param {Array} skippedItems - Array of skipped/missed call items
 * @param {Object} options - Rendering options
 */
function renderCombinedCallList(container, servedItems, skippedItems, options = {}) {
    if (!container) return;

    const {
        maxItems = MAX_COMBINED_ITEMS_DISPLAY,
        placeholderText = '----',
        servedClass = 'combined-item served-item',
        skippedClass = 'combined-item skipped-item',
        placeholderClass = 'combined-item italic',
        timestampFormatter = (value) => (value ?? ''),
        sanitizer = (value) => (value == null ? '' : String(value)),
    } = options;

    container.innerHTML = '';

    // Combine both lists with a type marker
    const combined = [];

    if (Array.isArray(servedItems)) {
        servedItems.forEach(item => {
            combined.push({ ...item, _type: 'served' });
        });
    }

    if (Array.isArray(skippedItems)) {
        skippedItems.forEach(item => {
            combined.push({ ...item, _type: 'skipped' });
        });
    }

    // Sort by timestamp (newest first)
    combined.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Descending order (newest first)
    });

    // Take only the max items we want to display
    const data = combined.slice(0, maxItems);

    if (data.length === 0) {
        const placeholder = document.createElement('li');
        placeholder.className = placeholderClass.trim();
        placeholder.textContent = placeholderText;
        container.appendChild(placeholder);
        return;
    }

    data.forEach((entry) => {
        const li = document.createElement('li');
        li.className = entry._type === 'served' ? servedClass : skippedClass;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'id-part';

        const idStrong = document.createElement('strong');
        idStrong.textContent = sanitizer(entry?.id ?? '----');

        const arrowSpan = document.createElement('span');
        arrowSpan.textContent = ' → ';

        const locationStrong = document.createElement('strong');
        locationStrong.textContent = sanitizer(entry?.location ?? '----');

        labelSpan.appendChild(idStrong);
        labelSpan.appendChild(arrowSpan);
        labelSpan.appendChild(locationStrong);
        li.appendChild(labelSpan);

        const tsSpan = document.createElement('span');
        tsSpan.className = 'timestamp';
        tsSpan.textContent = timestampFormatter(entry?.timestamp ?? '');
        li.appendChild(tsSpan);

        container.appendChild(li);
    });
}

class SignagePageWithQR {
    constructor() {
        this.dom = this.queryDom();
        this.eventStream = new EventStream(SSE_URL, { labelProvider: getLabels });
        this.updateSseIndicator = createSseIndicatorUpdater(this.dom.sseStatusIndicator, {
            setDataset: true,
            fallbackMessage: 'Unknown',
            keepClasses: true,
        });
        this.eventQueue = [];
        this.isProcessingEvent = false;
        this.currentEvent = null;
        this.audioPlaybackState = {
            isChimePlaying: false,
            audioQueue: [],
            currentAudioIndex: 0,
        };
        this.autoRefreshCancel = () => { };
        this.clockController = null;

        Object.defineProperty(this, 'isManuallyProcessing', {
            get() {
                return this.isProcessingEvent;
            },
        });
    }

    queryDom() {
        const byId = (id) => document.getElementById(id);
        return {
            callIdElement: byId('current-call-id'),
            locationElement: byId('current-location'),
            listCombinedCalls: byId('list-combined-calls'),
            announcementBannerContainer: byId('announcement-banner-container'),
            announcementPlaceholder: byId('announcement-placeholder'),
            chimeAudio: byId('chimeAudio'),
            announcementAudioPlayer: byId('announcement-audio-player'),
            ttsAudioPlayer: byId('tts-audio-player'),
            sseStatusIndicator: byId('sse-status-indicator'),
            dateElement: byId('date'),
            timeElement: byId('time'),
        };
    }

    ensureRequiredElements() {
        const optionalElements = [
            'announcementBannerContainer',
            'announcementPlaceholder',
            'announcementAudioPlayer',
            'ttsAudioPlayer',
            'dateElement',
            'timeElement',
        ];
        const requiredElements = Object.entries(this.dom).filter(
            ([key]) => !optionalElements.includes(key)
        );
        const missingElements = requiredElements.filter(([, value]) => !value);

        if (missingElements.length > 0) {
            const names = missingElements.map(([key]) => key).join(', ');
            console.error(`SignagePageWithQR: Missing required DOM elements: ${names}`);
            return false;
        }
        return true;
    }

    init() {
        if (!this.ensureRequiredElements()) {
            console.error('SignagePageWithQR: Aborting init due to missing DOM elements.');
            return;
        }
        this.updateStaticPlaceholders();
        this.fetchOrderedLanguages()
            .then(() => this.fetchInitialState())
            .then(() => {
                this.attachEventStreamHandlers();
                this.updateSseIndicator({ status: 'connecting', message: 'Connecting…' });
                this.eventStream.connect();
                this.setupAutoRefresh();
                if (this.dom.dateElement && this.dom.timeElement) {
                    const clock = this.createClock();
                    clock.start();
                    this.clockController = clock;
                }
            })
            .catch((err) => {
                console.error('SignagePageWithQR: Error initializing page:', err);
            });
    }

    setupAutoRefresh() {
        const shouldDelay = () => this.shouldDelayRefresh();
        this.autoRefreshCancel = scheduleAutoRefresh({
            intervalMinutes: 90,
            shouldDelayCallback: shouldDelay,
        });
    }

    attachEventStreamHandlers() {
        this.eventStream.on('connectionChange', (data) => this.updateSseIndicator(data));
        this.eventStream.on('queueUpdate', (data) => this.handleQueueUpdate(data));
        this.eventStream.on('announcementStatus', (data) => this.handleAnnouncementStatus(data));
        this.eventStream.on('translatorCall', (data) => this.handleTranslatorCall(data));
        this.eventStream.on('ttsComplete', (data) => this.handleTtsComplete(data));
    }

    fetchOrderedLanguages() {
        return fetch(`${API_BASE_URL}/tts/ordered-languages`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ordered languages: ${response.status}`);
                }
                return response.json();
            })
            .then((languages) => {
                if (Array.isArray(languages) && languages.length > 0) {
                    setCurrentLanguage(languages[0]);
                }
            })
            .catch((err) => {
                console.warn('SignagePageWithQR: Could not load ordered languages:', err);
            });
    }

    fetchInitialState() {
        return fetch(`${API_BASE_URL}/queue/state`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch queue state: ${response.status}`);
                }
                return response.json();
            })
            .then((queueState) => {
                this.updateCurrentCallDisplay(queueState?.current_call ?? {});
                this.updateQueueDisplay(queueState);
                return fetch(`${API_BASE_URL}/announcements/status`);
            })
            .then((response) => {
                if (!response.ok) {
                    console.warn('SignagePageWithQR: Could not fetch announcement status:', response.status);
                    return null;
                }
                return response.json();
            })
            .then((announcementStatus) => {
                if (announcementStatus) {
                    this.updateAnnouncementDisplay(announcementStatus);
                }
            })
            .catch((err) => {
                console.error('SignagePageWithQR: Failed to fetch initial state:', err);
            });
    }

    updateCurrentCallDisplay(callData) {
        if (this.dom.callIdElement) {
            this.dom.callIdElement.textContent = sanitizeText(callData?.id) || '----';
        }
        if (this.dom.locationElement) {
            this.dom.locationElement.textContent = sanitizeText(callData?.location) || '----';
        }
    }

    updateQueueDisplay(queueState) {
        const labels = getLabels();

        renderCombinedCallList(
            this.dom.listCombinedCalls,
            queueState?.completed_history,
            queueState?.skipped_history,
            {
                maxItems: MAX_COMBINED_ITEMS_DISPLAY,
                placeholderText: labels.historyPlaceholder || '----',
                servedClass: 'combined-item served-item',
                skippedClass: 'combined-item skipped-item',
                placeholderClass: 'combined-item italic text-gray-400',
                timestampFormatter: formatDisplayTime,
                sanitizer: sanitizeText,
            }
        );
    }

    updateAnnouncementDisplay(announcementStatus) {
        if (!this.dom.announcementBannerContainer) return;
        const placeholderWrapper = this.dom.announcementPlaceholder?.parentElement ?? null;
        const isActive = announcementStatus?.is_active ?? false;
        const bannerUrl = announcementStatus?.banner_url ?? null;
        const audioUrl = announcementStatus?.audio_url ?? null;

        if (!isActive || !bannerUrl) {
            this.ensureBannerPlaceholder();
            return;
        }

        const displayBanner = () => {
            this.clearBannerContainer(placeholderWrapper);
            let media;
            if (bannerUrl.endsWith('.mp4') || bannerUrl.endsWith('.webm')) {
                media = document.createElement('video');
                media.src = bannerUrl;
                media.className = 'banner-media';
                media.autoplay = true;
                media.muted = true;
                media.loop = true;
                media.playsInline = true;
                try {
                    media.play().catch(() => { });
                } catch (e) { }
            } else {
                media = document.createElement('img');
                media.src = bannerUrl;
                media.className = 'banner-media';
                media.alt = 'Announcement Banner';
            }
            this.dom.announcementBannerContainer.appendChild(media);

            if (audioUrl && this.dom.announcementAudioPlayer) {
                const player = this.dom.announcementAudioPlayer;
                player.src = audioUrl;
                player.loop = true;
                player.onended = () => {
                    if (announcementStatus.is_active) {
                        player.currentTime = 0;
                        player.play().catch(() => { });
                    }
                };
                player.play().catch(() => { });
            }
        };

        displayBanner();
    }

    ensureBannerPlaceholder() {
        if (!this.dom.announcementBannerContainer) return;
        const existing = this.dom.announcementBannerContainer.querySelector('#announcement-placeholder');
        if (existing) return;

        this.clearBannerContainer(null);
        const placeholderWrapper = document.createElement('span');
        placeholderWrapper.id = 'announcement-placeholder';
        placeholderWrapper.className = 'text-gray-600';
        placeholderWrapper.style.cssText = `
      font-size: clamp(1.2rem, 2.5vw, 2.2rem);
      font-weight: 600;
    `;
        placeholderWrapper.textContent = 'Announcements';
        this.dom.announcementBannerContainer.appendChild(placeholderWrapper);
        this.dom.announcementPlaceholder = placeholderWrapper;
    }

    clearBannerContainer(placeholderWrapper = null) {
        if (!this.dom.announcementBannerContainer) return;
        while (this.dom.announcementBannerContainer.firstChild) {
            const child = this.dom.announcementBannerContainer.firstChild;
            if (placeholderWrapper && child === placeholderWrapper) break;
            this.dom.announcementBannerContainer.removeChild(child);
        }
    }

    handleQueueUpdate(queueState) {
        const currentCall = queueState?.current_call;
        const completedHistory = queueState?.completed_history;
        const skippedHistory = queueState?.skipped_history;

        this.updateQueueDisplay(queueState);

        // If there's a new current call with audio, queue it
        if (currentCall && currentCall.id && currentCall.audio_urls?.length > 0) {
            const eventPayload = {
                type: 'queueUpdate',
                data: {
                    current_call: currentCall,
                    completed_history: completedHistory,
                    skipped_history: skippedHistory,
                },
            };
            this.eventQueue.push(eventPayload);
            if (!this.isProcessingEvent) {
                this.processNextEventFromQueue();
            }
        } else {
            // No audio, just update display
            this.updateCurrentCallDisplay(currentCall ?? {});
        }
    }

    handleAnnouncementStatus(announcementStatus) {
        this.updateAnnouncementDisplay(announcementStatus);
    }

    handleTranslatorCall(payload) {
        if (payload?.audio_urls?.length > 0) {
            const eventPayload = {
                type: 'translatorCall',
                data: payload,
            };
            this.eventQueue.push(eventPayload);
            if (!this.isProcessingEvent) {
                this.processNextEventFromQueue();
            }
        }
    }

    handleTtsComplete(ttsData) {
        if (!this.currentEvent) return;
        const eventData = this.currentEvent.data;
        if (!eventData) return;

        const callId = eventData.current_call?.id || eventData.call_id;
        if (ttsData.call_id !== callId) return;

        if (ttsData.audio_urls?.length > 0) {
            this.audioPlaybackState.audioQueue = ttsData.audio_urls.slice();
            this.audioPlaybackState.currentAudioIndex = 0;
            if (this.ttsTimeout) {
                clearTimeout(this.ttsTimeout);
                this.ttsTimeout = null;
            }
            this.playNextAudioFileInSequence();
        } else {
            this.finishCurrentEvent();
        }
    }

    processNextEventFromQueue() {
        if (this.eventQueue.length === 0) {
            this.isProcessingEvent = false;
            this.currentEvent = null;
            return;
        }

        this.isProcessingEvent = true;
        this.currentEvent = this.eventQueue.shift();
        const eventData = this.currentEvent.data;

        // Update display for queue updates
        if (this.currentEvent.type === 'queueUpdate' && eventData?.current_call) {
            this.updateCurrentCallDisplay(eventData.current_call);
        }

        // Play chime then TTS
        this.audioPlaybackState.isChimePlaying = true;
        this.audioPlaybackState.audioQueue = [];
        this.audioPlaybackState.currentAudioIndex = 0;

        const chime = this.dom.chimeAudio;
        if (chime) {
            const onChimeEnded = () => {
                chime.removeEventListener('ended', onChimeEnded);
                chime.removeEventListener('error', onChimeEnded);
                this.audioPlaybackState.isChimePlaying = false;

                const audioUrls = eventData?.current_call?.audio_urls || eventData?.audio_urls || [];
                if (audioUrls.length > 0) {
                    this.audioPlaybackState.audioQueue = audioUrls.slice();
                    this.audioPlaybackState.currentAudioIndex = 0;
                    this.playNextAudioFileInSequence();
                } else {
                    // Wait for TTS
                    this.ttsTimeout = setTimeout(() => {
                        this.finishCurrentEvent();
                    }, TTS_TIMEOUT_DURATION);
                }
            };
            chime.addEventListener('ended', onChimeEnded);
            chime.addEventListener('error', onChimeEnded);
            chime.currentTime = 0;
            chime.play().catch(() => {
                onChimeEnded();
            });
        } else {
            this.audioPlaybackState.isChimePlaying = false;
            this.finishCurrentEvent();
        }
    }

    playNextAudioFileInSequence() {
        const { audioQueue, currentAudioIndex } = this.audioPlaybackState;

        if (currentAudioIndex >= audioQueue.length) {
            this.finishCurrentEvent();
            return;
        }

        const audioUrl = audioQueue[currentAudioIndex];
        const player = this.getAudioPlayerForType(this.currentEvent?.type);

        if (!player) {
            this.finishCurrentEvent();
            return;
        }

        const onEnded = () => {
            this.removeAudioListeners(player);
            this.audioPlaybackState.currentAudioIndex += 1;
            this.playNextAudioFileInSequence();
        };

        const onError = () => {
            this.removeAudioListeners(player);
            this.audioPlaybackState.currentAudioIndex += 1;
            this.playNextAudioFileInSequence();
        };

        player._onEnded = onEnded;
        player._onError = onError;
        player.addEventListener('ended', onEnded);
        player.addEventListener('error', onError);

        player.src = audioUrl;
        player.currentTime = 0;
        player.play().catch(() => {
            onError();
        });
    }

    attachAudioListeners(player) {
        if (player._onEnded) player.addEventListener('ended', player._onEnded);
        if (player._onError) player.addEventListener('error', player._onError);
    }

    removeAudioListeners(player) {
        if (player._onEnded) player.removeEventListener('ended', player._onEnded);
        if (player._onError) player.removeEventListener('error', player._onError);
    }

    finishCurrentEvent() {
        if (this.ttsTimeout) {
            clearTimeout(this.ttsTimeout);
            this.ttsTimeout = null;
        }
        this.currentEvent = null;
        this.isProcessingEvent = false;
        this.audioPlaybackState.audioQueue = [];
        this.audioPlaybackState.currentAudioIndex = 0;
        this.processNextEventFromQueue();
    }

    getAudioPlayerForType(type) {
        if (type === 'translatorCall') return this.dom.announcementAudioPlayer;
        return this.dom.ttsAudioPlayer;
    }

    updateStaticPlaceholders() {
        if (this.dom.callIdElement) {
            this.dom.callIdElement.textContent = '----';
        }
        if (this.dom.locationElement) {
            this.dom.locationElement.textContent = '----';
        }
        if (this.dom.listCombinedCalls) {
            this.dom.listCombinedCalls.innerHTML = '<li class="combined-item italic text-gray-400">---</li>';
        }
    }

    shouldDelayRefresh() {
        return this.isProcessingEvent || this.audioPlaybackState.isChimePlaying;
    }

    createClock() {
        const { dateElement, timeElement } = this.dom;
        let intervalId = null;

        const renderClock = () => {
            const now = new Date();
            if (timeElement) {
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                timeElement.textContent = `${hours}:${minutes}`;
            }
            if (dateElement) {
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = now.getFullYear();
                dateElement.textContent = `${day}/${month}/${year}`;
            }
        };

        return {
            start() {
                if (intervalId) return;
                renderClock();
                intervalId = setInterval(renderClock, 1000);
            },
            stop() {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            },
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const page = new SignagePageWithQR();
    page.init();
});
