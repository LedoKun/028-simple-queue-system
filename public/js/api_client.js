// public/js/api_client.js

/**
 * @file This script provides a singleton API client for interacting with the
 * Queue Calling System backend. It centralizes all API calls, handles
 * common request/response patterns, and provides feedback to the user.
 * @author LedoKun <romamp100@gmail.com>
 * @version 1.0.0
 */

// This script assumes 'common.js' has been loaded *before* this script,
// providing the following global variables and functions:
// - API_BASE_URL: (string) The base URL for all API endpoints (e.g., 'http://localhost:8000/api').
// - showFeedback(message, type, duration): (function) Displays a feedback message to the user.
// - clearFeedback(): (function) Clears any currently displayed feedback messages.

/**
 * The `apiClient` object provides a set of methods for interacting with the
 * backend API endpoints of the Queue Calling System. It encapsulates the
 * logic for making fetch requests, handling responses (success and error),
 * and providing user feedback.
 * @namespace apiClient
 */
const apiClient = {
    /**
     * Generic helper method for making asynchronous HTTP requests to the API.
     * This method standardizes headers, logs request/response details,
     * and handles common success and error scenarios.
     *
     * @memberof apiClient
     * @async
     * @param {string} endpoint - The specific API endpoint path (e.g., '/queue/add', '/tts/languages').
     * This path will be appended to `API_BASE_URL`.
     * @param {object} [options={}] - Standard Fetch API options to customize the request.
     * Common options include `method` (e.g., 'POST', 'GET'),
     * `body` (for 'POST' requests, should be JSON.stringify-ed),
     * and additional `headers`.
     * @returns {Promise<object|null>} A Promise that resolves to the JSON response data on success.
     * Returns `null` if the request fails (network error, non-OK HTTP status, or JSON parsing error).
     * For 202 (Accepted) and 204 (No Content) responses, it returns a
     * structured object `{ success: true, status: ..., message: ..., [data]: ... }`.
     */
    async request(endpoint, options = {}) {
        // Define default headers that apply to most API requests.
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                // Add other default headers here, e.g., 'Authorization' tokens if your API uses them.
            },
        };

        // Merge default options with any provided options.
        // Deep merge headers to ensure custom headers are added, not overwritten.
        const config = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {}), // Ensure any user-provided headers are included.
            },
        };

        // Log the outgoing request details for debugging.
        console.log(`API_CLIENT: Requesting endpoint: ${API_BASE_URL}${endpoint}`, "with config:", config);

        // Display a "Processing..." feedback message if the feedback functions are available.
        // Duration 0 typically means the message stays until explicitly cleared.
        if (typeof showFeedback === 'function' && typeof clearFeedback === 'function') {
            showFeedback('Processing...', 'info', 0);
        }

        try {
            // Execute the fetch request to the constructed API URL.
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            // Clone the response stream for logging the body without consuming the original,
            // which is needed for subsequent parsing.
            const clonedResponseForLogging = response.clone();

            // Log raw response status and headers.
            console.log(`API_CLIENT: Raw response status for ${endpoint}: ${response.status}, ok: ${response.ok}`);
            console.log(`API_CLIENT: Response headers for ${endpoint}:`, Object.fromEntries(response.headers.entries()));

            // Handle non-OK HTTP responses (status codes outside 2xx range).
            if (!response.ok) {
                let errorData = `Request failed with status ${response.status}.`;
                try {
                    // Attempt to read the error response body as text.
                    const errText = await clonedResponseForLogging.text();
                    console.error(`API_CLIENT: Error response body for ${endpoint}:`, errText);

                    // Try to parse the error body as JSON first.
                    try {
                        const errJson = JSON.parse(errText);
                        // Extract specific error messages if available, otherwise use raw text.
                        errorData = errJson.error || errJson.message || errText;
                    } catch (jsonParseError) {
                        // If JSON parsing fails, use the raw text as the error message.
                        errorData = errText || `Request failed with status ${response.status}.`;
                    }
                } catch (e) {
                    // Fallback if reading the error body itself fails.
                    console.error(`API_CLIENT: Could not get error response body for ${endpoint}:`, e);
                    errorData = response.statusText || `Request failed with status ${response.status}.`;
                }

                // Log the final determined API error message.
                console.error(`API_CLIENT: API Error ${response.status} for ${endpoint}:`, errorData);
                // Display error feedback to the user.
                if (typeof showFeedback === 'function') {
                    showFeedback(`Error ${response.status}: ${errorData}`, 'error');
                }
                // Clear the "Processing..." message.
                if (typeof clearFeedback === 'function') {
                    clearFeedback();
                }
                return null; // Indicate request failure.
            }

            // Clear the persistent "Processing..." message on successful (2xx) responses.
            if (typeof clearFeedback === 'function') {
                clearFeedback();
            }

            // Special handling for 204 No Content responses (no body expected).
            if (response.status === 204) {
                console.log(`API_CLIENT: Received 204 No Content for ${endpoint}.`);
                return { success: true, status: response.status, message: "Operation successful (No Content)." };
            }

            // For 2xx responses that might have a body, read the response as text first for logging.
            const responseText = await clonedResponseForLogging.text();
            console.log(`API_CLIENT: Response text for ${endpoint} (status ${response.status}):`, responseText);

            // Special handling for 202 Accepted responses.
            if (response.status === 202) {
                console.log(`API_CLIENT: Received 202 Accepted for ${endpoint}.`);
                // Return the response text as a message if present, otherwise a generic success.
                return responseText ? { success: true, status: response.status, message: responseText } : { success: true, status: response.status, message: "Request accepted." };
            }

            // For 200 OK or other 2xx status codes where a JSON body is expected.
            try {
                // Check for empty response body before attempting JSON parse.
                if (!responseText.trim()) {
                    console.log(`API_CLIENT: Received ${response.status} with empty body for ${endpoint}. Assuming successful operation with no data.`);
                    return { success: true, status: response.status, data: null, message: "Operation successful (empty response)." };
                }
                // Attempt to parse the response text as JSON.
                const jsonData = JSON.parse(responseText);
                console.log(`API_CLIENT: Parsed JSON response for ${endpoint}:`, jsonData);
                return jsonData; // Return the parsed JSON data.
            } catch (e) {
                // Handle cases where JSON parsing fails for an expected JSON endpoint.
                console.error(`API_CLIENT: Failed to parse JSON response for ${endpoint} (status ${response.status}). Body:`, responseText, "Error:", e);
                if (typeof showFeedback === 'function') {
                    showFeedback(`Error: Could not parse server response.`, 'error');
                }
                return null; // Indicate failure.
            }

        } catch (error) {
            // Catch network errors or issues with the fetch operation itself.
            if (typeof clearFeedback === 'function') {
                clearFeedback();
            }
            console.error(`API_CLIENT: Network or fetch error for endpoint ${endpoint}:`, error);
            if (typeof showFeedback === 'function') {
                showFeedback(`Network error: ${error.message || 'Could not connect to server.'}`, 'error');
            }
            return null; // Indicate request failure.
        }
    },

    // --- Queue Endpoints ---

    /**
     * Adds a new call to the queue or recalls/updates an existing one.
     * @memberof apiClient
     * @param {object} callData - The call details.
     * @param {string} callData.original_id - The original call identifier (e.g., "A1", "Z99").
     * @param {string} callData.location - The location associated with the call (e.g., "5", "Counter 10").
     * @returns {Promise<object|null>} The API response or null on error.
     */
    addCall: function (callData) {
        console.log("API_CLIENT: addCall initiated with payload:", callData);
        return this.request('/queue/add', {
            method: 'POST',
            body: JSON.stringify(callData) // Convert payload to JSON string.
        });
    },

    /**
     * Skips the currently active call, moving it to the skipped history.
     * @memberof apiClient
     * @returns {Promise<object|null>} The API response or null on error.
     */
    skipCall: function () {
        console.log("API_CLIENT: skipCall initiated.");
        return this.request('/queue/skip', { method: 'POST' });
    },

    /**
     * Fetches the current state of the call queue, including the current call
     * and histories of completed and skipped calls.
     * @memberof apiClient
     * @returns {Promise<object|null>} The queue state data or null on error.
     */
    getQueueState: function () {
        console.log("API_CLIENT: getQueueState initiated.");
        return this.request('/queue/state'); // GET is the default method for apiClient.request.
    },

    /**
     * Marks the currently active call as completed, moving it to the completed history.
     * @memberof apiClient
     * @returns {Promise<object|null>} The API response or null on error.
     */
    completeCurrentCall: function () {
        console.log("API_CLIENT: completeCurrentCall initiated.");
        return this.request('/queue/complete', { method: 'POST' });
    },

    /**
     * Adds a new call directly to the skipped history, bypassing the current call slot.
     * This is useful for quickly logging calls that are no longer relevant.
     * @memberof apiClient
     * @param {object} callData - The call details to be skipped.
     * @param {string} callData.original_id - The original call identifier (e.g., "A1", "Z99").
     * @param {string} callData.location - The location associated with the call (e.g., "5", "10").
     * @returns {Promise<object|null>} The API response or null on error.
     */
    forceSkipNewCall: function (callData) {
        console.log("API_CLIENT: forceSkipNewCall initiated with payload:", callData);
        return this.request('/queue/force_skip', {
            method: 'POST',
            body: JSON.stringify(callData)
        });
    },

    // --- Announcement Endpoints ---

    /**
     * Triggers the advancement to the next announcement slot.
     * This action may be subject to a cooldown period on the server.
     * @memberof apiClient
     * @returns {Promise<object|null>} The API response or null on error.
     */
    nextAnnouncement: function () {
        console.log("API_CLIENT: nextAnnouncement initiated.");
        return this.request('/announcements/next', { method: 'POST' });
    },

    /**
     * Fetches the current status of the announcement system, including the active slot
     * and cooldown information for manual triggers.
     * @memberof apiClient
     * @returns {Promise<object|null>} The announcement status data or null on error.
     */
    getAnnouncementStatus: function () {
        console.log("API_CLIENT: getAnnouncementStatus initiated.");
        return this.request('/announcements/status');
    },

    // --- TTS Endpoints ---

    /**
     * Fetches a map of all supported Text-to-Speech (TTS) languages.
     * The map keys are language codes (e.g., "th", "en-uk") and values are display names.
     * @memberof apiClient
     * @returns {Promise<object|null>} The map of supported languages or null on error.
     */
    getLanguages: function () {
        console.log("API_CLIENT: getLanguages initiated.");
        return this.request('/tts/languages');
    },

    /**
     * Fetches an ordered list of supported Text-to-Speech (TTS) language codes.
     * The order is as configured on the server.
     * @memberof apiClient
     * @returns {Promise<object|null>} An array of ordered language codes or null on error.
     */
    getOrderedSupportedLanguages: function () {
        console.log("API_CLIENT: getOrderedSupportedLanguages initiated.");
        return this.request('/tts/ordered-languages');
    },

    /**
     * Triggers the Text-to-Speech (TTS) generation process for a specific call.
     * This will usually result in an audio file being generated and cached on the server.
     * @memberof apiClient
     * @param {object} ttsData - The TTS generation request details.
     * @param {string} ttsData.id - The ID of the call (e.g., "A01").
     * @param {string} ttsData.location - The location associated with the call (e.g., "5").
     * @param {string} ttsData.lang - The language code for TTS generation (e.g., "th", "en-uk").
     * @returns {Promise<object|null>} The API response or null on error.
     */
    triggerTTS: function (ttsData) {
        console.log("API_CLIENT: triggerTTS initiated with payload:", ttsData);
        return this.request('/tts/trigger', {
            method: 'POST',
            body: JSON.stringify(ttsData)
        });
    },
};