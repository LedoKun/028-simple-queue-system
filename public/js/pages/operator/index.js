import { API_BASE_URL, SSE_URL, getLabels, setCurrentLanguage } from '../../core/constants.js';
import { createFeedbackController } from '../../core/feedback.js';
import { QueueApiClient } from '../../api/queueApiClient.js';
import { renderCallList, createSseIndicatorUpdater } from '../../core/uiHelpers.js';
import { sanitizeText, formatDisplayTime } from '../../core/formatting.js';
import { Validation } from '../../core/validation.js';
import { scheduleAutoRefresh } from '../../core/refresh.js';
import { EventStream } from '../../sse/eventStream.js';

const MAX_LIST_ITEMS_OPERATOR = 7;
const OPERATOR_STATION_STORAGE_KEY = 'operator_station_number';

class OperatorPage {
  constructor() {
    this.dom = this.queryDom();
    this.feedback = createFeedbackController({ elementId: this.dom.feedbackArea });
    this.apiClient = new QueueApiClient({ baseUrl: API_BASE_URL, feedback: this.feedback });
    this.eventStream = new EventStream(SSE_URL, { labelProvider: getLabels });
    this.cooldownIntervalId = null;
    this.lastAnnouncementStatus = null;
    this.autoRefreshCleanup = () => {};
    this.translatorCooldownIntervalId = null;
    this.translatorCooldownState = { active: false, remainingSeconds: 0, totalSeconds: 0 };
    this.lastLocationValid = false;

    this.renderHistoryList = (container, items, options = {}) => {
      renderCallList(container, items, {
        sanitizer: sanitizeText,
        timestampFormatter: formatDisplayTime,
        ...options,
      });
    };

    this.updateSseIndicator = createSseIndicatorUpdater(this.dom.sseStatusIndicator, {
      statusClassMap: {
        connecting: 'bg-yellow-500',
        connected: 'bg-green-500',
        disconnected: 'bg-red-500',
        unsupported: 'bg-gray-600',
        default: 'bg-gray-600',
      },
      baseClass: this.dom.sseStatusIndicator?.className || '',
    });
  }

  queryDom() {
    const byId = (id) => document.getElementById(id);
    return {
      callForm: byId('call-form'),
      originalIdInput: byId('call-original-id'),
      locationInput: byId('call-location'),
      btnCall: byId('btn-call'),
      btnSkip: byId('btn-skip'),
      btnCallTranslator: byId('btn-call-translator'),
      statusCurrentCallId: byId('status-current-call-id'),
      statusCurrentCallLocation: byId('status-current-call-location'),
      listHistoryCalls: byId('list-history-calls'),
      listSkippedCalls: byId('list-skipped-calls'),
      statusAnnouncementSlot: byId('status-announcement-slot'),
      statusAnnouncementCooldown: byId('status-announcement-cooldown'),
      statusAnnouncementCooldownTimer: byId('status-announcement-cooldown-timer'),
      btnNextAnnouncement: byId('btn-next-announcement'),
      announcementSlotList: byId('announcement-slot-list'),
      statusTranslatorCooldown: byId('status-translator-cooldown'),
      statusTranslatorCooldownTimer: byId('status-translator-cooldown-timer'),
      sseStatusIndicator: byId('sse-status-indicator'),
      feedbackArea: byId('feedback-area'),
    };
  }

  ensureRequiredElements() {
    const required = {
      callForm: this.dom.callForm,
      originalIdInput: this.dom.originalIdInput,
      locationInput: this.dom.locationInput,
      btnCall: this.dom.btnCall,
      btnSkip: this.dom.btnSkip,
      listHistoryCalls: this.dom.listHistoryCalls,
      listSkippedCalls: this.dom.listSkippedCalls,
      statusCurrentCallId: this.dom.statusCurrentCallId,
      statusCurrentCallLocation: this.dom.statusCurrentCallLocation,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error('OperatorUI', 'Missing required DOM elements:', missing.join(', '));
      if (this.dom.btnCall) this.dom.btnCall.disabled = true;
      if (this.dom.btnSkip) this.dom.btnSkip.disabled = true;
      if (this.dom.btnNextAnnouncement) this.dom.btnNextAnnouncement.disabled = true;
      return false;
    }

    return true;
  }

