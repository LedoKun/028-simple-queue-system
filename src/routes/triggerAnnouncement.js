// ./routes/triggerAnnouncement.js

const express = require('express');
const router = express.Router();

const { triggerAnnouncement } = require('../services/queueService');
const { triggerLimiter } = require('../rateLimiters');
const logger = require('../logger');

/**
 * POST /trigger-announcement
 * Rate-limited manual trigger for public announcement cycles.
 */
router.post(
    '/trigger-announcement',
    triggerLimiter,
    (req, res) => {
        logger.info('Manual public announcement trigger received');
        try {
            triggerAnnouncement();
            res.sendStatus(200);
        } catch (err) {
            logger.error('Error triggering announcement:', err);
            res.status(500).json({ error: 'Failed to trigger announcement' });
        }
    }
);

module.exports = router;
