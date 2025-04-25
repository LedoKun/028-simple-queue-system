// ./routes/call.js

const express = require('express');
const router = express.Router();

const { enqueueCall } = require('../services/queueService');
const { callLimiter } = require('../rateLimiters');
const logger = require('../logger');

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

    const queue = rawQueue;
    const station = rawStation;

    logger.info('POST /call received', { queue, station });
    enqueueCall(queue, station);
    res.sendStatus(200);
});

module.exports = router;
