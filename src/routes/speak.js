// ./routes/speak.js

const express = require('express');
const fs = require('fs');
const router = express.Router();

const {
    ttsCacheDir: CACHE_DIR,
    languageCodes,
} = require('../config');

const {
    prepareTTS,
    generateTtsStream,
    getCachedFilePath,
} = require('../services/ttsService');

const { speakLimiter } = require('../rateLimiters');
const { handleServerError } = require('../errorHandlers');
const logger = require('../logger');

// Ensure cache directory exists
fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * GET /speak
 * Query params: queue (e.g. A123), station (e.g. 5), lang ("th" or "en")
 * Serves TTS audio, caching results on disk and pruning old cache.
 */
router.get('/speak', speakLimiter, (req, res) => {
    try {
        const rawQueue = String(req.query.queue || '').toUpperCase().trim();
        const rawStation = String(req.query.station || '').trim();
        const rawLang = String(req.query.lang || '').toLowerCase().trim();

        // Validate inputs
        if (!/^[A-Z]\d+$/.test(rawQueue)) {
            logger.warn('Invalid /speak queue parameter:', rawQueue);
            return res.status(400).json({ error: 'Queue must be 1 letter followed by digits, e.g. A123' });
        }
        if (!/^\d+$/.test(rawStation)) {
            logger.warn('Invalid /speak station parameter:', rawStation);
            return res.status(400).json({ error: 'Station must be numeric, e.g. 5 or 42' });
        }
        if (!languageCodes.includes(rawLang)) {
            logger.warn('Unsupported /speak language parameter:', rawLang);
            return res.status(400).json({ error: 'Language is not supported' });
        }

        const queue = rawQueue;
        const station = rawStation;
        const lang = rawLang;

        // Serve from cache if available
        const cachePath = getCachedFilePath(lang, queue, station);
        if (fs.existsSync(cachePath)) {
            logger.info('Serving cached TTS audio:', cachePath);
            res.set({
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400'
            });
            return fs.createReadStream(cachePath).pipe(res);
        }

        logger.info('Cache miss for TTS audio, generating new stream:', cachePath);

        // Prepare TTS text and language code
        let { text, speakLang } = prepareTTS(lang, queue, station);

        // Generate new TTS stream, cache to disk, and pipe to client
        const ttsPassThrough = generateTtsStream(text, speakLang, cachePath);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
        });

        ttsPassThrough.pipe(res);
    } catch (err) {
        handleServerError(err, res, 'speak');
    }
});

module.exports = router;
