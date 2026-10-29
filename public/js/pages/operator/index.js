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

export class OperatorPage {
  constructor() {
    this.dom = this.queryDom();
    this.feedback = createFeedbackController({ elementId: this.dom.feedbackArea });
    this.apiClient = new QueueApiClient({ baseUrl: API_BASE_URL, feedback: this.feedback });
    this.eventStream = new EventStream(SSE_URL, { labelProvider: () => getLabels('en') });
    this.cooldownIntervalId = null;
    this.lastAnnouncementStatus = null;
    this.announcementStatusVersion = 0;
    this.queueStatusVersion = 0;
    this.translatorStatusVersion = 0;
    this.autoRefreshCleanup = () => { };
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
      originalIdLabel: document.querySelector('label[for="call-original-id"]'),
      originalIdInput: byId('call-original-id'),
      locationInput: byId('call-location'),
      btnCall: byId('btn-call'),
      btnCallTranslator: byId('btn-call-translator'),
      statusCurrentCallId: byId('status-current-call-id'),
      statusCurrentCallLocation: byId('status-current-call-location'),
      listHistoryCalls: byId('list-history-calls'),
      statusAnnouncementSlot: byId('status-announcement-slot'),
      statusAnnouncementCooldown: byId('status-announcement-cooldown'),
      statusAnnouncementCooldownTimer: byId('status-announcement-cooldown-timer'),
      btnNextAnnouncement: byId('btn-next-announcement'),
      btnToggleAnnouncements: byId('btn-toggle-announcements'),
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
      listHistoryCalls: this.dom.listHistoryCalls,
      statusCurrentCallId: this.dom.statusCurrentCallId,
      statusCurrentCallLocation: this.dom.statusCurrentCallLocation,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error('OperatorUI', 'Missing required DOM elements:', missing.join(', '));
      if (this.dom.btnCall) this.dom.btnCall.disabled = true;
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
    this.updateAnnouncementStatusDisplay(null);
    this.applyIdentifierRules(true);
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

        target.value = Validation.sanitizeCallIdentifierInput(target.value);
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

  applyIdentifierRules(identifierPrefixRequired = Validation.isQueueIdentifierPrefixRequired()) {
    const prefixRequired = Validation.setQueueIdentifierPrefixRequired(identifierPrefixRequired);

    if (this.dom.originalIdLabel) {
      this.dom.originalIdLabel.textContent = prefixRequired
        ? 'Identifier (e.g., A1, B12)'
        : 'Identifier (digits only, e.g., 1, 99)';
    }

    if (this.dom.originalIdInput) {
      this.dom.originalIdInput.placeholder = prefixRequired ? 'A1' : '1';
      this.dom.originalIdInput.title = Validation.getCallIdentifierValidationMessage();
      this.dom.originalIdInput.pattern = prefixRequired ? '[A-Za-z][0-9]+' : '[0-9]+';
      this.dom.originalIdInput.autocapitalize = prefixRequired ? 'characters' : 'off';
      this.dom.originalIdInput.inputMode = prefixRequired ? 'text' : 'numeric';
      this.dom.originalIdInput.value = Validation.sanitizeCallIdentifierInput(this.dom.originalIdInput.value);
    }

    this.validateInputs();
  }

  attachEventHandlers() {
    const { callForm, btnNextAnnouncement, btnCallTranslator, originalIdInput, locationInput } = this.dom;

    if (callForm) {
      callForm.addEventListener('submit', (event) => this.handleCallFormSubmit(event));
    }

    this.dom.btnToggleAnnouncements?.addEventListener('click', async () => {
      this.dom.btnToggleAnnouncements.disabled = true;
      await this.refreshAnnouncementStatus(this.apiClient.setAnnouncementsEnabled(!this.lastAnnouncementStatus?.enabled));
    });

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
      this.queueStatusVersion += 1;
      this.updateQueueStatusDisplay(detail);
    });

