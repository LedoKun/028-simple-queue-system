// public/js/common.js

// --- Constants ---
const API_BASE_URL = '/api';
const SSE_URL = `${API_BASE_URL}/events`;

// --- Language Data & Labels ---
// Used by sse_handler.js for status messages and potentially by UI scripts.
// Signage HTML will have its main/sub-labels hardcoded.
const UI_TEXT = {
    en: {
        connecting: "Connecting to server...",
        connected: "Live Connection Active",
        disconnected: "Connection lost. Retrying...",
        announcementPlaceholder: "Announcements", // For signage.js
        historyPlaceholder: "Waiting for calls...", // For signage.js & operator.js
        skippedPlaceholder: "No skipped calls.",    // For signage.js & operator.js
        loading: "Loading...", // For operator.js feedback
        errorPrefix: "Error: ",
        successPrefix: "Success: "
    },
    th: { // Example for Thai status messages if global language preference is set
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
    // Add other languages for UI_TEXT if status messages need dynamic localization
};

// Default global language hint for sse_handler status messages
window.currentGlobalLanguage = 'en';

/**
 * Displays a feedback message (typically for operator.html).
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {number} duration (ms), 0 for persistent
 * @param {string} feedbackElementId
 */
function showFeedback(message, type = 'info', duration = 4000, feedbackElementId = 'feedback-area') {
    const feedbackArea = document.getElementById(feedbackElementId);
    if (!feedbackArea) {
        // console.warn(`Feedback area with ID '${feedbackElementId}' not found. Message:`, message);
        return;
    }
    if (feedbackArea.dataset.timeoutId) {
        clearTimeout(parseInt(feedbackArea.dataset.timeoutId));
    }
    feedbackArea.textContent = message;
    // Base classes for structure/padding should be on the element in HTML or in a global CSS.
    // This function primarily handles visibility and color state.
    feedbackArea.className = 'mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ease-in-out';

    let typeSpecificClasses = 'text-white ';
    switch (type.toLowerCase()) {
        case 'success': typeSpecificClasses += 'bg-green-600'; break;
        case 'warning': typeSpecificClasses += 'bg-yellow-500 text-black'; break;
        case 'error': typeSpecificClasses += 'bg-red-600'; break;
        case 'info': default: typeSpecificClasses += 'bg-blue-600'; break;
    }
    feedbackArea.classList.add(...typeSpecificClasses.split(' ').filter(Boolean));
    feedbackArea.classList.remove('hidden', 'opacity-0');
    void feedbackArea.offsetWidth;
    feedbackArea.classList.add('opacity-100');

    if (duration > 0) {
        const timeoutId = setTimeout(() => {
            feedbackArea.classList.remove('opacity-100');
            feedbackArea.classList.add('opacity-0');
            setTimeout(() => {
                if (feedbackArea.textContent === message) {
                    feedbackArea.classList.add('hidden');
                    feedbackArea.textContent = '';
                }
                delete feedbackArea.dataset.timeoutId;
            }, 300);
        }, duration);
        feedbackArea.dataset.timeoutId = timeoutId.toString();
    }
}

function clearFeedback(feedbackElementId = 'feedback-area') {
    const feedbackArea = document.getElementById(feedbackElementId);
    if (feedbackArea) {
        if (feedbackArea.dataset.timeoutId) {
            clearTimeout(parseInt(feedbackArea.dataset.timeoutId));
            delete feedbackArea.dataset.timeoutId;
        }
        feedbackArea.classList.remove('opacity-100');
        feedbackArea.classList.add('opacity-0', 'hidden');
        feedbackArea.textContent = '';
    }
}

function sanitizeText(str) {
    if (str === null || typeof str === 'undefined') return '';
    const temp = document.createElement('div');
    temp.textContent = String(str);
    return temp.innerHTML;
}

function formatDisplayTime(isoTimestamp) {
    if (!isoTimestamp) return '';
    try {
        const date = new Date(isoTimestamp);
        return date.toLocaleTimeString(navigator.language, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });
    } catch (e) {
        // console.error("Error formatting timestamp:", isoTimestamp, e);
        return "Invalid Time";
    }
}