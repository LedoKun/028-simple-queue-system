const express = require('express');
const router = express.Router();
const { enqueueCall } = require('../services/queueService');
const { getTimestamp } = require('../utils');
const { callLimiter } = require('../rateLimiters');

router.post('/call', callLimiter, (req, res) => {
    const queue = String(req.body.queue || '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
    const station = String(req.body.station || '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
    if (!queue || !station) {
        console.warn(`${getTimestamp()} - POST /call - Invalid data.`);
        return res.status(400).send('Invalid queue or station');
    }
    console.log(`${getTimestamp()} - POST /call received: ${queue}, ${station}`);
    enqueueCall(queue, station);
    res.sendStatus(200);
});

module.exports = router;