    this.eventStream.on('announcementstatus', ({ detail }) => {
      this.announcementStatusVersion += 1;
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
      if (detail.status === 'connected') this.fetchInitialState();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.eventStream.eventSource) {
        this.eventStream.connect();
      }
    });

    this.eventStream.connect();
  }

  async fetchInitialState() {
    const queueVersion = ++this.queueStatusVersion;
    const translatorVersion = ++this.translatorStatusVersion;
    const labels = getLabels();
    this.feedback.show(labels.loading, { type: 'info', duration: 0 });

    const [queueResult, announcementResult, translatorResult] = await Promise.allSettled([
      this.apiClient.getQueueState(),
      this.refreshAnnouncementStatus(),
      this.apiClient.getTranslatorStatus(),
    ]);

    this.feedback.clear();

    if (queueVersion === this.queueStatusVersion) {
      if (queueResult.status === 'fulfilled' && queueResult.value) {
        this.updateQueueStatusDisplay(queueResult.value);
      } else {
        this.feedback.show('Failed to load queue state. Waiting for live updates.', { type: 'warning', duration: 5000 });
      }
    }

    if (announcementResult.status !== 'fulfilled' || !announcementResult.value) {
      this.feedback.show('Failed to load announcement status. Waiting for live updates.', { type: 'warning', duration: 5000 });
    }

    if (translatorVersion !== this.translatorStatusVersion) return;
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

    this.lastLocationValid = isLocationValid;
    this.updateTranslatorButtonState();
  }

  updateQueueStatusDisplay(queueState) {
    const labels = getLabels();
    if (typeof queueState?.identifier_prefix_required === 'boolean') {
      this.applyIdentifierRules(queueState.identifier_prefix_required);
    }
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
      itemClass: 'flex justify-between items-center py-2 text-lg',
      placeholderClass: 'italic',
      highlightClass: 'text-yellow-400',
      reverse: true,
    });
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

    const cooldownActive = !announcementStatus.enabled || Boolean(announcementStatus.cooldown_active);
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

  async refreshAnnouncementStatus(request = this.apiClient.getAnnouncementStatus()) {
    const version = ++this.announcementStatusVersion;
    const status = await request;
    // A newer request or live event supersedes this response; cooldown ticks do not.
    if (version === this.announcementStatusVersion) {
      this.updateAnnouncementStatusDisplay(status || this.lastAnnouncementStatus);
    }
    return status;
  }

  updateAnnouncementStatusDisplay(status) {
    clearTimeout(this.cooldownIntervalId);
    this.cooldownIntervalId = null;
    this.lastAnnouncementStatus = status;

    const enabled = Boolean(status?.enabled);
    const remaining = Number(status?.cooldown_remaining_seconds) || 0;
    const ready = enabled && remaining === 0 && status.available_slots?.length > 0;
    if (this.dom.btnToggleAnnouncements) {
      this.dom.btnToggleAnnouncements.disabled = !status;
      this.dom.btnToggleAnnouncements.textContent = enabled ? 'Turn Announcements Off' : 'Turn Announcements On';
      this.dom.btnToggleAnnouncements.setAttribute('aria-pressed', String(enabled));
    }
    if (this.dom.statusAnnouncementSlot) {
      this.dom.statusAnnouncementSlot.textContent = status?.current_slot_id || 'N/A';
    }
    if (this.dom.statusAnnouncementCooldown) {
      this.dom.statusAnnouncementCooldown.textContent = !status ? 'Unknown' : !enabled ? 'Off' : remaining > 0 ? 'On Cooldown' : 'Ready';
    }
    if (this.dom.statusAnnouncementCooldownTimer) {
      this.dom.statusAnnouncementCooldownTimer.textContent = enabled && remaining > 0 ? `(${remaining}s)` : '';
    }
    if (this.dom.btnNextAnnouncement) {
      this.dom.btnNextAnnouncement.disabled = !ready;
      this.dom.btnNextAnnouncement.classList.toggle('opacity-50', !ready);
      this.dom.btnNextAnnouncement.classList.toggle('cursor-not-allowed', !ready);
      this.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
    }
    this.renderAnnouncementSlotButtons(status);
    if (enabled && remaining > 0) {
      this.cooldownIntervalId = setTimeout(() => this.updateAnnouncementStatusDisplay({
        ...status,
        cooldown_active: remaining > 1,
        cooldown_remaining_seconds: remaining - 1,
      }), 1000);
    }
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
    this.translatorStatusVersion += 1;
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
      this.feedback.show(Validation.getCallIdentifierValidationMessage(), { type: 'error' });
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
    if (button) button.disabled = true;
    const response = await this.apiClient.triggerAnnouncement(slotId);
    if (response) this.feedback.show(response.message || `Announcement '${slotId}' triggered.`, { type: 'info' });
    await this.refreshAnnouncementStatus();
  }

  async handleNextAnnouncement() {
    if (this.dom.btnNextAnnouncement) this.dom.btnNextAnnouncement.disabled = true;
    const response = await this.apiClient.nextAnnouncement();
    if (response) this.feedback.show(response.message || 'Next announcement triggered.', { type: 'info' });
    await this.refreshAnnouncementStatus();
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
