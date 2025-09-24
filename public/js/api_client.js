(function (global) {
    'use strict';

    const JSON_CONTENT_TYPE = 'application/json';
    const BASE_URL = (typeof API_BASE_URL === 'string' && API_BASE_URL.length > 0)
        ? API_BASE_URL.replace(/\/$/, '')
        : '/api';

    class ApiClient {
        constructor(baseUrl) {
            this.baseUrl = baseUrl;
        }

        async request(endpoint, options = {}) {
            const method = (options.method || 'GET').toUpperCase();
            const shouldShowProgress = options.showProgress ?? (method !== 'GET');
            const headers = { ...(options.headers || {}) };
            const hasBody = options.body !== undefined && options.body !== null;

            if (hasBody && !headers['Content-Type']) {
                headers['Content-Type'] = JSON_CONTENT_TYPE;
            }

            const config = { method, headers };
            if (hasBody) {
                config.body = typeof options.body === 'string'
                    ? options.body
                    : JSON.stringify(options.body);
            }

            if (shouldShowProgress && typeof showFeedback === 'function') {
                showFeedback('Processing...', 'info', 0);
            }

            try {
                const response = await fetch(`${this.baseUrl}${endpoint}`, config);
                const payload = await this.parseResponse(response);

                if (shouldShowProgress && typeof clearFeedback === 'function') {
                    clearFeedback();
                }

                if (!response.ok) {
                    this.handleError(response, payload);
                    return null;
                }

                return payload;
            } catch (error) {
                if (shouldShowProgress && typeof clearFeedback === 'function') {
                    clearFeedback();
                }
                console.error(`API_CLIENT: Request to ${endpoint} failed:`, error);
                if (typeof showFeedback === 'function') {
                    showFeedback(`Network error: ${error.message || 'Unable to reach server.'}`, 'error');
                }
                return null;
            }
        }

        async parseResponse(response) {
            if (response.status === 204) {
                return { success: true, status: 204 };
            }

            const text = await response.text();
            if (!text) {
                return { success: response.ok, status: response.status };
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes(JSON_CONTENT_TYPE)) {
                try {
                    return JSON.parse(text);
                } catch (error) {
                    console.warn('API_CLIENT: Failed to parse JSON response:', error, text);
                    return text;
                }
            }

            if (response.status === 202) {
                return { success: response.ok, status: response.status, message: text };
            }

            return text;
        }

        handleError(response, payload) {
            const message = this.extractErrorMessage(payload, response);
            console.error(`API_CLIENT: API error ${response.status} ${response.statusText || ''} → ${message}`.trim());
            if (typeof showFeedback === 'function') {
                showFeedback(`Error ${response.status}: ${message}`, 'error');
            }
        }

        extractErrorMessage(payload, response) {
            if (payload == null) {
                return response.statusText || `Request failed with status ${response.status}`;
            }
            if (typeof payload === 'string') {
                return payload;
            }
            if (typeof payload === 'object') {
                return payload.error || payload.message || JSON.stringify(payload);
            }
            return response.statusText || `Request failed with status ${response.status}`;
        }

        get(endpoint, options = {}) {
            return this.request(endpoint, {
                ...options,
                method: 'GET',
                showProgress: options.showProgress ?? false,
            });
        }

        post(endpoint, body, options = {}) {
            return this.request(endpoint, {
                ...options,
                method: 'POST',
                body,
                showProgress: options.showProgress ?? true,
            });
        }

        addCall(callData) {
            return this.post('/queue/add', callData);
        }

        skipCall() {
            return this.post('/queue/skip');
        }

        getQueueState() {
            return this.get('/queue/state');
        }

        completeCurrentCall() {
            return this.post('/queue/complete');
        }

        forceSkipNewCall(callData) {
            return this.post('/queue/force_skip', callData);
        }

        nextAnnouncement() {
            return this.post('/announcements/next');
        }

        triggerAnnouncement(slotId) {
            const encoded = encodeURIComponent(slotId);
            return this.post(`/announcements/trigger/${encoded}`);
        }

        getAnnouncementStatus() {
            return this.get('/announcements/status');
        }

        getLanguages() {
            return this.get('/tts/languages');
        }

        getOrderedSupportedLanguages() {
            return this.get('/tts/ordered-languages');
        }

        triggerTTS(ttsData) {
            return this.post('/tts/trigger', ttsData);
        }
    }

    global.apiClient = new ApiClient(BASE_URL);
})(window);
