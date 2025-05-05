// ./routes/events.js

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const { addClient, removeClient } = require('../services/queueService');

// SSE endpoint: Stream queue calls and announcement events to clients
router.get('/events', (req, res) => {
    // Set headers to keep the connection open for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    logger.info('Client connected to /events SSE');
    addClient(res);

    // Heartbeat interval to prevent timeouts
    const HEARTBEAT_INTERVAL = 1000;
    const heartbeat = setInterval(() => {
        if (res.writableEnded || res.writableFinished) {
            clearInterval(heartbeat);
            return;
        }
        try {
            res.write(': heartbeat\n\n');
        } catch (err) {
            logger.error('Error sending SSE heartbeat', err);
            clearInterval(heartbeat);
        }
    }, HEARTBEAT_INTERVAL);

    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        removeClient(res);
        logger.info('Client disconnected from /events SSE');
    });
});

module.exports = router;
