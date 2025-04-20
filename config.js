const path = require('path');

module.exports = {
    port: process.env.PORT || 3000,

    // --- Timing Configuration ---
    debouncingIntervalMs: parseInt(process.env.DEBOUNCINGINTERVALMS || 3000, 10),
    publicAnnouncementIntervalMs: parseInt(process.env.PUBLICANNOUNCEMENTINTERVALMS || 30 * 60 * 1000, 10),
    startPublicAnnouncementsAfterMs: parseInt(process.env.STARTPUBLICANNOUNCEMENTSAFTERMS || 5 * 60 * 1000, 10),

    // --- Rate Limiting Configuration ---
    callRateLimitWindowMs: parseInt(process.env.CALL_RATE_LIMIT_WINDOW_MS || '60000', 10),
    callRateLimitMax: parseInt(process.env.CALL_RATE_LIMIT_MAX || '20', 10),

    speakRateLimitWindowMs: parseInt(process.env.SPEAK_RATE_LIMIT_WINDOW_MS || '60000', 10),
    speakRateLimitMax: parseInt(process.env.SPEAK_RATE_LIMIT_MAX || '30', 10),

    triggerRateLimitWindowMs: parseInt(process.env.TRIGGER_RATE_LIMIT_WINDOW_MS || '300000', 10),
    triggerRateLimitMax: parseInt(process.env.TRIGGER_RATE_LIMIT_MAX || '5', 10),

    // --- Supported Languages & Paths ---
    languageCodes: ['th', 'en', 'my'],
    queueFallbackBasePath: path.join(__dirname, 'public', 'media', 'queue-fallback'),
};