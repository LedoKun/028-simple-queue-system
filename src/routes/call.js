// ./routes/call.js

const express = require('express');
const router = express.Router();

const { enqueueCall } = require('../services/queueService');
const { callLimiter } = require('../rateLimiters');
const logger = require('../logger');

/**
 * Pad single‐digit queue numbers to two digits.
 * E.g. A1 → A01, A8 → A08; but A10 → A10, A100 → A100.
 */
function padQueueNumber(rawQueue) {
    // rawQueue is guaranteed (by validation) to match /^[A-Z]\d+$/
    const [, letter, digits] = rawQueue.match(/^([A-Z])(\d+)$/);
    const padded = digits.length === 1
        ? digits.padStart(2, '0')
        : digits;
    return `${letter}${padded}`;
}

/**
 * POST /call
 * Body: { queue: string, station: string }
 * Enqueue a new queue call via SSE.
 */
router.post('/call', callLimiter, (req, res) => {
    const rawQueue = String(req.body.queue || '').toUpperCase().trim();
    const rawStation = String(req.body.station || '').trim();

    // validate queue: 1 letter + ≥1 digit
    if (!/^[A-Z]\d+$/.test(rawQueue)) {
        logger.warn('Invalid /call queue parameter:', rawQueue);
        return res.status(400).json({
            error: 'Queue must be 1 letter followed by digits, e.g. A123'
        });
    }

    // validate station: ≥1 digit
    if (!/^\d+$/.test(rawStation)) {
        logger.warn('Invalid /call station parameter:', rawStation);
        return res.status(400).json({
            error: 'Station must be numeric, e.g. 5 or 42'
        });
    }

    // pad queue number if needed
    const queue = padQueueNumber(rawQueue);
    const station = rawStation;

    logger.info('POST /call received', { queue, station });
    enqueueCall(queue, station);
    res.sendStatus(200);
});

module.exports = router;
