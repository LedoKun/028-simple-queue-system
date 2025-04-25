// ./services/queueService.js

const config = require('../config');
const { getTimestamp } = require('../utils');
const logger = require('../logger');

let clients = [];
const pendingCalls = [];
let isProcessingQueue = false;
const lastProcessedTime = {};

/**
 * Add a new SSE client connection.
 */
function addClient(res) {
    clients.push(res);
    logger.info('Client connected. Total clients:', clients.length);
}

/**
 * Remove a disconnected SSE client.
 */
function removeClient(res) {
    clients = clients.filter(c => c !== res);
    logger.info('Client disconnected. Total clients:', clients.length);
}

/**
 * Enqueue a queue call if not debounced or duplicated.
 */
function enqueueCall(queue, station) {
    const now = Date.now();
    const callKey = `${queue}:${station}`;

    if (lastProcessedTime[callKey] &&
        now - lastProcessedTime[callKey] < config.debounceIntervalMs) {
        logger.warn('Debounced call (within debounce interval):', callKey);
        return;
    }

    if (pendingCalls.some(c => c.callKey === callKey)) {
        logger.warn('Duplicate call already pending:', callKey);
        return;
    }

    pendingCalls.push({ queue, station, callKey });
    logger.info('Enqueued call:', callKey, 'Pending calls:', pendingCalls.length);

    if (!isProcessingQueue) {
        processQueue();
    }
}

/**
 * Process the next call in the queue with debouncing.
 */
function processQueue() {
    if (pendingCalls.length === 0) {
        isProcessingQueue = false;
        logger.info('Queue empty, stopping processing.');
        return;
    }

    isProcessingQueue = true;
    const callObj = pendingCalls.shift();
    lastProcessedTime[callObj.callKey] = Date.now();

    logger.info('Processing call:', callObj.callKey);

    const payload = JSON.stringify({
        type: 'queue_call',
        data: { queue: callObj.queue, station: callObj.station }
    });

    // Broadcast to all connected clients
    clients = clients.filter(res => {
        const closed = res.writableEnded || res.writableFinished;
        if (closed) return false;
        try {
            res.write(`data: ${payload}\n\n`);
            return true;
        } catch (err) {
            logger.error('Failed to write to client, removing client.', err);
            return false;
        }
    });

    // Schedule next processing after debounce interval
    setTimeout(processQueue, config.debounceIntervalMs);
}

/**
 * Kick off periodic public announcements via SSE.
 */
function startPublicAnnouncements() {
    logger.info(
        `Scheduling public announcements every ${config.announcementIntervalMs}ms ` +
        `(starting after ${config.announcementStartDelayMs}ms)`
    );

    const announce = () => {
        logger.info('Broadcasting public announcement cycle start.');
        const payload = JSON.stringify({ type: 'public_announcement_cycle_start' });

        clients = clients.filter(res => {
            const closed = res.writableEnded || res.writableFinished;
            if (closed) return false;
            try {
                res.write(`data: ${payload}\n\n`);
                return true;
            } catch (err) {
                logger.error('Failed to write announcement to client, removing client.', err);
                return false;
            }
        });
    };

    // Delay initial start, then repeat at interval
    setTimeout(() => {
        announce();
        setInterval(announce, config.announcementIntervalMs);
    }, config.announcementStartDelayMs);
}

/**
 * Manual trigger for a public announcement cycle.
 */
function triggerAnnouncement() {
    logger.info('Manual public announcement trigger.');

    const payload = JSON.stringify({ type: 'public_announcement_cycle_start' });
    clients = clients.filter(res => {
        const closed = res.writableEnded || res.writableFinished;
        if (closed) return false;
        try {
            res.write(`data: ${payload}\n\n`);
            return true;
        } catch (err) {
            logger.error('Failed to write manual announcement to client, removing client.', err);
            return false;
        }
    });
}

module.exports = {
    addClient,
    removeClient,
    enqueueCall,
    startPublicAnnouncements,
    triggerAnnouncement,
};
