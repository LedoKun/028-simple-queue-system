import { getLabels } from '../core/constants.js';

const MAX_QUICK_RECONNECTION_ATTEMPTS = 3;
const SHORT_RETRY_DELAY_MS = 3000;
const MEDIUM_RETRY_DELAY_MS = 10000;
const LONG_RETRY_DELAY_MS = 30000;
const HEARTBEAT_IDLE_THRESHOLD_MS = 30000; // assume backend keeps events fairly frequent

class EventStream {
  constructor(url, { labelProvider = getLabels, heartbeatMs = HEARTBEAT_IDLE_THRESHOLD_MS } = {}) {
    this.url = url;
    this.labelProvider = labelProvider;
    this.heartbeatMs = heartbeatMs;

    this.eventSource = null;
    this.reconnectionAttempts = 0;
    this.currentRetryDelay = SHORT_RETRY_DELAY_MS;
    this.retryTimeoutId = null;
    this.heartbeatTimerId = null;
    this.lastActivityAt = Date.now();
    this.lastStatus = null;
    this.lastStatusMessage = null;
    this.listeners = new Map();

    this.handleNamedEvent = this.handleNamedEvent.bind(this);
    this.handleOnMessage = this.handleOnMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleNetworkOnline = this.handleNetworkOnline.bind(this);
    this.handleNetworkOffline = this.handleNetworkOffline.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkOnline);
      window.addEventListener('offline', this.handleNetworkOffline);
    }
  }

  on(eventName, handler) {
    const normalized = String(eventName);
    if (!this.listeners.has(normalized)) {
      this.listeners.set(normalized, new Set());
    }
    const handlers = this.listeners.get(normalized);
    handlers.add(handler);
    return () => this.off(normalized, handler);
  }

  off(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit(eventName, detail) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        handler({ detail });
      } catch (error) {
        console.error('EventStream', `Listener for "${eventName}" failed`, error);
      }
    });
  }

  connect() {
    if (typeof window !== 'undefined' && !('EventSource' in window)) {
      this.setStatus('unsupported', {
        message: 'Live updates not supported in this browser.',
      });
      return;
    }

    if (this.eventSource && (this.eventSource.readyState === EventSource.OPEN || this.eventSource.readyState === EventSource.CONNECTING)) {
      return;
    }

    this.clearRetryTimer();
    this.ensureHeartbeatTimer();
    this.setStatus('connecting');
    this.lastActivityAt = Date.now();

    try {
      this.eventSource = new EventSource(this.url);
    } catch (error) {
      console.error('EventStream', 'Failed to create EventSource instance', error);
      this.setStatus('disconnected', { detail: error });
      this.scheduleReconnect();
      return;
    }

    this.eventSource.onopen = () => {
      this.lastActivityAt = Date.now();
      this.reconnectionAttempts = 0;
      this.currentRetryDelay = SHORT_RETRY_DELAY_MS;
      this.markActivity();
    };

    this.eventSource.onmessage = this.handleOnMessage;
    this.eventSource.addEventListener('queue_update', this.handleNamedEvent);
    this.eventSource.addEventListener('announcement_status', this.handleNamedEvent);
    this.eventSource.addEventListener('tts_complete', this.handleNamedEvent);
    this.eventSource.addEventListener('translator_call', this.handleNamedEvent);
    this.eventSource.onerror = this.handleError;
  }

  disconnect() {
    this.clearRetryTimer();
    this.clearHeartbeatTimer();
    this.closeSource();
  }

  destroy() {
    this.disconnect();
    this.listeners.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkOnline);
      window.removeEventListener('offline', this.handleNetworkOffline);
    }
  }

  handleNamedEvent(event) {
    this.processFrame({ data: event.data, type: event.type });
  }

  handleOnMessage(event) {
    this.processFrame({ data: event.data, type: event.type });
  }

  handleError(event) {
    const readyState = this.eventSource?.readyState;
    const detail = event instanceof Event ? { type: event.type } : event;

    if (readyState === EventSource.CLOSED) {
      this.setStatus('disconnected', { detail });
    } else {
      // Treat transient errors as connecting to avoid flashing red UI for automatic retries.
      this.setStatus('connecting', { detail });
    }

    this.closeSource();
    this.scheduleReconnect();
  }

  handleNetworkOnline() {
    if (!this.eventSource) {
      this.connect();
    }
  }

  handleNetworkOffline() {
    this.setStatus('disconnected', { message: 'Offline — waiting for connection…' });
    this.closeSource();
  }

  processFrame(event) {
    if (!event || !event.data) {
      return;
    }

    if (typeof event.data === 'string' && event.data.startsWith(':')) {
      return;
    }

    let parsedPayload;
    let eventKey;

    try {
      const payload = JSON.parse(event.data);
      const rawType = payload.type || event.type || '';
      eventKey = this.normalizeType(rawType);

      if (!eventKey) {
        console.warn('EventStream', 'Received payload without a recognizable type', payload);
        return;
      }

      if (payload.data !== undefined) {
        parsedPayload = payload.data;
      } else {
        const { type: _unused, ...rest } = payload;
        parsedPayload = rest;
      }
    } catch (error) {
      console.error('EventStream', 'Unable to parse SSE payload', error, event.data);
      return;
    }

    this.markActivity();
    this.emit(eventKey, parsedPayload);
  }

  scheduleReconnect() {
    this.reconnectionAttempts += 1;

    const labels = this.labelProvider();
    const seconds = this.currentRetryDelay / 1000;

    const shouldSignalDisconnected = this.reconnectionAttempts > MAX_QUICK_RECONNECTION_ATTEMPTS;
    const statusKey = shouldSignalDisconnected ? 'disconnected' : 'connecting';
    const defaultMessage = shouldSignalDisconnected ? labels.disconnected : labels.connecting;
    const message = `${defaultMessage || statusKey} (${seconds}s)`;

    this.setStatus(statusKey, { message });

    this.clearRetryTimer();
    this.retryTimeoutId = setTimeout(() => {
      this.connect();
    }, this.currentRetryDelay);

    if (this.reconnectionAttempts <= MAX_QUICK_RECONNECTION_ATTEMPTS) {
      this.currentRetryDelay = SHORT_RETRY_DELAY_MS;
    } else if (this.reconnectionAttempts <= MAX_QUICK_RECONNECTION_ATTEMPTS * 2) {
      this.currentRetryDelay = MEDIUM_RETRY_DELAY_MS;
    } else {
      this.currentRetryDelay = LONG_RETRY_DELAY_MS;
    }
  }

  setStatus(statusKey, { message, detail } = {}) {
    if (!statusKey) return;

    if (statusKey === this.lastStatus && !message && !detail) {
      return;
    }

    const labels = this.labelProvider();
    const resolvedMessage = message || labels[statusKey] || statusKey;

    if (statusKey === this.lastStatus && resolvedMessage === this.lastStatusMessage) {
      return;
    }

    this.lastStatus = statusKey;
    this.lastStatusMessage = resolvedMessage;
    this.emit('status', { status: statusKey, message: resolvedMessage, detail });
  }

  ensureHeartbeatTimer() {
    if (this.heartbeatMs <= 0 || this.heartbeatTimerId) {
      return;
    }
    this.heartbeatTimerId = setInterval(() => {
      this.syncStatusWithReadyState();
    }, Math.max(2000, Math.floor(this.heartbeatMs / 2)));
  }

  clearRetryTimer() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  clearHeartbeatTimer() {
    if (this.heartbeatTimerId) {
      clearInterval(this.heartbeatTimerId);
      this.heartbeatTimerId = null;
    }
  }

  closeSource() {
    if (!this.eventSource) return;
    try {
      this.eventSource.close();
    } catch (error) {
      console.warn('EventStream', 'Error while closing EventSource', error);
    }
    this.eventSource = null;
  }

  normalizeType(type) {
    if (!type) return '';
    return String(type).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  markActivity() {
    this.lastActivityAt = Date.now();
    if (this.eventSource?.readyState === EventSource.OPEN) {
      this.setStatus('connected');
    }
  }

  syncStatusWithReadyState() {
    if (!this.eventSource) {
      return;
    }

    const readyState = this.eventSource.readyState;
    if (readyState === EventSource.OPEN) {
      this.setStatus('connected');
      return;
    }

    if (readyState === EventSource.CONNECTING) {
      this.setStatus('connecting');
      return;
    }

    if (readyState === EventSource.CLOSED) {
      this.setStatus('disconnected');
      if (!this.retryTimeoutId) {
        this.scheduleReconnect();
      }
    }
  }
}

export { EventStream };
