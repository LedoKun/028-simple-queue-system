// ./services/queueService.js

const fs = require('fs');
const config = require('../config');
const logger = require('../logger');
const {
    prepareTTSForOnlineMode,
    generateOnlineTtsStream,
    getStitchedAudioStream, // Ensure this is imported for offline caching
    getCachedFilePath,
} = require('./ttsService');

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
 * Also triggers background pre-caching of TTS audio if not already cached.
 */
async function enqueueCall(queue, station) {
    const now = Date.now();
    const callKey = `${queue}:${station}`;

    // --- Debounce and Duplicate Check ---
    if (lastProcessedTime[callKey] &&
        now - lastProcessedTime[callKey] < config.debounceIntervalMs) {
        logger.warn(`Debounced call (within ${config.debounceIntervalMs}ms):`, callKey);
        return;
    }
    if (pendingCalls.some(c => c.callKey === callKey)) {
        logger.warn('Duplicate call already pending:', callKey);
        return;
    }

    // --- Add to Pending Queue ---
    pendingCalls.push({ queue, station, callKey });
    logger.info('Enqueued call:', callKey, 'Pending calls:', pendingCalls.length);

    const delay = ms => new Promise(res => setTimeout(res, ms));

    // --- Background TTS Pre-caching ---
    logger.debug(`Checking cache status for call ${callKey}`);
    for (const [i, lang] of config.languageCodes.entries()) {
        const cachePath = getCachedFilePath(lang, queue, station);

        if (!fs.existsSync(cachePath)) {
            logger.info(`Cache miss for ${lang} ${callKey} (${cachePath}). Attempting background generation/stitching.`);
            if (i > 0) await delay(500); // Small delay between generation attempts per language

            if (config.useAtomicOfflineTts) {
                // --- Pre-cache using OFFLINE stitching ---
                try {
                    logger.debug(`[Cache] Attempting offline stitch for ${lang} ${callKey}`);
                    // We call it just to trigger the stitching and caching process.
                    // We don't need the stream itself here, just the side effect of file creation.
                    const stream = await getStitchedAudioStream(lang, queue, station);
                    // Ensure stream resources are released if not consumed
                    if (stream && typeof stream.destroy === 'function') {
                        stream.destroy();
                    }
                    logger.info(`[Cache] Successfully pre-cached OFFLINE audio for ${lang} ${callKey}`);
                } catch (offlineErr) {
                    logger.error(`[Cache] Failed to pre-cache OFFLINE audio for ${lang} ${callKey}: ${offlineErr.message}`);
                    // Log the error, but don't stop the main enqueue process
                }
            } else {
                // --- Pre-cache using ONLINE generation (with offline fallback) ---
                try {
                    logger.debug(`[Cache] Attempting online generation for ${lang} ${callKey}`);
                    const { text, speakLang } = prepareTTSForOnlineMode(lang, queue, station);
                    const ttsPassThrough = await generateOnlineTtsStream(text, speakLang, cachePath);

                    // Consume the PassThrough stream to ensure download/caching proceeds
                    ttsPassThrough.on('data', () => { }); // Absorb data
                    ttsPassThrough.on('end', () => {
                        // Logging is handled inside generateOnlineTtsStream upon finish/rename
                        logger.debug(`[Cache] Background online TTS stream finished for ${lang} ${callKey}`);
                    });
                    ttsPassThrough.on('error', (err) => {
                        // Error during caching is handled within generateOnlineTtsStream,
                        // but we might want to trigger the offline fallback *here* as well.
                        logger.warn(`[Cache] Background ONLINE generation stream failed for ${lang} ${callKey}: ${err.message}. Attempting offline fallback.`);
                        // --- Try offline fallback on online error ---
                        getStitchedAudioStream(lang, queue, station)
                            .then(stream => {
                                logger.info(`[Cache] Successfully pre-cached OFFLINE fallback audio for ${lang} ${callKey}`);
                                if (stream && typeof stream.destroy === 'function') {
                                    stream.destroy(); // Clean up stream
                                }
                            })
                            .catch(offlineFallbackErr => {
                                logger.error(`[Cache] OFFLINE fallback pre-cache also failed for ${lang} ${callKey}: ${offlineFallbackErr.message}`);
                            });
                    });
                    logger.info(`[Cache] Initiated background ONLINE audio generation for ${lang} ${callKey}`);

                } catch (initialOnlineErr) {
                    // Catch synchronous errors from prepareTTS or generateOnlineTtsStream setup
                    logger.error(`[Cache] Initial ONLINE generation setup failed for ${lang} ${callKey}: ${initialOnlineErr.message}. Attempting offline fallback.`);
                    // --- Try offline fallback on initial online error ---
                    try {
                        const stream = await getStitchedAudioStream(lang, queue, station);
                        logger.info(`[Cache] Successfully pre-cached OFFLINE fallback audio for ${lang} ${callKey}`);
                        if (stream && typeof stream.destroy === 'function') {
                            stream.destroy(); // Clean up stream
                        }
                    } catch (offlineFallbackErr) {
                        logger.error(`[Cache] OFFLINE fallback pre-cache also failed for ${lang} ${callKey}: ${offlineFallbackErr.message}`);
                    }
                }
            }
        } else {
            logger.debug(`Cache hit for ${lang} ${callKey} (${cachePath}). No background generation needed.`);
        }
    } // End language loop

    // --- Trigger Queue Processing ---
    if (!isProcessingQueue) {
        processQueue();
    }
}

/**
 * Process the next call in the queue.
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

    setTimeout(processQueue, config.debounceIntervalMs);
}

/**
 * Kick off periodic public announcements via SSE.
 */
function startPublicAnnouncements() {
    // ... (implementation remains the same) ...
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

    setTimeout(() => {
        announce();
        setInterval(announce, config.announcementIntervalMs);
    }, config.announcementStartDelayMs);
}

/**
 * Manual trigger for a public announcement cycle.
 */
function triggerAnnouncement() {
    // ... (implementation remains the same) ...
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