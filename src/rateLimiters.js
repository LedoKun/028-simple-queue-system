// ./rateLimiters.js

const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./logger');

/**
 * Factory to create a rate limiter that logs when the limit is exceeded.
 *
 * @param {object} options
 * @param {number} options.windowMs  – Time frame for which requests are checked (in ms)
 * @param {number} options.max       – Max number of requests in window
 * @param {string} options.message   – Error message to send when rate limit is hit
 * @param {string} options.key       – Identifier for logging (e.g. the route path)
 */
function createLimiter({ windowMs, max, message, key }) {
    return rateLimit({
        windowMs,
        max,
        message,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next, options) => {
            logger.warn(`Rate limit exceeded [${key}]: IP=${req.ip}`);
            res.status(options.statusCode).send(options.message);
        },
    });
}

const callLimiter = createLimiter({
    windowMs: config.callRateLimit.windowMs,
    max: config.callRateLimit.max,
    message: 'Too many /call requests, try later.',
    key: '/call',
});

const speakLimiter = createLimiter({
    windowMs: config.speakRateLimit.windowMs,
    max: config.speakRateLimit.max,
    message: 'Too many /speak requests, try later.',
    key: '/speak',
});

const triggerLimiter = createLimiter({
    windowMs: config.triggerRateLimit.windowMs,
    max: config.triggerRateLimit.max,
    message: 'Too many /trigger-announcement requests, try later.',
    key: '/trigger-announcement',
});

module.exports = {
    callLimiter,
    speakLimiter,
    triggerLimiter,
};
