const express = require('express');
const router = express.Router();
const { addClient, removeClient } = require('../services/queueService');

router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    addClient(res);

    const heartbeat = setInterval(() => {
        if (res.writableEnded || res.writableFinished) {
            clearInterval(heartbeat);
            return;
        }
        try { res.write(': heartbeat\n\n'); } catch {
            clearInterval(heartbeat);
        }
    }, 15000);

    req.on('close', () => {
        clearInterval(heartbeat);
        removeClient(res);
    });
});

module.exports = router;