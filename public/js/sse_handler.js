// public/js/sse_handler.js

/**
 * @file This script is responsible for establishing and maintaining a
 * Server-Sent Events (SSE) connection to the backend. It handles connection
 * attempts, automatic reconnections with exponential backoff, and parsing
 * incoming SSE messages. It then dispatches these messages as custom DOM events
 * for other frontend scripts to consume.
 * @author LedoKun <romamp100@gmail.com>
 * @version 1.0.0
 */

// An Immediately Invoked Function Expression (IIFE) is used to create a private scope
// for all variables and functions within this script, preventing them from polluting
// the global namespace.
(function () {
    // --- Constants and State Variables ---

    /**
     * The URL for the SSE endpoint. Defaults to '/api/events' if SSE_URL is not defined
     * (e.g., if common.js isn't loaded or doesn't define it).
     * @type {string}
     */
    const ssePath = (typeof SSE_URL !== 'undefined' ? SSE_URL : '/api/events');

    /**
     * The `EventSource` instance used for the SSE connection.
     * @type {EventSource|null}
     */
    let eventSource = null;

    /**
     * Counter for reconnection attempts. Used to implement exponential backoff.
     * @type {number}
     */
    let reconnectionAttempts = 0;

    /**
     * Maximum number of quick reconnection attempts before switching to longer delays.
     * @type {number}
     */
    const MAX_QUICK_RECONNECTION_ATTEMPTS = 3;

    /**
     * Short delay (in milliseconds) for initial reconnection attempts.
     * @type {number}
     */
    const SHORT_RETRY_DELAY_MS = 3000; // 3 seconds

    /**
     * Medium delay (in milliseconds) for subsequent reconnection attempts.
     * @type {number}
     */
    const MEDIUM_RETRY_DELAY_MS = 10000; // 10 seconds

    /**
     * Longest delay (in milliseconds) for repeated reconnection attempts.
     * @type {number}
     */
    const LONG_RETRY_DELAY_MS = 30000; // 30 seconds

    /**
     * The current delay (in milliseconds) to wait before the next reconnection attempt.
     * Adjusts based on `reconnectionAttempts`.
     * @type {number}
     */
    let currentRetryDelay = SHORT_RETRY_DELAY_MS;

    /**
     * Stores the ID of the `setTimeout` call for scheduling reconnections,
     * allowing it to be cleared if a connection is established earlier.
     * @type {number|null}
     */
    let retryTimeoutId = null;

    // --- Utility Functions ---

    /**
     * Dispatches a custom DOM event (`sse_status`) to notify other parts of the UI
     * about the SSE connection status.
     *
     * @param {string} statusKey - A key representing the connection status (e.g., 'connecting', 'connected', 'disconnected', 'error').
     * @param {string|null} [detailedMessage=null] - An optional, more specific message to include.
     */
    function dispatchSseStatus(statusKey, detailedMessage = null) {
        // Fallback to 'en' if window.currentGlobalLanguage is not set.
        const lang = window.currentGlobalLanguage || 'en';
        // Retrieve localized status labels from `UI_TEXT` (from common.js).
        // Provide a basic fallback if UI_TEXT itself isn't loaded.
        const labels = (typeof UI_TEXT !== 'undefined' && UI_TEXT[lang])
            ? UI_TEXT[lang]
            : {
                connecting: 'Connecting...',
                connected: 'Connected',
                disconnected: 'Disconnected',
                error: 'Error'
            };
        const message = labels[statusKey] || statusKey; // Use localized message or status key itself.

        console.log(`SSE_HANDLER: Status change → '${statusKey}' - Message: '${message}'`, detailedMessage ? `Details: '${detailedMessage}'` : '');
        // Dispatch a custom event on the `document` object.
        // Other scripts (like `operator_ui.js` or `signage_ui.js`) can listen for 'sse_status'.
        document.dispatchEvent(new CustomEvent('sse_status', {
            detail: { status: statusKey, message, detail: detailedMessage }
        }));
    }

    /**
     * Schedules a reconnection attempt after a calculated delay.
     * Implements an exponential backoff strategy for retries.
     * @private
     */
    function scheduleReconnect() {
        reconnectionAttempts++;
        dispatchSseStatus('disconnected', `Attempt ${reconnectionAttempts}, retrying in ${currentRetryDelay / 1000} seconds.`);

        // Clear any existing retry timeout to avoid multiple concurrent reconnections.
        if (retryTimeoutId) clearTimeout(retryTimeoutId);
        // Schedule the next reconnection attempt.
        retryTimeoutId = setTimeout(initializeSSE, currentRetryDelay);

        // Adjust the retry delay for the next attempt based on the number of attempts.
        if (reconnectionAttempts <= MAX_QUICK_RECONNECTION_ATTEMPTS) {
            currentRetryDelay = SHORT_RETRY_DELAY_MS; // Use short delay for initial attempts.
        } else if (reconnectionAttempts <= 2 * MAX_QUICK_RECONNECTION_ATTEMPTS) {
            currentRetryDelay = MEDIUM_RETRY_DELAY_MS; // Switch to medium delay.
        } else {
            currentRetryDelay = LONG_RETRY_DELAY_MS; // Use long delay for persistent issues.
        }
        console.warn(`SSE_HANDLER: Connection lost. Reconnection attempt ${reconnectionAttempts}. Next retry in ${currentRetryDelay / 1000}s.`);
    }

    /**
     * Handles incoming SSE messages (frames) from the backend.
     * Parses the JSON payload and dispatches a specific custom DOM event
     * based on the `type` field within the payload.
     *
     * Expected backend payload format: `{"type": "EventType", "data": { ... }}`
     *
     * @param {MessageEvent} event - The `MessageEvent` received from the `EventSource`.
     * @private
     */
    function handleSseFrame(event) {
        console.log(`SSE_HANDLER (Event type: '${event.type || 'unnamed'}'): Raw data:`, event.data);
        // Ignore comment-only messages (start with ':') used for keep-alives.
        if (!event.data || event.data.startsWith(':')) {
            console.debug("SSE_HANDLER: Ignoring comment or empty data frame.");
            return;
        }

        let parsedPayload;
        let eventKeyForDispatch;

        try {
            const fullParsedData = JSON.parse(event.data); // Attempt to parse the full JSON string.

            // Ensure the parsed data has a `type` field, which is crucial for event dispatching.
            if (fullParsedData && typeof fullParsedData.type === 'string') {
                eventKeyForDispatch = fullParsedData.type.toLowerCase(); // Convert type to lowercase for custom event naming.

                // If a `data` field exists, it contains the actual event payload.
                if (fullParsedData.data !== undefined) {
                    parsedPayload = fullParsedData.data;
                    console.debug(`SSE_HANDLER: Extracted data field for event type '${fullParsedData.type}'.`);
                }
                // Fallback: If `data` field is missing, but it's a known event type (like TTSComplete)
                // that might historically have been flat, use the top-level fields.
                else if (fullParsedData.type === "TTSComplete") {
                    console.warn("SSE_HANDLER: 'TTSComplete' event received without a 'data' field. Using top-level fields as payload.");
                    // Destructure to exclude `type` itself from the payload.
                    const { type, ...ttsActualPayload } = fullParsedData;
                    parsedPayload = ttsActualPayload;
                } else {
                    // Generic fallback for any other flat structured events that might lack a `data` field.
                    console.warn(`SSE_HANDLER: Event type '${fullParsedData.type}' is flat and not 'TTSComplete' or lacking 'data' field. Using top-level fields excluding 'type'.`);
                    const { type, ...fallbackPayload } = fullParsedData;
                    parsedPayload = fallbackPayload;
                }

            } else {
                console.error("SSE_HANDLER: JSON parse error or missing 'type' field in SSE data:", event.data);
                return; // Stop processing if essential data is missing.
            }

        } catch (err) {
            // Catch and log any JSON parsing errors.
            console.error("SSE_HANDLER: JSON parse error:", err, "\nRaw data:", event.data);
            return; // Stop processing on parse error.
        }

        // Final check to ensure `parsedPayload` is defined before dispatching.
        if (typeof parsedPayload === 'undefined') {
            console.error(`SSE_HANDLER: Parsed payload is undefined for event key '${eventKeyForDispatch}'. Original data:`, event.data);
            return;
        }

        // Construct the custom event name (e.g., 'sse_queueupdate', 'sse_announcementstatus').
        const customEventName = `sse_${eventKeyForDispatch}`;
        console.log(`SSE_HANDLER: Dispatching custom DOM event '${customEventName}' with payload:`, parsedPayload);
        // Dispatch the custom event on the `document` object.
        // Other scripts listen for these specific events (e.g., `document.addEventListener('sse_queueupdate', ...)`).
        document.dispatchEvent(new CustomEvent(customEventName, { detail: parsedPayload }));
    }

    // --- SSE Connection Management ---

    /**
     * Initializes or re-initializes the Server-Sent Events connection.
     * Prevents multiple connections if one is already active or connecting.
     * @private
     */
    function initializeSSE() {
        // Prevent re-connecting if an EventSource is already open or trying to connect.
        if (eventSource &&
            (eventSource.readyState === EventSource.OPEN ||
                eventSource.readyState === EventSource.CONNECTING)
        ) {
            console.debug("SSE_HANDLER: EventSource already open or connecting. Skipping new connection attempt.");
            return;
        }

        dispatchSseStatus('connecting', UI_TEXT[window.currentGlobalLanguage].connecting);
        console.log(`SSE_HANDLER: Attempting to connect to SSE endpoint: ${ssePath}…`);

        try {
            // Create a new EventSource instance. This initiates the connection.
            eventSource = new EventSource(ssePath);
        } catch (err) {
            console.error("SSE_HANDLER: Failed to create EventSource instance. This usually indicates a browser or URL issue:", err);
            // If EventSource creation fails, schedule a reconnect.
            scheduleReconnect();
            return;
        }

        /**
         * Event listener for successful SSE connection establishment.
         * Resets retry counters and dispatches 'connected' status.
         * @private
         */
        eventSource.onopen = () => {
            console.info("SSE_HANDLER: Connection established successfully.");
            reconnectionAttempts = 0; // Reset attempts on successful connection.
            currentRetryDelay = SHORT_RETRY_DELAY_MS; // Reset delay to short.
            // Clear any pending reconnection timeout.
            if (retryTimeoutId) {
                clearTimeout(retryTimeoutId);
                retryTimeoutId = null;
            }
            dispatchSseStatus('connected', UI_TEXT[window.currentGlobalLanguage].connected);
        };

        /**
         * Event listener for "unnamed" SSE messages (events without an `event:` field).
         * While the backend should ideally send named events, this attempts to parse
         * and dispatch them if they conform to the expected JSON structure.
         * @param {MessageEvent} event - The `MessageEvent` object.
         * @private
         */
        eventSource.onmessage = (event) => {
            console.warn("SSE_HANDLER: Received unnamed message. Backend should ideally send named events for explicit event types.", event);
            try {
                const jsonData = JSON.parse(event.data);
                // If the unnamed message contains our structured type, process it.
                if (jsonData && jsonData.type) {
                    console.debug(`SSE_HANDLER: Unnamed message parsed as type '${jsonData.type}'. Processing...`);
                    // Create a mock event object for `handleSseFrame` to process consistently.
                    const mockEvent = {
                        type: jsonData.type.toLowerCase(), // Use internal type for custom event matching.
                        data: event.data // Pass raw data for `handleSseFrame` to re-parse.
                    };
                    handleSseFrame(mockEvent);
                } else {
                    console.log("SSE_HANDLER: Unnamed message does not conform to expected structure (missing 'type' field):", event.data);
                }
            } catch (e) {
                console.error("SSE_HANDLER: Error parsing unnamed message data:", e, event.data);
            }
        };

        // Add specific event listeners for named SSE events.
        // These events are triggered by the backend's `Event::data().event()` calls.
        eventSource.addEventListener('queue_update', handleSseFrame);
        eventSource.addEventListener('announcement_status', handleSseFrame);
        eventSource.addEventListener('tts_complete', handleSseFrame);

        /**
         * Event listener for SSE connection errors.
         * Closes the existing connection and schedules a reconnection.
         * @param {Event} err - The error event.
         * @private
         */
        eventSource.onerror = (err) => {
            console.error("SSE_HANDLER: Connection error detected. Closing connection and scheduling reconnect.", err);
            // Close the current EventSource to clean up resources.
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            scheduleReconnect(); // Attempt to reconnect.
        };
    }

    // --- Initial Setup ---

    // Ensure `window.currentGlobalLanguage` exists, providing a fallback if common.js
    // is loaded out of order or isn't present.
    if (typeof window.currentGlobalLanguage === 'undefined') {
        window.currentGlobalLanguage = 'en';
        console.warn("SSE_HANDLER: 'window.currentGlobalLanguage' not found, defaulting to 'en'. Ensure common.js is loaded.");
    }

    // Initialize the SSE connection once the DOM is fully loaded.
    // A small delay (100ms) is added to ensure all other DOM-related scripts
    // (like UI initialization) have a chance to set up their listeners.
    document.addEventListener('DOMContentLoaded', () => {
        console.log("SSE_HANDLER: DOM ready. Initializing SSE connection with a short delay.");
        setTimeout(initializeSSE, 100);
    });
})();