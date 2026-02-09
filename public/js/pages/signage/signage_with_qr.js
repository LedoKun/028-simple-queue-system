/**
 * Custom signage page module for TV with QR code display.
 * Uses the same backend/SSE contract as `js/pages/signage/index.js`,
 * but renders a combined call history list (served + missed).
 */

import { API_BASE_URL, SSE_URL, getLabels, setCurrentLanguage } from '../../core/constants.js';
import { createSseIndicatorUpdater } from '../../core/uiHelpers.js';
import { sanitizeText, formatDisplayTime } from '../../core/formatting.js';
import { scheduleAutoRefresh } from '../../core/refresh.js';
import { EventStream } from '../../sse/eventStream.js';

const MAX_COMBINED_ITEMS_DISPLAY = 8;
const TTS_TIMEOUT_DURATION = 10_000;
const AUTO_REFRESH_INTERVAL_MS = 90 * 60 * 1000;

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

  const combined = [];
  if (Array.isArray(servedItems)) {
    servedItems.forEach((item) => combined.push({ ...item, _type: 'served' }));
  }
  if (Array.isArray(skippedItems)) {
    skippedItems.forEach((item) => combined.push({ ...item, _type: 'skipped' }));
  }

  combined.sort((a, b) => {
    const timeA = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });

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
    arrowSpan.textContent = ` \u2192 `;

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
    this.eventStream = new EventStream(SSE_URL, { labelProvider: () => getLabels('en') });
    this.updateSseIndicator = createSseIndicatorUpdater(this.dom.sseStatusIndicator, {
      setDataset: true,
      keepClasses: true,
    });

    this.orderedTtsLangCodes = [];
    this.eventQueue = [];
    this.currentProcessingEvent = null;
    this.audioPlaybackQueue = [];
    this.isAudioFilePlaying = false;
    this.bannerIntervalId = null;
    this.lastShownCallData = null;
    this.autoRefreshCancel = () => { };
    this.clock = this.createClock();
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
    const required = {
      callIdElement: this.dom.callIdElement,
      locationElement: this.dom.locationElement,
      listCombinedCalls: this.dom.listCombinedCalls,
      announcementBannerContainer: this.dom.announcementBannerContainer,
      chimeAudio: this.dom.chimeAudio,
      announcementAudioPlayer: this.dom.announcementAudioPlayer,
      ttsAudioPlayer: this.dom.ttsAudioPlayer,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error('SignagePageWithQR', 'Missing required DOM elements:', missing.join(', '));
      return false;
    }

    return true;
  }

  async init() {
    if (!this.ensureRequiredElements()) {
      return;
    }

    const pageLanguage = document.documentElement.lang || 'en';
    setCurrentLanguage(pageLanguage);

    this.updateStaticPlaceholders();
    this.setupAutoRefresh();
    this.attachEventStreamHandlers();

    await this.fetchOrderedLanguages();
    await this.fetchInitialState();

    this.clock.start();
  }

  setupAutoRefresh() {
    this.autoRefreshCancel = scheduleAutoRefresh({
      refreshIntervalMs: AUTO_REFRESH_INTERVAL_MS,
      shouldDelay: () => this.shouldDelayRefresh(),
    });

    window.addEventListener('beforeunload', () => {
      this.autoRefreshCancel();
      this.clock.stop();
    });
  }

  attachEventStreamHandlers() {
    this.eventStream.on('queueupdate', ({ detail }) => this.handleQueueUpdate(detail));
    this.eventStream.on('announcementstatus', ({ detail }) => this.handleAnnouncementStatus(detail));
    this.eventStream.on('ttscomplete', ({ detail }) => this.handleTtsComplete(detail));
    this.eventStream.on('translatorcall', ({ detail }) => this.handleTranslatorCall(detail));
    this.eventStream.on('status', ({ detail }) => this.updateSseIndicator(detail));
    this.eventStream.connect();
  }

  async fetchOrderedLanguages() {
    try {
      const response = await fetch(`${API_BASE_URL}/tts/ordered-languages`);
      if (response.ok) {
        this.orderedTtsLangCodes = await response.json();
      } else {
        console.error('SignagePageWithQR', 'Failed to fetch ordered TTS languages', response.status, response.statusText);
        this.orderedTtsLangCodes = [];
      }
    } catch (error) {
      console.error('SignagePageWithQR', 'Network error while fetching ordered TTS languages', error);
      this.orderedTtsLangCodes = [];
    }
  }

  async fetchInitialState() {
    try {
      const [queueRes, annRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/queue/state`),
        fetch(`${API_BASE_URL}/announcements/status`),
      ]);

      if (queueRes.status === 'fulfilled' && queueRes.value.ok) {
        const queueState = await queueRes.value.json();
        this.updateQueueDisplay(queueState);
        if (queueState.current_call) {
          this.updateCurrentCallDisplay(queueState.current_call);
          this.lastShownCallData = { ...queueState.current_call };
        } else {
          this.updateCurrentCallDisplay(null);
          this.lastShownCallData = null;
        }
      } else {
        console.error('SignagePageWithQR', 'Failed to fetch initial queue state');
        this.updateQueueDisplay(null);
        this.updateCurrentCallDisplay(null);
        this.lastShownCallData = null;
      }

      if (annRes.status === 'fulfilled' && annRes.value.ok) {
        const announcementStatus = await annRes.value.json();
        this.updateAnnouncementDisplay(announcementStatus);
      } else {
        console.error('SignagePageWithQR', 'Failed to fetch initial announcement status');
        this.updateAnnouncementDisplay(null);
      }
    } catch (error) {
      console.error('SignagePageWithQR', 'Network error during initial state fetch', error);
      this.updateQueueDisplay(null);
      this.updateCurrentCallDisplay(null);
      this.updateAnnouncementDisplay(null);
      this.lastShownCallData = null;
    } finally {
      this.processNextEventFromQueue();
    }
  }

  updateCurrentCallDisplay(callData) {
    const id = callData?.id ? sanitizeText(callData.id) : '----';
    const location = callData?.location ? sanitizeText(callData.location) : '----';
    if (this.dom.callIdElement) this.dom.callIdElement.textContent = id;
    if (this.dom.locationElement) this.dom.locationElement.textContent = location;
  }

  updateQueueDisplay(queueState) {
    const labels = getLabels();
    renderCombinedCallList(this.dom.listCombinedCalls, queueState?.completed_history, queueState?.skipped_history, {
      maxItems: MAX_COMBINED_ITEMS_DISPLAY,
      placeholderText: labels.historyPlaceholder || '----',
      servedClass: 'combined-item served-item',
      skippedClass: 'combined-item skipped-item',
      placeholderClass: 'combined-item italic text-gray-400',
      timestampFormatter: formatDisplayTime,
      sanitizer: sanitizeText,
    });
  }

  updateAnnouncementDisplay(announcementStatus) {
    const container = this.dom.announcementBannerContainer;
    if (!container) return;

    if (this.bannerIntervalId) {
      clearInterval(this.bannerIntervalId);
      this.bannerIntervalId = null;
    }

    const placeholder = this.ensureBannerPlaceholder();
    this.clearBannerContainer(placeholder);

    const banners = Array.isArray(announcementStatus?.current_banner_playlist)
      ? announcementStatus.current_banner_playlist.slice()
      : [];
    if (banners.length === 0) {
      placeholder.textContent = getLabels().announcementPlaceholder || 'Announcements';
      placeholder.style.display = '';
      return;
    }

    placeholder.style.display = 'none';

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];
    const playlist = banners
      .map((mediaUrl) => {
        const extension = String(mediaUrl || '').split('.').pop().toLowerCase();
        if (imageExtensions.includes(extension)) return { mediaUrl, type: 'image' };
        if (videoExtensions.includes(extension)) return { mediaUrl, type: 'video' };
        console.warn('SignagePageWithQR', 'Unsupported banner media type', mediaUrl);
        return null;
      })
      .filter(Boolean);

    if (playlist.length === 0) {
      placeholder.style.display = '';
      placeholder.textContent = getLabels().announcementPlaceholder || 'Announcements';
      container.appendChild(placeholder);
      return;
    }

    let currentIndex = 0;
    const cycleMs = (announcementStatus?.banner_cycle_interval_seconds || 10) * 1000;

    const showNextBanner = () => {
      if (playlist.length <= 1) return;
      currentIndex = (currentIndex + 1) % playlist.length;
      displayBanner();
    };

    const displayBanner = () => {
      if (this.bannerIntervalId) {
        clearInterval(this.bannerIntervalId);
        this.bannerIntervalId = null;
      }

      if (playlist.length === 0) return;
      const current = playlist[currentIndex];

      this.clearBannerContainer(placeholder);

      if (current.type === 'image') {
        const img = document.createElement('img');
        img.src = current.mediaUrl;
        img.alt = 'Announcement Banner';
        img.className = 'banner-media';
        container.appendChild(img);
        if (playlist.length > 1) {
          this.bannerIntervalId = setTimeout(showNextBanner, cycleMs);
        }
        return;
      }

      if (current.type === 'video') {
        const video = document.createElement('video');
        video.src = current.mediaUrl;
        video.className = 'banner-media';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.loop = playlist.length === 1;

        let advanced = false;
        const advanceOnce = () => {
          if (advanced) return;
          advanced = true;
          showNextBanner();
        };

        if (playlist.length > 1) {
          video.onended = advanceOnce;
          video.onerror = advanceOnce;
        }
        container.appendChild(video);
        video.play().catch(() => {
          if (playlist.length > 1 && !advanced) {
            this.bannerIntervalId = setTimeout(advanceOnce, cycleMs);
          }
        });
        return;
      }

      placeholder.style.display = '';
      placeholder.textContent = getLabels().announcementPlaceholder || 'Announcements';
      container.appendChild(placeholder);
    };

    displayBanner();
  }

  ensureBannerPlaceholder() {
    const container = this.dom.announcementBannerContainer;
    let placeholder = this.dom.announcementPlaceholder;

    if (!placeholder) {
      placeholder = document.createElement('span');
      placeholder.id = 'announcement-placeholder';
      placeholder.className = 'text-gray-600';
      placeholder.textContent = getLabels().announcementPlaceholder || 'Announcements';
      container.appendChild(placeholder);
      this.dom.announcementPlaceholder = placeholder;
      return placeholder;
    }

    if (!placeholder.parentElement && container) {
      container.appendChild(placeholder);
    }

    return placeholder;
  }

  clearBannerContainer(placeholder = null) {
    const container = this.dom.announcementBannerContainer;
    if (!container) return;

    Array.from(container.children).forEach((child) => {
      if (placeholder && child === placeholder) {
        return;
      }
      container.removeChild(child);
    });
  }

  handleQueueUpdate(queueState) {
    this.updateQueueDisplay(queueState);

    const newCall = queueState?.current_call;
    if (newCall) {
      let shouldQueue = true;

      if (this.currentProcessingEvent?.type === 'call' &&
        this.currentProcessingEvent.id === newCall.id &&
        this.currentProcessingEvent.location === newCall.location) {
        shouldQueue = false;
      }

      if (shouldQueue && this.eventQueue.some((evt) => evt.type === 'call' && evt.id === newCall.id && evt.location === newCall.location)) {
        shouldQueue = false;
      }

      if (shouldQueue) {
        const callEvent = {
          type: 'call',
          id: newCall.id,
          location: newCall.location,
          callData: { ...newCall },
          requiredTts: Array.isArray(this.orderedTtsLangCodes) && this.orderedTtsLangCodes.length > 0
            ? [...this.orderedTtsLangCodes]
            : [],
          receivedTtsUrls: [],
          chimeFinished: false,
          ttsReady: false,
          timestamp: new Date().toISOString(),
        };
        this.eventQueue.push(callEvent);
        this.processNextEventFromQueue();
      }
    } else if (!this.currentProcessingEvent && this.eventQueue.length === 0) {
      this.processNextEventFromQueue();
    }
  }

  handleAnnouncementStatus(announcementStatus) {
    this.updateAnnouncementDisplay(announcementStatus);

    const playlist = announcementStatus?.current_audio_playlist || [];
    if (playlist.length === 0) {
      return;
    }

    const primarySrc = playlist[0];
    let shouldQueue = true;

    if (this.currentProcessingEvent?.type === 'announcement' &&
      this.currentProcessingEvent.audioSequence.some((item) => item.src === primarySrc)) {
      shouldQueue = false;
    }

    if (shouldQueue && this.eventQueue.some((evt) => evt.type === 'announcement' && evt.audioSequence.some((item) => item.src === primarySrc))) {
      shouldQueue = false;
    }

    if (!shouldQueue) {
      return;
    }

    const announcementEvent = {
      type: 'announcement',
      audioSequence: playlist.map((src) => ({ src, playerType: 'announcement' })),
    };

    this.eventQueue.push(announcementEvent);
    this.processNextEventFromQueue();
  }

  handleTranslatorCall(payload) {
    if (!payload || !Array.isArray(payload.audio_urls) || payload.audio_urls.length === 0) {
      console.warn('SignagePageWithQR', 'Translator call payload missing audio URLs', payload);
      return;
    }

    const playlist = payload.audio_urls.filter(Boolean);
    if (playlist.length === 0) {
      return;
    }

    const dedupKey = `${payload.location || 'translator'}::${playlist[0]}`;

    const isDuplicateActive =
      this.currentProcessingEvent?.type === 'announcement' &&
      this.currentProcessingEvent?.source === 'translator' &&
      this.currentProcessingEvent?.dedupKey === dedupKey;

    if (isDuplicateActive) {
      return;
    }

    const isDuplicateQueued = this.eventQueue.some(
      (evt) => evt.type === 'announcement' && evt.source === 'translator' && evt.dedupKey === dedupKey,
    );

    if (isDuplicateQueued) {
      return;
    }

    const translatorEvent = {
      type: 'announcement',
      source: 'translator',
      dedupKey,
      audioSequence: playlist.map((src) => ({ src, playerType: 'announcement' })),
    };

    this.eventQueue.push(translatorEvent);
    this.processNextEventFromQueue();
  }

  handleTtsComplete(ttsData) {
    if (!ttsData || !ttsData.id || !ttsData.location || !Array.isArray(ttsData.audio_urls)) {
      console.warn('SignagePageWithQR', 'Invalid TTS payload received', ttsData);
      return;
    }

    let targetEvent = null;
    if (this.currentProcessingEvent?.type === 'call' &&
      this.currentProcessingEvent.id === ttsData.id &&
      this.currentProcessingEvent.location === ttsData.location) {
      targetEvent = this.currentProcessingEvent;
    } else {
      targetEvent = this.eventQueue.find((evt) => evt.type === 'call' && evt.id === ttsData.id && evt.location === ttsData.location);
    }

    if (!targetEvent) {
      console.warn('SignagePageWithQR', 'TTS payload does not match any queued call', ttsData);
      return;
    }

    if (!Array.isArray(targetEvent.requiredTts) || targetEvent.requiredTts.length === 0) {
      targetEvent.requiredTts = [];
    }

    if (!Array.isArray(targetEvent.receivedTtsUrls)) {
      targetEvent.receivedTtsUrls = [];
    }

    const langIndex = targetEvent.requiredTts.indexOf(ttsData.lang);
    if (langIndex !== -1) {
      targetEvent.requiredTts.splice(langIndex, 1);
    }

    if (targetEvent.receivedTtsUrls.length === 0) {
      targetEvent.receivedTtsUrls = [...ttsData.audio_urls];
    }

    const allTtsAvailable = targetEvent.requiredTts.length === 0 || targetEvent.receivedTtsUrls.length > 0;

    if (allTtsAvailable && !targetEvent.ttsReady) {
      targetEvent.ttsReady = true;

      if (targetEvent.ttsWaitTimeoutId) {
        clearTimeout(targetEvent.ttsWaitTimeoutId);
        targetEvent.ttsWaitTimeoutId = null;
      }

      if (this.currentProcessingEvent === targetEvent) {
        const newItems = targetEvent.receivedTtsUrls
          .filter((url) => url && !this.audioPlaybackQueue.some((item) => item.src === url && item.playerType === 'tts'))
          .map((url) => ({ src: url, playerType: 'tts' }));

        if (newItems.length > 0) {
          const chimeIdx = this.audioPlaybackQueue.findIndex((item) => item.playerType === 'chime');
          if (chimeIdx !== -1 && !targetEvent.chimeFinished) {
            this.audioPlaybackQueue.splice(chimeIdx + 1, 0, ...newItems);
          } else {
            this.audioPlaybackQueue.push(...newItems);
          }
        }

        if (targetEvent.chimeFinished && !this.isAudioFilePlaying) {
          this.playNextAudioFileInSequence();
        }
      }
    }
  }

  processNextEventFromQueue() {
    if (this.currentProcessingEvent || this.isAudioFilePlaying) {
      return;
    }

    if (this.eventQueue.length === 0) {
      if (!this.lastShownCallData) {
        this.updateCurrentCallDisplay(null);
      } else {
        this.updateCurrentCallDisplay(this.lastShownCallData);
      }
      return;
    }

    this.currentProcessingEvent = this.eventQueue.shift();
    this.audioPlaybackQueue = [];
    this.isAudioFilePlaying = false;

    if (this.currentProcessingEvent.type === 'call') {
      this.updateCurrentCallDisplay(this.currentProcessingEvent.callData);
      this.lastShownCallData = { ...this.currentProcessingEvent.callData };
      if (this.dom.chimeAudio?.src) {
        this.audioPlaybackQueue.push({ src: this.dom.chimeAudio.src, playerType: 'chime' });
      }
      this.currentProcessingEvent.chimeFinished = false;
      if (this.currentProcessingEvent.ttsReady && Array.isArray(this.currentProcessingEvent.receivedTtsUrls)) {
        this.currentProcessingEvent.receivedTtsUrls.forEach((url) => {
          if (url) this.audioPlaybackQueue.push({ src: url, playerType: 'tts' });
        });
      }
    } else if (this.currentProcessingEvent.type === 'announcement') {
      if (this.lastShownCallData) {
        this.updateCurrentCallDisplay(this.lastShownCallData);
      }
      if (this.dom.chimeAudio?.src) {
        const alreadyHasChime = this.currentProcessingEvent.audioSequence?.some(
          (item) => item.playerType === 'chime' || item.src === this.dom.chimeAudio.src,
        );
        if (!alreadyHasChime) {
          this.audioPlaybackQueue.push({ src: this.dom.chimeAudio.src, playerType: 'chime' });
        }
      }
      this.currentProcessingEvent.audioSequence.forEach((item) => this.audioPlaybackQueue.push({ ...item }));
    }

    if (this.audioPlaybackQueue.length > 0) {
      this.playNextAudioFileInSequence();
    } else {
      this.finishCurrentEvent();
    }
  }

  playNextAudioFileInSequence() {
    if (this.audioPlaybackQueue.length === 0) {
      this.isAudioFilePlaying = false;
      if (this.currentProcessingEvent?.type === 'call') {
        const current = this.currentProcessingEvent;
        if (!current.chimeFinished) {
          return;
        }
        if (Array.isArray(current.requiredTts) && current.requiredTts.length > 0 && !current.ttsReady) {
          if (!current.ttsWaitTimeoutId) {
            current.ttsWaitTimeoutId = setTimeout(() => {
              if (this.currentProcessingEvent === current && !current.ttsReady) {
                console.warn('SignagePageWithQR', 'TTS timed out for call', current.id, current.location);
                current.requiredTts = [];
                current.ttsReady = true;
                current.ttsWaitTimeoutId = null;
                this.playNextAudioFileInSequence();
              }
            }, TTS_TIMEOUT_DURATION);
          }
          return;
        }
      }
      this.finishCurrentEvent();
      return;
    }

    const nextItem = this.audioPlaybackQueue.shift();
    const player = this.getAudioPlayerForType(nextItem.playerType);
    if (!player || !nextItem.src) {
      console.warn('SignagePageWithQR', 'Missing audio player or source for item', nextItem);
      this.playNextAudioFileInSequence();
      return;
    }

    this.isAudioFilePlaying = true;
    player.pause();
    player.currentTime = 0;
    player.src = nextItem.src;
    if (typeof player.load === 'function') {
      player.load();
    }
    if ('playbackRate' in player) {
      player.playbackRate = nextItem.playerType === 'chime' ? 1 : 1.1;
    }
    this.attachAudioListeners(player);

    const markChimeAsPlaying = () => {
      if (nextItem.playerType === 'chime' && this.currentProcessingEvent) {
        this.currentProcessingEvent.chimeFinished = false;
      }
    };

    let playResult;
    try {
      playResult = player.play();
    } catch (error) {
      console.error('SignagePageWithQR', 'Error during audio playback', nextItem, error);
      this.handleAudioFileError({ target: player });
      return;
    }

    if (playResult && typeof playResult.then === 'function') {
      playResult
        .then(() => {
          markChimeAsPlaying();
        })
        .catch((error) => {
          console.error('SignagePageWithQR', 'Error during audio playback', nextItem, error);
          this.handleAudioFileError({ target: player });
        });
    } else {
      markChimeAsPlaying();
    }
  }

  handleAudioFileEnded = (event) => {
    const player = event.target;
    this.removeAudioListeners(player);
    this.isAudioFilePlaying = false;

    if (this.currentProcessingEvent && player === this.dom.chimeAudio && this.currentProcessingEvent.type === 'call') {
      this.currentProcessingEvent.chimeFinished = true;
    }

    this.playNextAudioFileInSequence();
  };

  handleAudioFileError = (event) => {
    const player = event.target;
    console.error('SignagePageWithQR', 'Audio playback error', player?.currentSrc, player?.error);
    this.removeAudioListeners(player);
    this.isAudioFilePlaying = false;

    if (this.currentProcessingEvent && player === this.dom.chimeAudio && this.currentProcessingEvent.type === 'call') {
      this.currentProcessingEvent.chimeFinished = true;
    }

    this.playNextAudioFileInSequence();
  };

  attachAudioListeners(player) {
    if (!player) return;
    player.addEventListener('ended', this.handleAudioFileEnded);
    player.addEventListener('error', this.handleAudioFileError);
  }

  removeAudioListeners(player) {
    if (!player) return;
    player.removeEventListener('ended', this.handleAudioFileEnded);
    player.removeEventListener('error', this.handleAudioFileError);
  }

  finishCurrentEvent() {
    if (this.currentProcessingEvent?.ttsWaitTimeoutId) {
      clearTimeout(this.currentProcessingEvent.ttsWaitTimeoutId);
      this.currentProcessingEvent.ttsWaitTimeoutId = null;
    }
    this.currentProcessingEvent = null;
    this.audioPlaybackQueue = [];
    this.isAudioFilePlaying = false;
    this.processNextEventFromQueue();
  }

  getAudioPlayerForType(type) {
    if (type === 'chime') return this.dom.chimeAudio;
    if (type === 'tts') return this.dom.ttsAudioPlayer;
    return this.dom.announcementAudioPlayer;
  }

  updateStaticPlaceholders() {
    const labels = getLabels();

    if (this.dom.listCombinedCalls) {
      this.dom.listCombinedCalls.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'combined-item italic text-gray-400';
      li.textContent = labels.historyPlaceholder || '----';
      this.dom.listCombinedCalls.appendChild(li);
    }

    if (this.dom.announcementPlaceholder) {
      this.dom.announcementPlaceholder.textContent = labels.announcementPlaceholder || 'Announcements';
    }
  }

  shouldDelayRefresh() {
    const audioPlayers = [this.dom.chimeAudio, this.dom.announcementAudioPlayer, this.dom.ttsAudioPlayer];
    const audioPlaying = audioPlayers.some((player) => player && !player.paused && !player.ended && player.currentTime > 0);
    return audioPlaying || Boolean(this.currentProcessingEvent) || this.eventQueue.length > 0;
  }

  createClock() {
    let intervalId = null;

    const renderClock = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      if (this.dom.timeElement) {
        this.dom.timeElement.textContent = `${hours}:${minutes}`;
      }
      if (this.dom.dateElement) {
        this.dom.dateElement.textContent = `${day}/${month}/${year}`;
      }
    };

    return {
      start: () => {
        if (intervalId) return;
        renderClock();
        intervalId = setInterval(renderClock, 1000);
      },
      stop: () => {
        if (!intervalId) return;
        clearInterval(intervalId);
        intervalId = null;
      },
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Some early module browsers (notably Safari 10.1) execute both `module` and `nomodule` scripts.
  // Only run the modern bundle when the browser also supports `nomodule`.
  if (!('noModule' in HTMLScriptElement.prototype)) {
    return;
  }
  const page = new SignagePageWithQR();
  page.init();
});
