const express = require('express');
const router = express.Router();
const { enqueueCall } = require('../services/queueService');
const { getTimestamp } = require('../utils');
const { callLimiter } = require('../rateLimiters');

router.post('/call', callLimiter, (req, res) => {
    const rawQueue = String(req.body.queue || '').toUpperCase().trim();
    const rawStation = String(req.body.station || '').trim();

    // validate queue: 1 letter + ≥1 digit
    if (!/^[A-Z]\d+$/.test(rawQueue)) {
        console.warn(`⚠️ ${getTimestamp()} - POST /call invalid data.`);
        return res.status(400).send({
            error: 'Queue must be 1 letter followed by digits, e.g. A123'
        });
    }

    // validate station: ≥1 digit
    if (!/^\d+$/.test(rawStation)) {
        console.warn(`⚠️ ${getTimestamp()} - POST /call invalid data.`);
        return res.status(400).send({
            error: 'Station must be numeric, e.g. 5 or 42'
        });
    }

    // if we get here, inputs are valid:
    const queue = rawQueue;
    const station = rawStation;

    console.log(`✅ ${getTimestamp()} - POST /call received: ${queue}, ${station}`);
    enqueueCall(queue, station);
    res.sendStatus(200);
});

module.exports = router;