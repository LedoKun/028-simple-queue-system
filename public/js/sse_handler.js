// public/js/sse_handler.js
(function () {
    const ssePath = (typeof SSE_URL !== 'undefined' ? SSE_URL : '/api/events');
    let eventSource = null;
    let reconnectionAttempts = 0;
    const MAX_QUICK_RECONNECTION_ATTEMPTS = 3;
    const SHORT_RETRY_DELAY_MS = 3000;
    const MEDIUM_RETRY_DELAY_MS = 10000;
    const LONG_RETRY_DELAY_MS = 30000;
    let currentRetryDelay = SHORT_RETRY_DELAY_MS;
    let retryTimeoutId = null;

    function dispatchSseStatus(statusKey, detailedMessage = null) {
        const lang = window.currentGlobalLanguage || 'en';
        const labels = (typeof UI_TEXT !== 'undefined' && UI_TEXT[lang])
            ? UI_TEXT[lang]
            : {
                connecting: 'Connecting...',
                connected: 'Connected',
                disconnected: 'Disconnected',
                error: 'Error'
            };
        const message = labels[statusKey] || statusKey;
        console.log(`SSE_HANDLER: status → '${statusKey}'`, message, detailedMessage);
        document.dispatchEvent(new CustomEvent('sse_status', {
            detail: { status: statusKey, message, detail: detailedMessage }
        }));
    }

    function scheduleReconnect() {
        reconnectionAttempts++;
        dispatchSseStatus('disconnected', `Attempt ${reconnectionAttempts}, retry in ${currentRetryDelay}ms`);
        if (retryTimeoutId) clearTimeout(retryTimeoutId);
        retryTimeoutId = setTimeout(initializeSSE, currentRetryDelay);

        if (reconnectionAttempts <= MAX_QUICK_RECONNECTION_ATTEMPTS) {
            currentRetryDelay = SHORT_RETRY_DELAY_MS;
        } else if (reconnectionAttempts <= 2 * MAX_QUICK_RECONNECTION_ATTEMPTS) {
            currentRetryDelay = MEDIUM_RETRY_DELAY_MS;
        } else {
            currentRetryDelay = LONG_RETRY_DELAY_MS;
        }
    }

    function handleSseFrame(event) {
        console.log(`SSE_HANDLER (Event type: '${event.type}'): raw data:`, event.data);
        if (!event.data || event.data.startsWith(':')) return;

        let parsedPayload;
        let eventKeyForDispatch;

        try {
            const fullParsedData = JSON.parse(event.data); // e.g., {"type":"TTSComplete","data":{"id":"F01",...}}

            if (fullParsedData && typeof fullParsedData.type === 'string') {
                eventKeyForDispatch = fullParsedData.type.toLowerCase();

                // Prioritize using the "data" field if it exists, as logs show TTSComplete uses it.
                if (fullParsedData.data !== undefined) {
                    parsedPayload = fullParsedData.data;
                }
                // Fallback for genuinely flat structures (e.g., if TTSComplete *could* be flat sometimes,
                // or for other event types that are flat).
                else if (fullParsedData.type === "TTSComplete") {
                    console.warn("SSE_HANDLER: TTSComplete event received without a 'data' field, using top-level fields.");
                    const { type, ...ttsActualPayload } = fullParsedData;
                    parsedPayload = ttsActualPayload;
                } else {
                    // For other flat structures without a "data" field
                    console.warn(`SSE_HANDLER: Event type '${fullParsedData.type}' is flat and not TTSComplete or lacking 'data'. Using top-level fields excluding 'type'.`);
                    const { type, ...fallbackPayload } = fullParsedData;
                    parsedPayload = fallbackPayload;
                }

            } else {
                console.error("SSE_HANDLER: JSON parse error or missing 'type' field in SSE data:", event.data);
                return;
            }

        } catch (err) {
            console.error("SSE_HANDLER: JSON parse error:", err, "\nraw data:", event.data);
            return;
        }

        if (typeof parsedPayload === 'undefined') { // Check if parsedPayload is actually undefined
            console.error(`SSE_HANDLER: Parsed payload is undefined for event key '${eventKeyForDispatch}'. Original data:`, event.data);
            return;
        }

        const customEventName = `sse_${eventKeyForDispatch}`;
        console.log(`SSE_HANDLER: Dispatching DOM event '${customEventName}' with payload:`, parsedPayload);
        document.dispatchEvent(new CustomEvent(customEventName, { detail: parsedPayload }));
    }

    function initializeSSE() {
        if (eventSource &&
            (eventSource.readyState === EventSource.OPEN ||
                eventSource.readyState === EventSource.CONNECTING)
        ) {
            return;
        }

        dispatchSseStatus('connecting');
        console.log(`SSE_HANDLER: Connecting to ${ssePath}…`);

        try {
            eventSource = new EventSource(ssePath);
        } catch (err) {
            console.error("SSE_HANDLER: Failed to create EventSource:", err);
            scheduleReconnect();
            return;
        }

        eventSource.onopen = () => {
            console.info("SSE_HANDLER: Connection established.");
            reconnectionAttempts = 0;
            currentRetryDelay = SHORT_RETRY_DELAY_MS;
            if (retryTimeoutId) {
                clearTimeout(retryTimeoutId);
                retryTimeoutId = null;
            }
            dispatchSseStatus('connected');
        };

        eventSource.onmessage = (event) => {
            console.warn("SSE_HANDLER: Received unnamed message. Backend should ideally send named events.", event);
            // Attempt to process if it looks like our structured event data
            try {
                const jsonData = JSON.parse(event.data);
                if (jsonData && jsonData.type) {
                    // Create a mock event object that handleSseFrame can process
                    const mockEvent = {
                        type: jsonData.type.toLowerCase(), // Use internal type for event listener matching if needed
                        data: event.data // Pass raw data for handleSseFrame to re-parse
                    };
                    handleSseFrame(mockEvent);
                } else {
                    console.log("SSE_HANDLER: Unnamed message does not conform to expected structure (missing type):", event.data);
                }
            } catch (e) {
                console.error("SSE_HANDLER: Error parsing unnamed message data:", e, event.data);
            }
        };

        eventSource.addEventListener('queue_update', handleSseFrame);
        eventSource.addEventListener('announcement_status', handleSseFrame);
        eventSource.addEventListener('tts_complete', handleSseFrame);

        eventSource.onerror = (err) => {
            console.error("SSE_HANDLER: Connection error:", err);
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            scheduleReconnect();
        };
    }

    if (typeof window.currentGlobalLanguage === 'undefined') {
        window.currentGlobalLanguage = 'en';
    }

    document.addEventListener('DOMContentLoaded', () => {
        console.log("SSE_HANDLER: DOM ready, initializing SSE connection in 100ms.");
        setTimeout(initializeSSE, 100);
    });
})();