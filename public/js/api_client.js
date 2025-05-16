// public/js/api_client.js

// This script assumes common.js has been loaded first, providing:
// - API_BASE_URL (constant)
// - showFeedback(message, type, duration) (function)
// - clearFeedback() (function)

const apiClient = {
    /**
     * Generic request helper for API calls.
     * @param {string} endpoint - The API endpoint (e.g., '/queue/add').
     * @param {object} [options={}] - Fetch options (method, body, headers, etc.).
     * @returns {Promise<object|null>} - The JSON response data or null on error.
     */
    async request(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                // Add other default headers if needed, like Authorization tokens
            },
        };

        const config = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {}),
            },
        };

        console.log(`API_CLIENT: Requesting endpoint: ${API_BASE_URL}${endpoint}`, "with config:", config);

        if (typeof showFeedback === 'function' && typeof clearFeedback === 'function') {
            showFeedback('Processing...', 'info', 0);
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const clonedResponseForLogging = response.clone(); // Clone for logging body without consuming original

            console.log(`API_CLIENT: Raw response status for ${endpoint}: ${response.status}, ok: ${response.ok}`);
            console.log(`API_CLIENT: Response headers for ${endpoint}:`, Object.fromEntries(response.headers.entries()));


            if (!response.ok) {
                let errorData = `Request failed with status ${response.status}.`;
                try {
                    const errText = await clonedResponseForLogging.text();
                    console.error(`API_CLIENT: Error response body for ${endpoint}:`, errText);
                    // Try to parse as JSON, but fallback to text
                    try {
                        const errJson = JSON.parse(errText);
                        errorData = errJson.error || errJson.message || errText;
                    } catch (jsonParseError) {
                        errorData = errText || `Request failed with status ${response.status}.`;
                    }
                } catch (e) {
                    console.error(`API_CLIENT: Could not get error response body for ${endpoint}:`, e);
                    errorData = response.statusText || `Request failed with status ${response.status}.`;
                }

                console.error(`API_CLIENT: API Error ${response.status} for ${endpoint}:`, errorData);
                if (typeof showFeedback === 'function') {
                    showFeedback(`Error ${response.status}: ${errorData}`, 'error');
                }
                if (typeof clearFeedback === 'function') {
                    clearFeedback();
                }
                return null;
            }

            // Clear persistent "Processing..." message only on success or handled error
            if (typeof clearFeedback === 'function') {
                clearFeedback();
            }

            if (response.status === 204) { // No Content
                console.log(`API_CLIENT: Received 204 No Content for ${endpoint}.`);
                return { success: true, status: response.status, message: "Operation successful (No Content)." };
            }

            const responseText = await clonedResponseForLogging.text(); // Get text for all 2xx for logging
            console.log(`API_CLIENT: Response text for ${endpoint} (status ${response.status}):`, responseText);

            if (response.status === 202) { // Accepted
                console.log(`API_CLIENT: Received 202 Accepted for ${endpoint}.`);
                // Return text if present, otherwise a success object
                return responseText ? { success: true, status: response.status, message: responseText } : { success: true, status: response.status, message: "Request accepted." };
            }

            // For 200 OK or other 2xx that are expected to have JSON body
            try {
                if (!responseText.trim()) { // Handle empty JSON response body
                    console.log(`API_CLIENT: Received ${response.status} with empty body for ${endpoint}. Assuming success.`);
                    return { success: true, status: response.status, data: null, message: "Operation successful (empty response)." };
                }
                const jsonData = JSON.parse(responseText);
                console.log(`API_CLIENT: Parsed JSON response for ${endpoint}:`, jsonData);
                return jsonData; // This implicitly means success if it parses and is not an error status
            } catch (e) {
                console.error(`API_CLIENT: Failed to parse JSON response for ${endpoint} (status ${response.status}). Body:`, responseText, "Error:", e);
                if (typeof showFeedback === 'function') {
                    showFeedback(`Error: Could not parse server response.`, 'error');
                }
                return null; // Indicate failure if JSON parsing fails for expected JSON endpoint
            }

        } catch (error) {
            if (typeof clearFeedback === 'function') {
                clearFeedback();
            }
            console.error(`API_CLIENT: Network or fetch error for endpoint ${endpoint}:`, error);
            if (typeof showFeedback === 'function') {
                showFeedback(`Network error: ${error.message || 'Could not connect to server.'}`, 'error');
            }
            return null;
        }
    },

    // --- Queue Endpoints ---
    addCall: function (callData) {
        console.log("API_CLIENT: addCall initiated with payload:", callData);
        return this.request('/queue/add', {
            method: 'POST',
            body: JSON.stringify(callData)
        });
    },
    skipCall: function () {
        console.log("API_CLIENT: skipCall initiated.");
        return this.request('/queue/skip', { method: 'POST' });
    },
    getQueueState: function () {
        console.log("API_CLIENT: getQueueState initiated.");
        return this.request('/queue/state'); // GET is default
    },

    // --- Announcement Endpoints ---
    nextAnnouncement: function () {
        console.log("API_CLIENT: nextAnnouncement initiated.");
        return this.request('/announcements/next', { method: 'POST' });
    },
    getAnnouncementStatus: function () {
        console.log("API_CLIENT: getAnnouncementStatus initiated.");
        return this.request('/announcements/status');
    },

    // --- TTS Endpoints ---
    getLanguages: function () { // Renamed from getTTSSupportedLanguages to match API route
        console.log("API_CLIENT: getLanguages initiated.");
        return this.request('/tts/languages');
    },
    getOrderedSupportedLanguages: function () {
        console.log("API_CLIENT: getOrderedSupportedLanguages initiated.");
        return this.request('/tts/ordered-languages');
    },
    triggerTTS: function (ttsData) {
        console.log("API_CLIENT: triggerTTS initiated with payload:", ttsData);
        return this.request('/tts/trigger', {
            method: 'POST',
            body: JSON.stringify(ttsData)
        });
    },
    completeCurrentCall: function () {
        console.log("API_CLIENT: completeCurrentCall initiated.");
        return this.request('/queue/complete', { method: 'POST' });
    },
    forceSkipNewCall: function (callData) { // callData: { original_id, location }
        console.log("API_CLIENT: forceSkipNewCall initiated with payload:", callData);
        return this.request('/queue/force_skip', {
            method: 'POST',
            body: JSON.stringify(callData)
        });
    },
};

// If not using ES modules, apiClient will be a global variable.
// If using ES modules, you would add: export { apiClient };