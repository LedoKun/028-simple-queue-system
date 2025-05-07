// ./src/routes/speak.js

const express = require('express');
const fs = require('fs');
const router = express.Router();

const config = require('../config');
const ttsService = require('../services/ttsService');
const { speakLimiter } = require('../rateLimiters');
const { handleServerError } = require('../errorHandlers');
const logger = require('../logger');

// Helper for small delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Using global as a temporary workaround for shared state with ttsService. Refactor recommended.
global.ttsGeneratingLocks = global.ttsGeneratingLocks || new Set();
const currentlyGeneratingOnline = global.ttsGeneratingLocks;

/**
 * Helper to wait for a file to exist and potentially have content,
 * or for a lock to be released.
 * @param {string} filePath - The path to the final file.
 * @param {Set<string>} lockSet - The Set holding locks for paths currently being processed.
 * @param {number} maxWaitMs - Maximum time to wait in milliseconds.
 * @param {number} intervalMs - How often to check in milliseconds.
 * @returns {Promise<boolean>} - True if file exists with size > 0 and lock is released, False otherwise.
 */
async function waitForFileReady(filePath, lockSet, maxWaitMs = 5000, intervalMs = 250) {
    const endTime = Date.now() + maxWaitMs;
    logger.debug(`Waiting up to ${maxWaitMs}ms for ready file: ${filePath}`);
    while (Date.now() < endTime) {
        const lockHeld = lockSet.has(filePath);
        let fileReady = false;
        if (!lockHeld && fs.existsSync(filePath)) {
            try {
                const stats = fs.statSync(filePath);
                if (stats.size > 0) {
                    fileReady = true; // File exists, has content, and lock is released
                } else {
                    logger.debug(`File ${filePath} exists but size is 0. Still waiting...`);
                }
            } catch (statError) {
                // Error stating the file, might be transient, keep waiting
                logger.warn(`Error stating file ${filePath} while waiting: ${statError.message}`);
            }
        }

        if (fileReady) {
            logger.debug(`File ${filePath} ready (exists, size > 0, lock released).`);
            return true;
        }

        if (!lockHeld && !fileReady) {
            // Lock released, but file still not ready (doesn't exist or size 0)
            logger.debug(`Lock for ${filePath} released, but file not ready. Proceeding to generate/fallback.`);
            return false;
        }

        // If lock is still held, or file exists but size is 0, continue waiting
        logger.debug(`Still waiting for file: ${filePath}. Lock held: ${lockHeld}, File ready: ${fileReady}`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    logger.warn(`Timeout waiting ${maxWaitMs}ms for file ready: ${filePath}. Lock held: ${lockSet.has(filePath)}`);
    // Final check after timeout
    try {
        return !lockSet.has(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
    } catch {
        return false;
    }
}


router.get('/speak', speakLimiter, async (req, res) => {
    const rawQueue = String(req.query.queue || '').toUpperCase().trim();
    const rawStation = String(req.query.station || '').trim();
    const rawLang = String(req.query.lang || '').toLowerCase().trim();

    const queue = rawQueue;
    const station = rawStation;
    const lang = rawLang;
    let cachePath; // Define cachePath early

    try {
        // --- Basic Input Validation ---
        if (!queue || !station || !lang || !config.languageCodes.includes(lang)) {
            logger.warn('Invalid parameters for /speak:', { queue, station, lang });
            return res.status(400).json({ error: 'Valid Queue, station, and supported lang parameters are required.' });
        }

        cachePath = ttsService.getCachedFilePath(lang, queue, station);
        let audioStream;
        let streamSource = 'unknown';
        let cacheControl = 'public, max-age=86400';

        if (config.useAtomicOfflineTts) {
            // --- MODE 1: Explicitly OFFLINE ---
            logger.info(`Handling /speak via EXPLICIT OFFLINE TTS for lang: ${lang}, queue: ${queue}, station: ${station}`);
            try {
                audioStream = await ttsService.getStitchedAudioStream(lang, queue, station);
                streamSource = 'offline-stitched (explicit)';
                logger.info(`Offline TTS: Serving audio (cached or newly stitched): ${cachePath}`);
            } catch (offlineError) {
                logger.error(`Explicit Offline TTS processing failed for ${lang},${queue},${station}: ${offlineError.message}`);
                if (offlineError.message.includes('components not found')) {
                    return res.status(404).json({ error: offlineError.message });
                }
                return res.status(500).json({ error: 'Failed to process offline audio.' });
            }
        } else {
            // --- MODE 2: ONLINE FIRST with OFFLINE FALLBACK ---
            logger.info(`Handling /speak via ONLINE-FIRST TTS for lang: ${lang}, queue: ${queue}, station: ${station}`);

            let fileIsReady = false;
            // Check if file exists and is ready (size > 0, lock released)
            if (fs.existsSync(cachePath)) {
                try {
                    const stats = fs.statSync(cachePath);
                    if (stats.size > 0 && !currentlyGeneratingOnline.has(cachePath)) {
                        fileIsReady = true;
                        logger.debug(`File ${cachePath} is ready: size > 0 and no lock held.`);
                    }
                } catch (e) {
                    logger.debug(`Error checking file ${cachePath}: ${e.message}`);
                }
            }

            // If file isn't ready, but a lock exists, wait for it
            if (!fileIsReady && currentlyGeneratingOnline.has(cachePath)) {
                logger.warn(`Online generation seems in progress for ${cachePath}. Waiting...`);
                fileIsReady = await waitForFileReady(cachePath, currentlyGeneratingOnline);
            }

            // --- Serve from cache if available and ready ---
            if (fileIsReady) {
                logger.info(`Online-First TTS: Serving completed cached audio: ${cachePath}`);
                // Add small delay before reading potentially recently written file
                await delay(50);
                audioStream = fs.createReadStream(cachePath);
                streamSource = 'cache';
            } else {
                // --- Cache miss or file wasn't ready after waiting ---
                logger.info(`Online-First TTS: Cache miss or file not ready for ${cachePath}. Attempting generation.`);

                // --- Acquire Lock Before Online Generation ---
                if (currentlyGeneratingOnline.has(cachePath)) {
                    logger.error(`Race condition detected: Attempting to generate ${cachePath} while lock is still held (after wait).`);
                    return res.status(509).send('Server processing conflict, please retry.'); // Use appropriate status code
                }
                currentlyGeneratingOnline.add(cachePath);
                logger.debug(`Acquired online generation lock for ${cachePath}`);
                // --- End Acquire Lock ---

                try {
                    // --- Attempt Online Generation ---
                    const { text: fullPhraseText, speakLang } = ttsService.prepareTTSForOnlineMode(lang, queue, station);
                    // Await completion (generateOnlineTtsStream handles lock release internally)
                    await ttsService.generateOnlineTtsStream(fullPhraseText, speakLang, cachePath);

                    logger.info(`Online TTS: Generation successful, serving generated file: ${cachePath}`);
                    // Add small delay *after* generation completes before reading
                    await delay(50);
                    audioStream = fs.createReadStream(cachePath);
                    streamSource = 'online-generated (now cached)';

                } catch (onlineError) {
                    // Lock should have been released by generateOnlineTtsStream on error
                    if (currentlyGeneratingOnline.has(cachePath)) {
                        logger.warn(`Lock still held for ${cachePath} after online generation error. Releasing.`);
                        currentlyGeneratingOnline.delete(cachePath);
                    }
                    logger.warn(`Online TTS generation failed for ${lang},${queue},${station}. Falling back to OFFLINE. Error: ${onlineError.message}`);
                    try {
                        // --- Attempt Offline Fallback ---
                        audioStream = await ttsService.getStitchedAudioStream(lang, queue, station);
                        streamSource = 'offline-fallback';
                        logger.info(`Offline Fallback: Serving audio (cached or newly stitched): ${cachePath}`);
                    } catch (offlineFallbackError) {
                        // --- Offline Fallback ALSO Failed ---
                        logger.error(`Offline Fallback TTS failed for ${lang},${queue},${station} after online failed: ${offlineFallbackError.message}`);
                        if (offlineFallbackError.message.includes('components not found')) {
                            return res.status(404).json({ error: `Audio generation failed online, and required offline components not found. Missing: ${offlineFallbackError.message.split('Missing: ')[1]}` });
                        }
                        return res.status(500).json({ error: 'Failed to generate audio both online and offline.' });
                    }
                }
            }
        }

        // --- Stream the result ---
        if (audioStream) {
            logger.info(`Streaming audio to client. Source: ${streamSource}, Path: ${cachePath}`);
            res.set({
                'Content-Type': 'audio/mpeg',
                'Cache-Control': cacheControl
            });

            let clientClosed = false;
            req.on('close', () => {
                clientClosed = true;
                logger.warn(`Client closed connection for ${cachePath} while streaming.`);
                if (audioStream && typeof audioStream.destroy === 'function') {
                    audioStream.destroy();
                }
            });

            audioStream.pipe(res);

            audioStream.on('error', (streamErr) => {
                if (!clientClosed) {
                    logger.error(`Error streaming audio to client (${streamSource}): ${streamErr.message}`);
                    if (!res.headersSent) {
                        res.status(500).send('Error streaming audio');
                    } else if (!res.writableEnded) {
                        res.end();
                    }
                }
            });
            audioStream.on('end', () => {
                logger.debug(`Finished streaming ${streamSource} audio for ${cachePath}`);
            });
        } else {
            logger.error("Audio stream was unexpectedly null after processing /speak request.");
            if (cachePath && currentlyGeneratingOnline.has(cachePath)) { // Check cachePath exists
                logger.warn(`Releasing potentially dangling lock for ${cachePath} due to null stream.`);
                currentlyGeneratingOnline.delete(cachePath);
            }
            return res.status(500).json({ error: 'Internal error creating audio stream.' });
        }

    } catch (err) {
        // Generic error handler for setup/validation issues
        if (cachePath && currentlyGeneratingOnline.has(cachePath)) { // Check cachePath exists
            logger.warn(`Releasing lock for ${cachePath} due to top-level error: ${err.message}`);
            currentlyGeneratingOnline.delete(cachePath);
        }
        handleServerError(err, res, 'speak');
    }
});


// Process exit handlers
process.on('exit', () => { logger.info('Server shutting down, clearing generation locks.'); currentlyGeneratingOnline.clear(); });
const cleanupAndExit = () => { logger.info('Signal received, clearing locks and exiting.'); currentlyGeneratingOnline.clear(); process.exit(); };
process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);

module.exports = router;