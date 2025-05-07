// ./src/routes/speak.js

const express = require('express');
const fs = require('fs');
const router = express.Router();

const config = require('../config');
const ttsService = require('../services/ttsService'); // Import the whole service
const { speakLimiter } = require('../rateLimiters');
const { handleServerError } = require('../errorHandlers');
const logger = require('../logger');

/**
 * GET /speak
 * Query params: queue (e.g. A123), station (e.g. 5), lang ("th" or "en")
 * Serves TTS audio. Uses offline stitched/cached files if config.useAtomicOfflineTts is true,
 * otherwise uses online GTTS generation/caching.
 */
router.get('/speak', speakLimiter, async (req, res) => {
    const rawQueue = String(req.query.queue || '').toUpperCase().trim();
    const rawStation = String(req.query.station || '').trim();
    const rawLang = String(req.query.lang || '').toLowerCase().trim();

    try {
        // Basic input validation
        if (!rawQueue || !rawStation || !rawLang) {
            logger.warn('Missing parameters for /speak:', { queue: rawQueue, station: rawStation, lang: rawLang });
            return res.status(400).json({ error: 'Queue, station, and lang parameters are required.' });
        }
        if (!config.languageCodes.includes(rawLang)) {
            logger.warn('Unsupported /speak language parameter:', rawLang);
            return res.status(400).json({ error: 'Language is not supported' });
        }

        let audioStream;
        let cacheControl = 'no-store'; // Default for potentially dynamic content

        if (config.useAtomicOfflineTts) {
            // --- OFFLINE ATOMIC TTS MODE ---
            logger.info(`Handling /speak via OFFLINE TTS for lang: ${rawLang}, queue: ${rawQueue}, station: ${rawStation}`);
            try {
                // getStitchedAudioStream handles checking cache, stitching, caching new file, and returning a stream
                audioStream = await ttsService.getStitchedAudioStream(rawLang, rawQueue, rawStation);
                // If successful, we can assume the content is stable for a while
                cacheControl = 'public, max-age=86400'; // Cache stitched files aggressively
            } catch (offlineError) {
                logger.error(`Offline TTS processing failed for ${rawLang},${rawQueue},${rawStation}: ${offlineError.message}`);
                // Send specific error based on the caught error if possible
                if (offlineError.message.includes('components not found')) {
                    return res.status(404).json({ error: offlineError.message });
                }
                // Otherwise, general server error
                return res.status(500).json({ error: 'Failed to process offline audio.' });
            }

        } else {
            // --- ONLINE GTTS MODE ---
            logger.info(`Handling /speak via ONLINE TTS for lang: ${rawLang}, queue: ${rawQueue}, station: ${rawStation}`);
            const queue = rawQueue; // Use raw values for online mode (or apply padding if needed)
            const station = rawStation;
            const lang = rawLang;

            const cachePath = ttsService.getCachedFilePath(lang, queue, station); // Use service function
            if (fs.existsSync(cachePath)) {
                logger.info('Online TTS: Serving cached audio:', cachePath);
                audioStream = fs.createReadStream(cachePath);
                cacheControl = 'public, max-age=86400'; // Cached online file
            } else {
                logger.info('Online TTS: Cache miss, generating new stream:', cachePath);
                try {
                    const { text: fullPhraseText, speakLang } = ttsService.prepareTTSForOnlineMode(lang, queue, station);
                    // generateOnlineTtsStream resolves with the PassThrough stream immediately
                    audioStream = await ttsService.generateOnlineTtsStream(fullPhraseText, speakLang, cachePath);
                    cacheControl = 'public, max-age=86400'; // Cache the newly generated file
                } catch (onlineError) {
                    logger.error(`Online TTS generation failed for ${lang},${queue},${station}: ${onlineError.message}`);
                    return res.status(500).json({ error: 'Failed to generate audio.' });
                }
            }
        }

        // --- Stream the result ---
        if (audioStream) {
            res.set({
                'Content-Type': 'audio/mpeg',
                'Cache-Control': cacheControl
            });
            audioStream.pipe(res);
            // Handle stream errors during piping
            audioStream.on('error', (streamErr) => {
                logger.error(`Error streaming audio to client: ${streamErr.message}`);
                // Attempt to end response if possible
                if (!res.headersSent) {
                    res.status(500).send('Error streaming audio');
                } else if (!res.writableEnded) {
                    res.end();
                }
            });
        } else {
            // This case should ideally be caught by earlier checks/errors
            logger.error("Audio stream was unexpectedly null after processing /speak request.");
            return res.status(500).json({ error: 'Internal error creating audio stream.' });
        }


    } catch (err) {
        // Catch synchronous errors or unhandled promise rejections from await before streaming
        handleServerError(err, res, 'speak');
    }
});

module.exports = router;