  init() {
    if (!this.ensureRequiredElements()) {
      return;
    }

    setCurrentLanguage('en');
    this.setupAutoRefresh();
    this.restoreOperatorStationValue();
    this.setupInputGuards();
    this.attachEventHandlers();
    this.attachEventStreamHandlers();
    this.fetchInitialState();
    this.validateInputs();

    if (this.dom.originalIdInput) {
      this.dom.originalIdInput.focus();
    }
  }

  setupAutoRefresh() {
    this.autoRefreshCleanup = scheduleAutoRefresh({
      shouldDelay: () => false,
      onBeforeRefresh: () => this.persistOperatorStationValue(),
    });

    window.addEventListener('beforeunload', () => {
      this.persistOperatorStationValue();
      this.autoRefreshCleanup();
    });
  }

  setupInputGuards() {
    const { originalIdInput, locationInput } = this.dom;
    if (originalIdInput) {
      originalIdInput.addEventListener('input', (event) => {
        const target = event.target;
        const selectionStart = target.selectionStart;
        const selectionEnd = target.selectionEnd;

        const rawValue = String(target.value || '');
        let cleaned = '';
        if (rawValue.length > 0) {
          const firstChar = rawValue.charAt(0).toUpperCase();
          if (/^[A-Z]$/.test(firstChar)) {
            cleaned += firstChar;
          }
          if (rawValue.length > 1) {
            cleaned += rawValue.substring(1).replace(/[^0-9]/g, '');
          }
        }

        target.value = cleaned;
        target.setSelectionRange(selectionStart, selectionEnd);
        this.validateInputs();
      });
    }

    if (locationInput) {
      locationInput.addEventListener('input', (event) => {
        const target = event.target;
        const selectionStart = target.selectionStart;
        const selectionEnd = target.selectionEnd;
        target.value = String(target.value || '').replace(/[^0-9]/g, '');
        target.setSelectionRange(selectionStart, selectionEnd);
        this.validateInputs();
        this.persistOperatorStationValue();
      });
    }
  }

  attachEventHandlers() {
    const { callForm, btnSkip, btnNextAnnouncement, btnCallTranslator, originalIdInput, locationInput } = this.dom;

    if (callForm) {
      callForm.addEventListener('submit', (event) => this.handleCallFormSubmit(event));
    }

    if (btnSkip) {
      btnSkip.addEventListener('click', (event) => this.handleForceSkipCall(event));
    }

    if (btnNextAnnouncement) {
      btnNextAnnouncement.addEventListener('click', () => this.handleNextAnnouncement());
    }

    if (btnCallTranslator) {
      btnCallTranslator.addEventListener('click', (event) => this.handleCallTranslator(event));
    }

    if (originalIdInput) {
      originalIdInput.addEventListener('blur', () => this.validateInputs());
    }

    if (locationInput) {
      locationInput.addEventListener('blur', () => this.validateInputs());
    }
  }

  attachEventStreamHandlers() {
    this.eventStream.on('queueupdate', ({ detail }) => {
      this.updateQueueStatusDisplay(detail);
    });

    this.eventStream.on('announcementstatus', ({ detail }) => {
      this.updateAnnouncementStatusDisplay(detail);
    });

    this.eventStream.on('ttscomplete', ({ detail }) => {
      console.debug('OperatorUI', 'TTS complete event received', detail);
    });

    this.eventStream.on('translatorcall', ({ detail }) => {
      this.handleTranslatorCallEvent(detail);
    });

    this.eventStream.on('status', ({ detail }) => {
      this.updateSseIndicator(detail);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.eventStream.eventSource) {
        this.eventStream.connect();
      }
    });

