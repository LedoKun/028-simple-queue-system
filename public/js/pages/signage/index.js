import { API_BASE_URL, SSE_URL, getLabels, setCurrentLanguage } from '../../core/constants.js';
import { renderCallList, createSseIndicatorUpdater } from '../../core/uiHelpers.js';
import { sanitizeText, formatDisplayTime } from '../../core/formatting.js';
import { scheduleAutoRefresh } from '../../core/refresh.js';
import { EventStream } from '../../sse/eventStream.js';

const MAX_HISTORY_ITEMS_DISPLAY = 7;
const MAX_SKIPPED_ITEMS_TO_DISPLAY = 4;
const TTS_TIMEOUT_DURATION = 10_000;

class SignagePage {
  constructor() {
    this.dom = this.queryDom();
    this.eventStream = new EventStream(SSE_URL, { labelProvider: getLabels });
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
    this.autoRefreshCancel = () => {};
    this.clock = this.createClock();

    window.SignageEventQueue = this.eventQueue;
    Object.defineProperty(window, 'SignageCurrentEvent', {
      configurable: true,
      enumerable: false,
      get: () => this.currentProcessingEvent,
    });
  }

  queryDom() {
    const byId = (id) => document.getElementById(id);
    return {
      callIdElement: byId('current-call-id'),
      locationElement: byId('current-location'),
      listHistoryCalls: byId('list-history-calls'),
      listSkippedCalls: byId('list-skipped-calls'),
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
      listHistoryCalls: this.dom.listHistoryCalls,
      listSkippedCalls: this.dom.listSkippedCalls,
      announcementBannerContainer: this.dom.announcementBannerContainer,
      chimeAudio: this.dom.chimeAudio,
      announcementAudioPlayer: this.dom.announcementAudioPlayer,
      ttsAudioPlayer: this.dom.ttsAudioPlayer,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error('SignageUI', 'Missing required DOM elements:', missing.join(', '));
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
    this.eventStream.on('status', ({ detail }) => this.updateSseIndicator(detail));
    this.eventStream.connect();
  }

  async fetchOrderedLanguages() {
    try {
      const response = await fetch(`${API_BASE_URL}/tts/ordered-languages`);
      if (response.ok) {
        this.orderedTtsLangCodes = await response.json();
      } else {
        console.error('SignageUI', 'Failed to fetch ordered TTS languages', response.status, response.statusText);
        this.orderedTtsLangCodes = [];
      }
    } catch (error) {
      console.error('SignageUI', 'Network error while fetching ordered TTS languages', error);
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
        console.error('SignageUI', 'Failed to fetch initial queue state');
        this.updateQueueDisplay(null);
        this.updateCurrentCallDisplay(null);
        this.lastShownCallData = null;
      }

      if (annRes.status === 'fulfilled' && annRes.value.ok) {
        const announcementStatus = await annRes.value.json();
        this.updateAnnouncementDisplay(announcementStatus);
      } else {
        console.error('SignageUI', 'Failed to fetch initial announcement status');
        this.updateAnnouncementDisplay(null);
      }
    } catch (error) {
      console.error('SignageUI', 'Network error during initial state fetch', error);
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

    renderCallList(this.dom.listHistoryCalls, queueState?.completed_history, {
      maxItems: MAX_HISTORY_ITEMS_DISPLAY,
      placeholderText: labels.historyPlaceholder || '----',
      itemClass: 'history-item flex justify-between items-center',
      placeholderClass: 'history-item italic text-gray-500',
      timestampFormatter: formatDisplayTime,
      sanitizer: sanitizeText,
    });

    renderCallList(this.dom.listSkippedCalls, queueState?.skipped_history, {
      maxItems: MAX_SKIPPED_ITEMS_TO_DISPLAY,
      placeholderText: labels.skippedPlaceholder || '----',
      itemClass: 'history-item flex justify-between items-center',
      placeholderClass: 'history-item italic text-gray-500',
      highlightClass: 'text-yellow-400',
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

    const { wrapper, span } = this.ensureBannerPlaceholder();
    this.clearBannerContainer(wrapper);

    if (!announcementStatus || !Array.isArray(announcementStatus.current_banner_playlist) || announcementStatus.current_banner_playlist.length === 0) {
      if (wrapper && !container.contains(wrapper)) {
        container.appendChild(wrapper);
      }
      if (span) {
        span.textContent = getLabels().announcementPlaceholder || 'Announcements';
      }
      return;
    }

    if (wrapper) {
      wrapper.classList.add('hidden');
    }

    const banners = announcementStatus.current_banner_playlist.slice();
    let currentIndex = 0;

    const displayBanner = () => {
      if (banners.length === 0) return;
      const mediaUrl = banners[currentIndex];
      const extension = mediaUrl.split('.').pop().toLowerCase();
      this.clearBannerContainer(wrapper);

      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        const img = document.createElement('img');
        img.src = mediaUrl;
        img.alt = 'Announcement Banner';
        img.className = 'banner-media';
        container.appendChild(img);
      } else if (['mp4', 'webm', 'ogg', 'mov'].includes(extension)) {
        const video = document.createElement('video');
        video.src = mediaUrl;
        video.className = 'banner-media';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.loop = banners.length === 1;
        if (banners.length > 1) {
          video.onended = () => {
            currentIndex = (currentIndex + 1) % banners.length;
            displayBanner();
          };
        }
        container.appendChild(video);
        video.play().catch((error) => console.error('SignageUI', 'Error playing banner video', mediaUrl, error));
      } else {
        console.warn('SignageUI', 'Unsupported banner media type', mediaUrl);
        if (wrapper && !container.contains(wrapper)) {
          container.appendChild(wrapper);
        }
      }
    };

    displayBanner();

    if (banners.length > 1) {
      const isImagePlaylist = banners.every((url) => {
        const ext = url.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
      });

      if (isImagePlaylist) {
        const cycleMs = (announcementStatus.banner_cycle_interval_seconds || 10) * 1000;
        this.bannerIntervalId = setInterval(() => {
          currentIndex = (currentIndex + 1) % banners.length;
          displayBanner();
        }, cycleMs);
      }
    }
  }

  ensureBannerPlaceholder() {
    const container = this.dom.announcementBannerContainer;
    let placeholder = this.dom.announcementPlaceholder;
    if (!placeholder || !placeholder.parentElement) {
      const wrapper = document.createElement('div');
      wrapper.className = 'w-full h-full flex justify-center items-center bg-gray-750 rounded';
      placeholder = document.createElement('span');
      placeholder.id = 'announcement-placeholder';
      placeholder.className = 'text-gray-500 text-sm md:text-base';
      placeholder.textContent = getLabels().announcementPlaceholder || 'Announcements';
      wrapper.appendChild(placeholder);
      if (container) {
        container.appendChild(wrapper);
      }
      this.dom.announcementPlaceholder = placeholder;
      return { wrapper, span: placeholder };
    }

    return { wrapper: placeholder.parentElement, span: placeholder };
  }

  clearBannerContainer(placeholderWrapper = null) {
    const container = this.dom.announcementBannerContainer;
    if (!container) return;
    Array.from(container.children).forEach((child) => {
      if (!placeholderWrapper || child !== placeholderWrapper) {
        container.removeChild(child);
      }
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

  handleTtsComplete(ttsData) {
    if (!ttsData || !ttsData.id || !ttsData.location || !Array.isArray(ttsData.audio_urls)) {
      console.warn('SignageUI', 'Invalid TTS payload received', ttsData);
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
      console.warn('SignageUI', 'TTS payload does not match any queued call', ttsData);
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
                console.warn('SignageUI', 'TTS timed out for call', current.id, current.location);
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
      console.warn('SignageUI', 'Missing audio player or source for item', nextItem);
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
      console.error('SignageUI', 'Error during audio playback', nextItem, error);
      this.handleAudioFileError({ target: player });
      return;
    }

    if (playResult && typeof playResult.then === 'function') {
      playResult
        .then(() => {
          markChimeAsPlaying();
        })
        .catch((error) => {
          console.error('SignageUI', 'Error during audio playback', nextItem, error);
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
    console.error('SignageUI', 'Audio playback error', player?.currentSrc, player?.error);
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
    const historyLi = this.dom.listHistoryCalls?.querySelector('.italic');
    if (historyLi && this.dom.listHistoryCalls.children.length <= 1) {
      historyLi.textContent = labels.historyPlaceholder || 'Waiting for calls...';
    }
    const skippedLi = this.dom.listSkippedCalls?.querySelector('.italic');
    if (skippedLi && this.dom.listSkippedCalls.children.length <= 1) {
      skippedLi.textContent = labels.skippedPlaceholder || 'No skipped calls.';
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
    let clockIntervalId = null;
    let toggleIntervalId = null;
    let useBuddhistYear = false;

    const renderClock = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      let year = now.getFullYear();
      if (useBuddhistYear) {
        year += 543;
      }
      if (this.dom.timeElement) {
        this.dom.timeElement.textContent = `${hours}:${minutes}:${seconds}`;
      }
      if (this.dom.dateElement) {
        this.dom.dateElement.textContent = `${day}-${month}-${year}`;
      }
    };

    return {
      start: () => {
        if (clockIntervalId || toggleIntervalId) return;
        renderClock();
        clockIntervalId = setInterval(renderClock, 1000);
        toggleIntervalId = setInterval(() => {
          useBuddhistYear = !useBuddhistYear;
          renderClock();
        }, 30_000);
      },
      stop: () => {
        if (clockIntervalId) {
          clearInterval(clockIntervalId);
          clockIntervalId = null;
        }
        if (toggleIntervalId) {
          clearInterval(toggleIntervalId);
          toggleIntervalId = null;
        }
      },
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = new SignagePage();
  page.init();
});
