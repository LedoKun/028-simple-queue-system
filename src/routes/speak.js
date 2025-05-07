// ./src/routes/speak.js

const express = require('express');
const fs = require('fs');
const router = express.Router();

const config = require('../config');
const ttsService = require('../services/ttsService');
const { speakLimiter } = require('../rateLimiters');
const { handleServerError } = require('../errorHandlers');
const logger = require('../logger');

// --- Concurrency Lock for Online Generation ---
// This Set tracks cache paths currently being written by online generation
// It's managed within this route file.
const currentlyGeneratingOnline = global.ttsGeneratingLocks || new Set(); // Use global workaround
global.ttsGeneratingLocks = currentlyGeneratingOnline; // Ensure global ref exists
// --- End Lock ---


/**
 * Helper to wait for a file to potentially appear or for a lock to be released.
 * Checks both the file existence and if the path is in the provided lock Set.
 * @param {string} filePath - The path to the final file.
 * @param {Set<string>} lockSet - The Set holding locks for paths currently being processed.
 * @param {number} maxWaitMs - Maximum time to wait in milliseconds.
 * @param {number} intervalMs - How often to check in milliseconds.
 * @returns {Promise<boolean>} - True if file exists and lock is released, False otherwise (timed out or lock released but file absent).
 */
async function waitForFileOrLock(filePath, lockSet, maxWaitMs = 5000, intervalMs = 250) {
    const endTime = Date.now() + maxWaitMs;
    logger.debug(`Waiting up to ${maxWaitMs}ms for lock/file: ${filePath}`);
    while (Date.now() < endTime) {
        const lockHeld = lockSet.has(filePath);
        const fileExists = fs.existsSync(filePath);

        if (!lockHeld && fileExists) {
            logger.debug(`File ${filePath} exists and lock released.`);
            return true; // File is ready
        }
        if (!lockHeld && !fileExists) {
            // Lock released, but file still doesn't exist - proceed to generate/fallback
            logger.debug(`Lock for ${filePath} released, but file still absent. Proceeding.`);
            return false;
        }
        // If lock is still held, continue waiting
        logger.debug(`Still waiting for lock/file: ${filePath}. Lock held: ${lockHeld}, File exists: ${fileExists}`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    logger.warn(`Timeout waiting ${maxWaitMs}ms for file or lock release: ${filePath}. Lock held: ${lockSet.has(filePath)}`);
    // If timeout occurred, return false only if lock is still held OR file doesn't exist.
    // If lock released AND file exists just as timeout hits, consider it ready.
    return !lockSet.has(filePath) && fs.existsSync(filePath);
}


router.get('/speak', speakLimiter, async (req, res) => {
    const rawQueue = String(req.query.queue || '').toUpperCase().trim();
    const rawStation = String(req.query.station || '').trim();
    const rawLang = String(req.query.lang || '').toLowerCase().trim();

    // Use raw values consistently
    const queue = rawQueue;
    const station = rawStation;
    const lang = rawLang;

    let cachePath; // Define cachePath early for use in error/finally blocks

    try {
        // --- Basic Input Validation ---
        if (!queue || !station || !lang) {
            logger.warn('Missing parameters for /speak:', { queue, station, lang });
            return res.status(400).json({ error: 'Queue, station, and lang parameters are required.' });
        }
        if (!config.languageCodes.includes(lang)) {
            logger.warn('Unsupported /speak language parameter:', lang);
            return res.status(400).json({ error: 'Language is not supported' });
        }

        let audioStream;
        let streamSource = 'unknown';
        let cacheControl = 'public, max-age=86400';
        cachePath = ttsService.getCachedFilePath(lang, queue, station);

        if (config.useAtomicOfflineTts) {
            // --- MODE 1: Explicitly OFFLINE ---
            logger.info(`Handling /speak via EXPLICIT OFFLINE TTS for lang: ${lang}, queue: ${queue}, station: ${station}`);
            try {
                // getStitchedAudioStream handles checking cache, stitching if needed, and its own stitching lock
                audioStream = await ttsService.getStitchedAudioStream(lang, queue, station);
                streamSource = 'offline-stitched';
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

            let cacheExists = fs.existsSync(cachePath);

            // --- Check if online generation is currently in progress ---
            if (!cacheExists && currentlyGeneratingOnline.has(cachePath)) {
                logger.warn(`Online generation seems in progress for ${cachePath}. Waiting...`);
                cacheExists = await waitForFileOrLock(cachePath, currentlyGeneratingOnline);
            }

            // --- Serve from cache if available (and not locked/still generating) ---
            if (cacheExists) {
                logger.info(`Online-First TTS: Serving completed cached audio: ${cachePath}`);
                audioStream = fs.createReadStream(cachePath);
                streamSource = 'cache';
            } else {
                // --- Cache miss or file didn't appear after waiting ---
                logger.info(`Online-First TTS: Cache miss/unavailable for ${cachePath}. Attempting generation.`);

                // --- Acquire Lock Before Online Generation ---
                if (currentlyGeneratingOnline.has(cachePath)) {
                    // This check is a safeguard; waitForFileOrLock should prevent reaching here if lock held & file absent.
                    // If it happens, it indicates a potential issue or very fast subsequent request.
                    logger.error(`Race condition detected: Attempting to generate ${cachePath} while lock is already held.`);
                    // Option 1: Wait again (might lead to longer delays)
                    // cacheExists = await waitForFileOrLock(cachePath, currentlyGeneratingOnline);
                    // if (cacheExists) { /* Serve cache */ } else { /* Error out */ }
                    // Option 2: Error out immediately
                    return res.status(509).send('Generation already in progress, please wait and retry.'); // 509 Bandwidth Limit Exceeded might fit semantically
                }
                currentlyGeneratingOnline.add(cachePath);
                logger.debug(`Acquired online generation lock for ${cachePath}`);
                // --- End Acquire Lock ---

                let onlineGenAttempted = false; // Flag to know if we need to release lock in catch
                try {
                    // --- Attempt Online Generation ---
                    const { text: fullPhraseText, speakLang } = ttsService.prepareTTSForOnlineMode(lang, queue, station);
                    onlineGenAttempted = true; // Mark that we are trying online gen
                    // generateOnlineTtsStream handles writing to .tmp, rename, and lock release on its own internal events
                    audioStream = await ttsService.generateOnlineTtsStream(fullPhraseText, speakLang, cachePath);
                    streamSource = 'online-generated';
                    logger.info(`Online TTS: Generation initiated, streaming result for: ${cachePath}`);
                    // Lock is released within generateOnlineTtsStream

                } catch (onlineError) {
                    // --- Release Lock if Sync Error Occurred During Setup ---
                    if (onlineGenAttempted && currentlyGeneratingOnline.has(cachePath)) {
                        currentlyGeneratingOnline.delete(cachePath);
                        logger.debug(`Released online generation lock for ${cachePath} after synchronous online error.`);
                    }
                    // --- End Release Lock ---

                    logger.warn(`Online TTS generation failed for ${lang},${queue},${station}. Falling back to OFFLINE. Error: ${onlineError.message}`);
                    try {
                        // --- Attempt Offline Fallback ---
                        // getStitchedAudioStream includes its own lock for stitching process
                        audioStream = await ttsService.getStitchedAudioStream(lang, queue, station);
                        streamSource = 'offline-fallback';
                        logger.info(`Offline Fallback: Serving audio (cached or newly stitched): ${cachePath}`);
                    } catch (offlineFallbackError) {
                        logger.error(`Offline Fallback TTS failed for ${lang},${queue},${station} after online failed: ${offlineFallbackError.message}`);
                        if (offlineFallbackError.message.includes('components not found')) {
                            return res.status(404).json({ error: `Audio generation failed online, and required offline components not found. Missing: ${offlineFallbackError.message.split('Missing: ')[1]}` });
                        }
                        return res.status(500).json({ error: 'Failed to generate audio both online and offline.' });
                    }
                }
                // Note: No 'finally' block needed here for the lock, as generateOnlineTtsStream handles its own release on async completion/error.
                // The synchronous error case is handled in the 'catch' block above.
            }
        }

        // --- Stream the result ---
        if (audioStream) {
            logger.info(`Streaming audio to client. Source: ${streamSource}, Path: ${cachePath}`);
            res.set({
                'Content-Type': 'audio/mpeg',
                'Cache-Control': cacheControl
            });

            // Handle stream closure/errors specifically
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
                if (!clientClosed) { // Don't log error if client simply disconnected
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
            if (currentlyGeneratingOnline.has(cachePath)) {
                logger.warn(`Releasing potentially dangling lock for ${cachePath} due to null stream.`);
                currentlyGeneratingOnline.delete(cachePath);
            }
            return res.status(500).json({ error: 'Internal error creating audio stream.' });
        }

    } catch (err) {
        // Generic error handler for setup issues before streaming starts
        if (cachePath && currentlyGeneratingOnline.has(cachePath)) {
            logger.warn(`Releasing lock for ${cachePath} due to top-level error: ${err.message}`);
            currentlyGeneratingOnline.delete(cachePath);
        }
        handleServerError(err, res, 'speak');
    }
});


// Add this listener for process exit to clear locks (optional but good practice)
process.on('exit', () => {
    logger.info('Server shutting down, clearing generation locks.');
    currentlyGeneratingOnline.clear();
});
// Ensure locks are cleared on interrupt signals too
const cleanupAndExit = () => {
    logger.info('Signal received, clearing locks and exiting.');
    currentlyGeneratingOnline.clear();
    process.exit();
};
process.on('SIGINT', cleanupAndExit); // Handle Ctrl+C
process.on('SIGTERM', cleanupAndExit); // Handle kill signals


module.exports = router;