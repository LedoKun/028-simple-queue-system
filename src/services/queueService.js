// ./services/queueService.js

const fs = require('fs');
const config = require('../config');
const logger = require('../logger');
const {
    prepareTTSForOnlineMode,
    generateOnlineTtsStream,
    getStitchedAudioStream,
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
            if (i > 0) await delay(100); // Small delay between generation attempts per language

            if (config.useAtomicOfflineTts) {
                // --- Pre-cache using OFFLINE stitching ---
                try {
                    logger.debug(`[Cache] Attempting offline stitch for ${lang} ${callKey}`);
                    // Call to trigger stitching and caching. Await completion.
                    await getStitchedAudioStream(lang, queue, station);
                    // We don't need the stream, just the side effect. Note: getStitchedAudioStream returns a stream,
                    // but we don't need to consume it here as we just waited for file creation.
                    logger.info(`[Cache] Successfully pre-cached OFFLINE audio for ${lang} ${callKey}`);
                } catch (offlineErr) {
                    logger.error(`[Cache] Failed to pre-cache OFFLINE audio for ${lang} ${callKey}: ${offlineErr.message}`);
                }
            } else {
                // --- Pre-cache using ONLINE generation (with offline fallback) ---
                try {
                    logger.debug(`[Cache] Attempting online generation for ${lang} ${callKey}`);
                    const { text, speakLang } = prepareTTSForOnlineMode(lang, queue, station);

                    // Await completion of online generation and caching.
                    await generateOnlineTtsStream(text, speakLang, cachePath);

                    // If the await completes without throwing, caching was successful.
                    logger.info(`[Cache] Successfully pre-cached ONLINE audio for ${lang} ${callKey}`);

                } catch (onlineErr) {
                    // This catch block handles *all* failures from generateOnlineTtsStream
                    logger.warn(`[Cache] Background ONLINE generation failed for ${lang} ${callKey}: ${onlineErr.message}. Attempting offline fallback.`);
                    // --- Try offline fallback on online error ---
                    try {
                        await getStitchedAudioStream(lang, queue, station);
                        logger.info(`[Cache] Successfully pre-cached OFFLINE fallback audio for ${lang} ${callKey}`);
                        // Again, ignore/discard the returned stream
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
    const payload = JSON.stringify({ type: 'queue_call', data: { queue: callObj.queue, station: callObj.station } });
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