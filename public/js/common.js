// public/js/common.js

/**
 * @file This script provides global constants and utility functions
 * that are shared across various frontend JavaScript files in the application.
 * It includes API base URLs, UI text translations, and helper functions
 * for displaying feedback and formatting data.
 * @author LedoKun <romamp100@gmail.com>
 * @version 1.0.0
 */

// --- Constants ---

/**
 * The base URL for all API endpoints. This is a relative path,
 * assuming the frontend is served from the same origin as the backend API.
 * @type {string}
 */
const API_BASE_URL = '/api';

/**
 * The full URL for the Server-Sent Events (SSE) endpoint.
 * Clients will subscribe to this URL to receive real-time updates.
 * @type {string}
 */
const SSE_URL = `${API_BASE_URL}/events`;

/**
 * Regular expression used to validate queue identifiers. The format matches a
 * single uppercase prefix character followed by one or more digits (e.g. "A1").
 */
const CALL_IDENTIFIER_REGEX = /^[A-Z][0-9]+$/;

/**
 * Regular expression used to validate station/location identifiers. Only
 * numeric strings are permitted (e.g. "5", "101").
 */
const CALL_LOCATION_REGEX = /^[0-9]+$/;

// --- Language Data & Labels ---

/**
 * An object containing localized UI text strings.
 * This is used by various frontend scripts (e.g., `sse_handler.js`, `signage.js`, `operator.js`)
 * for displaying status messages, placeholders, and feedback in different languages.
 * Note: Signage HTML elements might have their main/sub-labels hardcoded in the HTML itself.
 * @type {object}
 * @property {object} en - English UI text translations.
 * @property {string} en.connecting - Message displayed while connecting to the server.
 * @property {string} en.connected - Message displayed when a live connection is established.
 * @property {string} en.disconnected - Message displayed when connection is lost, indicating retry.
 * @property {string} en.announcementPlaceholder - Placeholder text for announcement areas (e.g., on signage).
 * @property {string} en.historyPlaceholder - Placeholder text for call history displays.
 * @property {string} en.skippedPlaceholder - Placeholder text for skipped calls display.
 * @property {string} en.loading - Generic loading message.
 * @property {string} en.errorPrefix - Prefix for error feedback messages.
 * @property {string} en.successPrefix - Prefix for success feedback messages.
 * @property {object} th - Thai UI text translations (example).
 */
const UI_TEXT = {
    en: {
        connecting: "Connecting to server...",
        connected: "Live Connection Active",
        disconnected: "Connection lost. Retrying...",
        announcementPlaceholder: "Announcements",
        historyPlaceholder: "----",
        skippedPlaceholder: "----",
        loading: "Loading...",
        errorPrefix: "Error: ",
        successPrefix: "Success: "
    },
    th: {
        connecting: "กำลังเชื่อมต่อเซิร์ฟเวอร์...",
        connected: "เชื่อมต่อสดแล้ว",
        disconnected: "ตัดการเชื่อมต่อ - กำลังลองใหม่...",
        announcementPlaceholder: "ประกาศ",
        historyPlaceholder: "รอการเรียก...",
        skippedPlaceholder: "ไม่มีคิวที่ข้ามไป",
        loading: "กำลังโหลด...",
        errorPrefix: "ข้อผิดพลาด: ",
        successPrefix: "สำเร็จ: "
    }
    // Add other languages for UI_TEXT here if dynamic localization is needed.
};

/**
 * A global variable to store the currently active language for UI text.
 * This can be updated dynamically if multi-language support is implemented.
 * Default is 'en' (English).
 * @type {string}
 */
window.currentGlobalLanguage = 'en';

function isValidCallIdentifier(candidate) {
    return CALL_IDENTIFIER_REGEX.test(String(candidate).trim());
}

function isValidCallLocation(candidate) {
    return CALL_LOCATION_REGEX.test(String(candidate).trim());
}

/**
 * Displays a feedback message to the user, typically in a dedicated feedback area
 * (e.g., on `operator.html`). The message can be styled based on its type.
 *
 * @param {string} message - The text content of the feedback message.
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - The type of feedback, influencing its styling.
 * @param {number} [duration=4000] - How long the message should be visible in milliseconds.
 * Set to `0` for a persistent message that needs manual clearing.
 * @param {string} [feedbackElementId='feedback-area'] - The ID of the HTML element
 * where the feedback message will be displayed.
 */