    this.eventStream.connect();
  }

  async fetchInitialState() {
    const labels = getLabels();
    this.feedback.show(labels.loading, { type: 'info', duration: 0 });

    const [queueResult, announcementResult, translatorResult] = await Promise.allSettled([
      this.apiClient.getQueueState(),
      this.apiClient.getAnnouncementStatus(),
      this.apiClient.getTranslatorStatus(),
    ]);

    this.feedback.clear();

    if (queueResult.status === 'fulfilled' && queueResult.value) {
      this.updateQueueStatusDisplay(queueResult.value);
    } else {
      this.feedback.show('Failed to load initial queue state. Waiting for live updates.', { type: 'warning', duration: 5000 });
      this.updateQueueStatusDisplay(null);
    }

    if (announcementResult.status === 'fulfilled' && announcementResult.value) {
      this.updateAnnouncementStatusDisplay(announcementResult.value);
    } else {
      this.feedback.show('Failed to load announcement status. Waiting for live updates.', { type: 'warning', duration: 5000 });
      this.updateAnnouncementStatusDisplay(null);
    }

    if (translatorResult.status === 'fulfilled' && translatorResult.value) {
      this.updateTranslatorStatusDisplay(translatorResult.value);
    } else {
      console.warn('OperatorUI', 'Failed to load translator status initially');
      this.updateTranslatorStatusDisplay(null);
    }
  }

  validateInputs() {
    const idValue = this.dom.originalIdInput?.value?.trim() || '';
    const locationValue = this.dom.locationInput?.value?.trim() || '';

    const isIdValid = Validation.isValidCallIdentifier(idValue);
    const isLocationValid = Validation.isValidCallLocation(locationValue);

    if (this.dom.btnCall) {
      this.dom.btnCall.disabled = !(isIdValid && isLocationValid);
    }
    if (this.dom.btnSkip) {
      this.dom.btnSkip.disabled = !(isIdValid && isLocationValid);
    }

    this.lastLocationValid = isLocationValid;
    this.updateTranslatorButtonState();
  }

  updateQueueStatusDisplay(queueState) {
    const labels = getLabels();
    const currentCall = queueState?.current_call || null;

    if (this.dom.statusCurrentCallId) {
      this.dom.statusCurrentCallId.textContent = sanitizeText(currentCall?.id ?? '----');
    }
    if (this.dom.statusCurrentCallLocation) {
      this.dom.statusCurrentCallLocation.textContent = sanitizeText(currentCall?.location ?? '----');
    }

    this.renderHistoryList(this.dom.listHistoryCalls, queueState?.completed_history, {
      maxItems: MAX_LIST_ITEMS_OPERATOR,
      placeholderText: labels.historyPlaceholder || '----',
      itemClass: 'history-list-item flex justify-between items-center',
      placeholderClass: 'history-list-item italic',
      highlightClass: 'text-yellow-400',
      reverse: true,
    });

    this.renderHistoryList(this.dom.listSkippedCalls, queueState?.skipped_history, {
      maxItems: MAX_LIST_ITEMS_OPERATOR,
      placeholderText: labels.skippedPlaceholder || '----',
      itemClass: 'history-list-item flex justify-between items-center',
      placeholderClass: 'history-list-item italic',
      highlightClass: 'text-yellow-400',
      reverse: true,
    });
  }

  cloneAnnouncementStatus(status) {
    if (!status) return null;
    return {
      ...status,
      available_slots: Array.isArray(status.available_slots)
        ? status.available_slots.map((slot) => ({
            ...slot,
            audio_playlist: Array.isArray(slot.audio_playlist) ? [...slot.audio_playlist] : [],
          }))
        : [],
    };
  }

  renderAnnouncementSlotButtons(announcementStatus) {
    const container = this.dom.announcementSlotList;
    if (!container) return;

    container.innerHTML = '';

    if (!announcementStatus || !Array.isArray(announcementStatus.available_slots) || announcementStatus.available_slots.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'text-sm text-gray-400 italic';
      placeholder.textContent = 'No announcements available.';
      container.appendChild(placeholder);
      return;
    }

    const cooldownActive = Boolean(announcementStatus.cooldown_active);
    const activeSlotId = announcementStatus.current_slot_id || null;

    announcementStatus.available_slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'flex items-center justify-between gap-2 w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2 px-3 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-150 text-left';

      if (slot.id === activeSlotId) {
        button.classList.add('border', 'border-purple-300');
      }

      const audioCount = Array.isArray(slot.audio_playlist) ? slot.audio_playlist.length : 0;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'slot-trigger-label';
      labelSpan.textContent = `Trigger ${slot.id}`;
      button.appendChild(labelSpan);

      const metaSpan = document.createElement('span');
      metaSpan.className = 'slot-trigger-meta text-xs text-purple-200 uppercase tracking-wide';
      const metaParts = [`${audioCount} file${audioCount === 1 ? '' : 's'}`];
      if (slot.id === activeSlotId) metaParts.push('current');
      metaSpan.textContent = metaParts.join(' • ');
      button.appendChild(metaSpan);

      if (cooldownActive) {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
      }

      button.addEventListener('click', () => this.handleManualAnnouncementTrigger(slot.id, button));
      container.appendChild(button);
    });
  }

  updateAnnouncementStatusDisplay(announcementStatus) {
    this.lastAnnouncementStatus = this.cloneAnnouncementStatus(announcementStatus);

    if (!announcementStatus) {
      if (this.dom.statusAnnouncementSlot) this.dom.statusAnnouncementSlot.textContent = 'N/A';
      if (this.dom.statusAnnouncementCooldown) this.dom.statusAnnouncementCooldown.textContent = 'Unknown';
      if (this.dom.statusAnnouncementCooldownTimer) this.dom.statusAnnouncementCooldownTimer.textContent = '';
      this.renderAnnouncementSlotButtons(null);
      return;
    }

    if (this.dom.statusAnnouncementSlot) {
      this.dom.statusAnnouncementSlot.textContent = announcementStatus.current_slot_id || 'N/A';
    }

    if (this.cooldownIntervalId) {
      clearInterval(this.cooldownIntervalId);
      this.cooldownIntervalId = null;
    }

    if (announcementStatus.cooldown_active) {
      if (this.dom.statusAnnouncementCooldown) {
        this.dom.statusAnnouncementCooldown.textContent = 'On Cooldown';
      }
      const total = Number(announcementStatus.cooldown_seconds) || 0;
      let remaining = Number(announcementStatus.cooldown_remaining_seconds) || total;
      if (this.dom.statusAnnouncementCooldownTimer) {
        this.dom.statusAnnouncementCooldownTimer.textContent = `(${remaining}s)`;
      }
      if (this.dom.btnNextAnnouncement) {
        this.dom.btnNextAnnouncement.disabled = true;
        this.dom.btnNextAnnouncement.classList.add('opacity-50', 'cursor-not-allowed');
        this.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
      }

      this.cooldownIntervalId = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          if (this.dom.statusAnnouncementCooldownTimer) {
            this.dom.statusAnnouncementCooldownTimer.textContent = `(${remaining}s)`;
          }
        } else {
          clearInterval(this.cooldownIntervalId);
          this.cooldownIntervalId = null;
          if (this.dom.statusAnnouncementCooldown) {
            this.dom.statusAnnouncementCooldown.textContent = 'Ready';
          }
          if (this.dom.statusAnnouncementCooldownTimer) {
            this.dom.statusAnnouncementCooldownTimer.textContent = '';
          }
          if (this.dom.btnNextAnnouncement) {
            this.dom.btnNextAnnouncement.disabled = false;
            this.dom.btnNextAnnouncement.classList.remove('opacity-50', 'cursor-not-allowed');
            this.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
          }
          this.renderAnnouncementSlotButtons({ ...announcementStatus, cooldown_active: false, cooldown_remaining_seconds: 0 });
        }
      }, 1000);
    } else {
      if (this.dom.statusAnnouncementCooldown) {
        this.dom.statusAnnouncementCooldown.textContent = 'Ready';
      }
      if (this.dom.statusAnnouncementCooldownTimer) {
        this.dom.statusAnnouncementCooldownTimer.textContent = '';
      }
      if (this.dom.btnNextAnnouncement) {
        this.dom.btnNextAnnouncement.disabled = false;
        this.dom.btnNextAnnouncement.classList.remove('opacity-50', 'cursor-not-allowed');
        this.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
      }
    }

    this.renderAnnouncementSlotButtons(announcementStatus);
  }

  updateTranslatorStatusDisplay(status) {
    if (this.translatorCooldownIntervalId) {
      clearInterval(this.translatorCooldownIntervalId);
      this.translatorCooldownIntervalId = null;
    }

    if (!status) {
      if (this.dom.statusTranslatorCooldown) {
        this.dom.statusTranslatorCooldown.textContent = 'Unknown';
      }
      if (this.dom.statusTranslatorCooldownTimer) {
        this.dom.statusTranslatorCooldownTimer.textContent = '';
      }
      this.translatorCooldownState = { active: false, remainingSeconds: 0, totalSeconds: 0 };
      this.updateTranslatorButtonState();
      return;
    }

    const totalSeconds = Number(status.cooldown_seconds) || 0;
    let remaining = Number(status.cooldown_remaining_seconds) || 0;
    const active = Boolean(status.cooldown_active && remaining > 0);

    if (this.dom.statusTranslatorCooldown) {
      this.dom.statusTranslatorCooldown.textContent = active ? 'On Cooldown' : 'Ready';
    }
    if (this.dom.statusTranslatorCooldownTimer) {
      this.dom.statusTranslatorCooldownTimer.textContent = active ? `(${remaining}s)` : '';
    }

    this.translatorCooldownState = {
      active,
      remainingSeconds: active ? remaining : 0,
      totalSeconds,
    };

    if (active && remaining > 0) {
      this.translatorCooldownIntervalId = window.setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          if (this.dom.statusTranslatorCooldownTimer) {
            this.dom.statusTranslatorCooldownTimer.textContent = `(${remaining}s)`;
          }
          this.translatorCooldownState.remainingSeconds = remaining;
        } else {
          clearInterval(this.translatorCooldownIntervalId);
          this.translatorCooldownIntervalId = null;
          this.translatorCooldownState = {
            active: false,
            remainingSeconds: 0,
            totalSeconds,
          };
          if (this.dom.statusTranslatorCooldown) {
            this.dom.statusTranslatorCooldown.textContent = 'Ready';
          }
          if (this.dom.statusTranslatorCooldownTimer) {
            this.dom.statusTranslatorCooldownTimer.textContent = '';
          }
          this.updateTranslatorButtonState();
        }
      }, 1000);
    }

    this.updateTranslatorButtonState();
  }

  updateTranslatorButtonState() {
    if (!this.dom.btnCallTranslator) {
      return;
    }

    const isCooldownActive = Boolean(this.translatorCooldownState?.active);
    const hasRemaining = (this.translatorCooldownState?.remainingSeconds || 0) > 0;
    const onCooldown = isCooldownActive && hasRemaining;
    const shouldDisable = !this.lastLocationValid || onCooldown;
    this.dom.btnCallTranslator.disabled = shouldDisable;

    if (shouldDisable) {
      this.dom.btnCallTranslator.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      this.dom.btnCallTranslator.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  handleTranslatorCallEvent(eventData) {
    if (!eventData || typeof eventData !== 'object') {
      return;
    }

    const fallbackRemaining = this.translatorCooldownState?.remainingSeconds || 0;
    const remainingSeconds = Number(eventData.cooldown_remaining_seconds ?? fallbackRemaining) || 0;
    const statusPayload = {
      cooldown_seconds: Number(eventData.cooldown_seconds ?? this.translatorCooldownState?.totalSeconds) || 0,
      cooldown_remaining_seconds: remainingSeconds,
      cooldown_active: remainingSeconds > 0,
    };

    this.updateTranslatorStatusDisplay(statusPayload);

    if (eventData.location) {
      this.feedback.show(
        `Translator request broadcasting for counter ${sanitizeText(eventData.location)}.`,
        { type: 'info', duration: 4000 },
      );
    }
  }

  async handleCallFormSubmit(event) {
    event.preventDefault();
    this.feedback.clear();

    const originalId = this.dom.originalIdInput.value.trim();
    const location = this.dom.locationInput.value.trim();

    if (!Validation.isValidCallIdentifier(originalId)) {
      this.feedback.show('Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).', { type: 'error' });
      this.dom.originalIdInput.focus();
      return;
    }

    if (!Validation.isValidCallLocation(location)) {
      this.feedback.show('Location must be digits only (e.g., 5, 10).', { type: 'error' });
      this.dom.locationInput.focus();
      return;
    }

    if (this.dom.btnCall) {
      this.dom.btnCall.disabled = true;
      this.dom.btnCall.textContent = 'Calling...';
    }

    const payload = {
      original_id: originalId,
      location,
      id: originalId,
      timestamp: new Date().toISOString(),
    };

    const response = await this.apiClient.addCall(payload);

    if (response) {
      const message = typeof response.message === 'string'
        ? response.message
        : `Call request for ${sanitizeText(originalId)} processed.`;
      this.feedback.show(message, { type: 'success' });
      this.dom.originalIdInput.value = '';
      this.dom.originalIdInput.focus();
    } else {
      this.feedback.show(`Failed to process call for ${sanitizeText(originalId)}. Please check the console.`, { type: 'error' });
    }

    if (this.dom.btnCall) {
      this.dom.btnCall.disabled = false;
      this.dom.btnCall.textContent = 'Call Number';
    }

    this.validateInputs();
  }

  async handleForceSkipCall(event) {
    event.preventDefault();
    this.feedback.clear();

    const originalId = this.dom.originalIdInput.value.trim();
    const location = this.dom.locationInput.value.trim();

    if (!Validation.isValidCallIdentifier(originalId)) {
      this.feedback.show('Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).', { type: 'error' });
      this.dom.originalIdInput.focus();
      return;
    }
    if (!Validation.isValidCallLocation(location)) {
      this.feedback.show('Location must be digits only (e.g., 5, 10).', { type: 'error' });
      this.dom.locationInput.focus();
      return;
    }

    if (this.dom.btnSkip) {
      this.dom.btnSkip.disabled = true;
      this.dom.btnSkip.textContent = 'Skipping...';
    }

    const payload = {
      original_id: originalId,
      location,
      id: originalId,
      timestamp: new Date().toISOString(),
    };

    const response = await this.apiClient.forceSkipNewCall(payload);

    if (response) {
      const message = typeof response.message === 'string'
        ? response.message
        : `Force skip request for ${sanitizeText(originalId)} processed.`;
      this.feedback.show(message, { type: 'success' });
      this.dom.originalIdInput.value = '';
      this.dom.originalIdInput.focus();
    } else {
      this.feedback.show(`Failed to skip call ${sanitizeText(originalId)}. Please check the console.`, { type: 'error' });
    }

    if (this.dom.btnSkip) {
      this.dom.btnSkip.disabled = false;
      this.dom.btnSkip.textContent = 'Skip Queue';
    }

    this.validateInputs();
  }

  async handleCallTranslator(event) {
    if (event) {
      event.preventDefault();
    }

    this.feedback.clear();

    const locationValue = this.dom.locationInput?.value?.trim() || '';
    if (!Validation.isValidCallLocation(locationValue)) {
      this.feedback.show('Location must be digits only (e.g., 5, 10).', { type: 'error' });
      this.dom.locationInput?.focus();
      return;
    }

    if (this.dom.btnCallTranslator) {
      this.dom.btnCallTranslator.disabled = true;
      this.dom.btnCallTranslator.textContent = 'Calling translator...';
      this.dom.btnCallTranslator.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const response = await this.apiClient.callTranslator(locationValue);

    if (response && typeof response === 'object') {
      if (response.status) {
        this.updateTranslatorStatusDisplay(response.status);
      }
      if (response.message) {
        this.feedback.show(response.message, { type: 'info' });
      } else {
        this.feedback.show(`Translator request sent for counter ${sanitizeText(locationValue)}.`, { type: 'info' });
      }
    } else {
      console.warn('OperatorUI', 'Translator call response missing payload. Forcing status refresh.');
      const status = await this.apiClient.getTranslatorStatus();
      if (status) {
        this.updateTranslatorStatusDisplay(status);
      }
    }

    if (this.dom.btnCallTranslator) {
      this.dom.btnCallTranslator.textContent = 'Call Translator';
    }

    this.updateTranslatorButtonState();
  }

  async handleManualAnnouncementTrigger(slotId, button) {
    this.feedback.clear();

    const labelSpan = button?.querySelector('.slot-trigger-label');
    const metaSpan = button?.querySelector('.slot-trigger-meta');
    const originalLabel = labelSpan ? labelSpan.textContent : null;
    const originalMeta = metaSpan ? metaSpan.textContent : null;

    if (button) {
      button.disabled = true;
      button.classList.add('opacity-50', 'cursor-not-allowed');
      if (labelSpan) labelSpan.textContent = `Triggering ${slotId}...`;
      if (metaSpan) metaSpan.textContent = 'Please wait';
    }

    const response = await this.apiClient.triggerAnnouncement(slotId);

    if (response) {
      const message = typeof response.message === 'string'
        ? response.message
        : `Announcement '${sanitizeText(slotId)}' trigger requested.`;
      this.feedback.show(message, { type: 'info' });
    }

    setTimeout(() => {
      if (!button || !document.body.contains(button) || !button.disabled) return;
      if (labelSpan && originalLabel) labelSpan.textContent = originalLabel;
      if (metaSpan && originalMeta) metaSpan.textContent = originalMeta;
      button.disabled = false;
      button.classList.remove('opacity-50', 'cursor-not-allowed');
    }, 7000);
  }

  async handleNextAnnouncement() {
    this.feedback.clear();
    if (this.dom.btnNextAnnouncement) {
      this.dom.btnNextAnnouncement.disabled = true;
      this.dom.btnNextAnnouncement.textContent = 'Triggering...';
    }

    const response = await this.apiClient.nextAnnouncement();
    if (response) {
      const message = typeof response.message === 'string' ? response.message : 'Next announcement triggered.';
      this.feedback.show(message, { type: 'info' });
    }

    setTimeout(() => {
      if (!this.dom.btnNextAnnouncement) return;
      if (this.dom.btnNextAnnouncement.disabled && (this.dom.statusAnnouncementCooldown?.textContent !== 'On Cooldown')) {
        this.dom.btnNextAnnouncement.disabled = false;
        this.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
        if (this.lastAnnouncementStatus) {
          const cloned = this.cloneAnnouncementStatus(this.lastAnnouncementStatus);
          if (cloned) {
            cloned.cooldown_active = false;
            cloned.cooldown_remaining_seconds = 0;
            this.renderAnnouncementSlotButtons(cloned);
          }
        }
      } else if (!this.dom.btnNextAnnouncement.disabled) {
        this.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
      }
    }, 7000);
  }

  persistOperatorStationValue() {
    if (!this.dom.locationInput) return;
    try {
      sessionStorage.setItem(OPERATOR_STATION_STORAGE_KEY, this.dom.locationInput.value || '');
    } catch (error) {
      console.warn('OperatorUI', 'Unable to persist operator station value', error);
    }
  }

  restoreOperatorStationValue() {
    try {
      const storedValue = sessionStorage.getItem(OPERATOR_STATION_STORAGE_KEY);
      if (storedValue !== null && this.dom.locationInput && !this.dom.locationInput.value) {
        this.dom.locationInput.value = storedValue;
      }
    } catch (error) {
      console.warn('OperatorUI', 'Unable to restore operator station value', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = new OperatorPage();
  page.init();
});
