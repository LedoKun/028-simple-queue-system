// ./config.js
const path = require('path');

/**
 * Convert environment variable strings to boolean.
 * Accepts 'true', '1', or 'yes' (case-insensitive) as truthy values.
 */
function toBool(val) {
    return ['true', '1', 'yes'].includes(String(val || '').toLowerCase());
}

/**
 * Parse an environment variable as integer with a fallback default.
 */
function toInt(val, defaultVal) {
    const n = parseInt(val, 10);
    return Number.isNaN(n) ? defaultVal : n;
}

module.exports = {
    // --- Server Configuration ---
    port: toInt(process.env.QUEUE_SERVER_PORT, 3000),

    // --- Timing Configuration ---
    debounceIntervalMs: toInt(process.env.QUEUE_DEBOUNCE_INTERVAL_MS, 3000),
    announcementIntervalMs: toInt(process.env.PUBLIC_ANNOUNCEMENT_INTERVAL_MS, 3600000),
    announcementStartDelayMs: toInt(process.env.ANNOUNCEMENT_START_DELAY_MS, 1200000),

    // --- Rate Limiting Configuration ---
    callRateLimit: {
        windowMs: toInt(process.env.CALL_RATE_LIMIT_WINDOW_MS, 60000),
        max: toInt(process.env.CALL_RATE_LIMIT_MAX, 20),
    },
    speakRateLimit: {
        windowMs: toInt(process.env.SPEAK_RATE_LIMIT_WINDOW_MS, 60000),
        max: toInt(process.env.SPEAK_RATE_LIMIT_MAX, 30),
    },
    triggerRateLimit: {
        windowMs: toInt(process.env.TRIGGER_RATE_LIMIT_WINDOW_MS, 300000),
        max: toInt(process.env.TRIGGER_RATE_LIMIT_MAX, 5),
    },

    // --- Supported Languages & Fallbacks ---
    // Comma-separated list in ENV or defaults to ['th','en']
    languageCodes: process.env.LANGUAGE_CODES
        ? process.env.LANGUAGE_CODES.split(',').map(s => s.trim().toLowerCase())
        : ['th', 'en'],

    // --- Cache Directory ---
    ttsCacheDir: process.env.TTS_CACHE_DIR
        ? path.resolve(process.env.TTS_CACHE_DIR)
        : path.resolve('/tmp', 'cache-queue', 'tts'),

    maxTTSCacheFiles: toInt(process.env.MAX_TTS_CACHE_FILES, 200),
};