function showFeedback(message, type = 'info', duration = 4000, feedbackElementId = 'feedback-area') {
    const feedbackArea = document.getElementById(feedbackElementId);
    if (!feedbackArea) {
        // Log a warning if the feedback element isn't found, but don't stop execution.
        // console.warn(`Feedback area with ID '${feedbackElementId}' not found. Message:`, message);
        return;
    }

    // Clear any existing timeout to prevent previous messages from disappearing prematurely.
    if (feedbackArea.dataset.timeoutId) {
        clearTimeout(parseInt(feedbackArea.dataset.timeoutId));
    }

    // Set the message text and reset/apply base CSS classes.
    feedbackArea.textContent = message;
    // Base classes for structure/padding should ideally be in HTML or global CSS.
    // This function focuses on dynamic visibility and color-state styling.
    feedbackArea.className = 'mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ease-in-out';

    // Apply type-specific background and text colors.
    let typeSpecificClasses = 'text-white ';
    switch (type.toLowerCase()) {
        case 'success': typeSpecificClasses += 'bg-green-600'; break;
        case 'warning': typeSpecificClasses += 'bg-yellow-500 text-black'; break;
        case 'error': typeSpecificClasses += 'bg-red-600'; break;
        case 'info':
        default:
            typeSpecificClasses += 'bg-blue-600';
            break;
    }
    // Add the determined classes to the element.
    feedbackArea.classList.add(...typeSpecificClasses.split(' ').filter(Boolean));
    // Remove 'hidden' and 'opacity-0' to make the element visible.
    feedbackArea.classList.remove('hidden', 'opacity-0');
    // Force a reflow/repaint to ensure the transition takes effect.
    void feedbackArea.offsetWidth;
    // Animate opacity to 100%.
    feedbackArea.classList.add('opacity-100');

    // Set a timeout to automatically clear the message if duration is greater than 0.
    if (duration > 0) {
        const timeoutId = setTimeout(() => {
            // Start fade-out animation.
            feedbackArea.classList.remove('opacity-100');
            feedbackArea.classList.add('opacity-0');
            // After fade-out, hide the element completely and clear text.
            const hideTimeoutId = setTimeout(() => {
                // Only clear if the message hasn't been overwritten by a new one.
                if (feedbackArea.textContent === message) {
                    feedbackArea.classList.add('hidden');
                    feedbackArea.textContent = '';
                }
                // Remove the stored timeout ID.
                delete feedbackArea.dataset.timeoutId;
            }, 300); // This duration should match the CSS transition duration for opacity.
            feedbackArea.dataset.timeoutId = hideTimeoutId.toString(); // Store the inner timeout ID as well to manage its lifecycle
        }, duration);
        feedbackArea.dataset.timeoutId = timeoutId.toString(); // Store the outer timeout ID.
    }
}

/**
 * Clears any currently displayed feedback message.
 * This is especially useful for persistent messages (where `duration` was 0).
 *
 * @param {string} [feedbackElementId='feedback-area'] - The ID of the HTML element
 * from which to clear the feedback.
 */
function clearFeedback(feedbackElementId = 'feedback-area') {
    const feedbackArea = document.getElementById(feedbackElementId);
    if (feedbackArea) {
        // Clear any pending timeouts associated with this feedback area.
        if (feedbackArea.dataset.timeoutId) {
            clearTimeout(parseInt(feedbackArea.dataset.timeoutId));
            delete feedbackArea.dataset.timeoutId;
        }
        // Immediately start fading out and hiding the element.
        feedbackArea.classList.remove('opacity-100');
        feedbackArea.classList.add('opacity-0');
        // Hide completely after the fade-out transition.
        setTimeout(() => {
            feedbackArea.classList.add('hidden');
            feedbackArea.textContent = ''; // Clear text content.
        }, 300); // Matches CSS transition duration for opacity.
    }
}

/**
 * Sanitizes a string for safe display in HTML by escaping HTML entities.
 * This helps prevent Cross-Site Scripting (XSS) vulnerabilities.
 *
 * @param {*} str - The input value to sanitize. Can be any type, will be converted to string.
 * @returns {string} The HTML-safe string. Returns empty string for null/undefined input.
 */
function sanitizeText(str) {
    if (str === null || typeof str === 'undefined') {
        return '';
    }
    const temp = document.createElement('div');
    temp.textContent = String(str); // Use textContent to safely convert to string and escape entities.
    return temp.innerHTML; // Retrieve the HTML-safe string.
}

/**
 * Formats an ISO 8601 timestamp string into a human-readable local time string.
 * Displays hour and minute, in 24-hour format.
 *
 * @param {string} isoTimestamp - The ISO 8601 formatted timestamp string (e.g., "2023-10-27T10:00:00.000Z").
 * @returns {string} The formatted time string (e.g., "10:00", "23:45").
 * Returns an empty string if the input is falsy, or "Invalid Time" on parse error.
 */
