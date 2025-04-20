const express = require('express');
const router = express.Router();
const { triggerLimiter } = require('../rateLimiters');
const { triggerAnnouncement } = require('../services/queueService');
const { getTimestamp } = require('../utils');

router.post('/trigger-announcement', triggerLimiter, (req, res) => {
    console.log(`${getTimestamp()} - Manual trigger received`);
    triggerAnnouncement();
    res.sendStatus(200);
});

module.exports = router;
