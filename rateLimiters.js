const rateLimit = require('express-rate-limit');
const configRL = require('./config');

const callLimiter = rateLimit({
    windowMs: configRL.callRateLimitWindowMs,
    max: configRL.callRateLimitMax,
    message: 'Too many /call requests, please try later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const speakLimiter = rateLimit({
    windowMs: configRL.speakRateLimitWindowMs,
    max: configRL.speakRateLimitMax,
    message: 'Too many /speak requests, please try later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const triggerLimiter = rateLimit({
    windowMs: configRL.triggerRateLimitWindowMs,
    max: configRL.triggerRateLimitMax,
    message: 'Too many /trigger-announcement requests, please try later.',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { callLimiter, speakLimiter, triggerLimiter };