function formatDisplayTime(isoTimestamp) {
    if (!isoTimestamp) {
        return '';
    }
    try {
        const date = new Date(isoTimestamp);
        // Use `navigator.language` for locale-specific formatting.
        // `hour12: false` ensures 24-hour format.
        return date.toLocaleTimeString(navigator.language, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });
    } catch (e) {
        // Log the error for debugging, but return a user-friendly message.
        // console.error("Error formatting timestamp:", isoTimestamp, e);
        return "Invalid Time";
    }
}

// --- Periodic Page Refresh ---

/**
 * Sets up a periodic page refresh to prevent long-term memory leaks from crashing the browser.
 * This version adds safeguards for active signage announcements and preserves operator inputs.
 */
(function setupPeriodicRefresh() {
    const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
    const REFRESH_WARNING_MS = 10_000; // Warn 10 seconds before refresh
    const OPERATOR_STATION_STORAGE_KEY = 'operator_station_number';

    const isSignagePage = () => window.location.pathname.includes('signage');
    const isOperatorPage = () => window.location.pathname.includes('operator');

    const isAudioActive = (audioEl) =>
        !!audioEl && !audioEl.paused && !audioEl.ended && audioEl.currentTime > 0;

    const hasActiveAnnouncementPlayback = () => {
        if (!isSignagePage()) return false;
        const announcementAudio = document.getElementById('announcement-audio-player');
        const ttsAudio = document.getElementById('tts-audio-player');
        const chimeAudio = document.getElementById('chimeAudio');
        const isAudioPlaying = [announcementAudio, ttsAudio, chimeAudio].some(isAudioActive);

        let pendingQueue = false;
        const globalQueue = window.SignageEventQueue;
        const currentEvent = window.SignageCurrentEvent;

        if (Array.isArray(globalQueue) && globalQueue.length > 0) {
            pendingQueue = true;
        }

        if (currentEvent && typeof currentEvent === 'object') {
            // Treat an ongoing event like announcement/call as active work that should block refresh.
            pendingQueue = true;
        }

        return isAudioPlaying || pendingQueue;
    };

    const saveOperatorStationValue = () => {
        if (!isOperatorPage()) return;
        const stationInput = document.getElementById('call-location');
        if (stationInput) {
            try {
                sessionStorage.setItem(OPERATOR_STATION_STORAGE_KEY, stationInput.value || '');
            } catch (error) {
                console.warn('Unable to persist operator station value:', error);
            }
        }
    };

    const restoreOperatorStationValue = () => {
        if (!isOperatorPage()) return;
        try {
            const storedValue = sessionStorage.getItem(OPERATOR_STATION_STORAGE_KEY);
            if (storedValue !== null) {
                const stationInput = document.getElementById('call-location');
                if (stationInput && !stationInput.value) {
                    stationInput.value = storedValue;
                }
            }
        } catch (error) {
            console.warn('Unable to restore operator station value:', error);
        }
    };

    const monitorOperatorStationInput = () => {
        if (!isOperatorPage()) return;
        const stationInput = document.getElementById('call-location');
        if (stationInput) {
            stationInput.addEventListener('input', saveOperatorStationValue);
        }
    };

    const scheduleRefreshCycle = () => {
        setTimeout(() => {
            console.warn('Page will be refreshed in 10 seconds to clear memory and prevent crashes.');

            const attemptRefresh = () => {
                if (hasActiveAnnouncementPlayback()) {
                    console.info('Delaying refresh; announcement audio is still playing.');
                    setTimeout(attemptRefresh, REFRESH_WARNING_MS);
                    return;
                }

                saveOperatorStationValue();
                console.log('PERIODIC REFRESH: Reloading page now.');
                location.reload();
            };

            setTimeout(attemptRefresh, REFRESH_WARNING_MS);
        }, REFRESH_INTERVAL_MS - REFRESH_WARNING_MS);
    };

    const initializeOperatorPersistence = () => {
        if (!isOperatorPage()) return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                restoreOperatorStationValue();
                monitorOperatorStationInput();
            });
        } else {
            restoreOperatorStationValue();
            monitorOperatorStationInput();
        }
    };

    initializeOperatorPersistence();
    scheduleRefreshCycle();
    console.log(`Periodic page refresh scheduled every ${REFRESH_INTERVAL_MS / 60000} minutes.`);
})();

window.Validation = Object.freeze({
    isValidCallIdentifier,
    isValidCallLocation,
    CALL_IDENTIFIER_REGEX,
    CALL_LOCATION_REGEX,
});
