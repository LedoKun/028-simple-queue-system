const express = require('express');
const router = express.Router();
const { getTimestamp } = require('../utils');
const { triggerAnnouncement } = require('../services/queueService');
const { triggerLimiter } = require('../rateLimiters');

router.post('/trigger-announcement', triggerLimiter, (req, res) => {
    console.log(`📢 ${getTimestamp()} - Manual trigger received`);
    triggerAnnouncement();
    res.sendStatus(200);
});

module.exports = router;
