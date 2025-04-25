// ./routes/speak.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const gtts = require('node-gtts');
const router = express.Router();

const {
    cacheDir: CACHE_DIR,
    languageCodes
} = require('../config');
const { speakLimiter } = require('../rateLimiters');
const { getFallbackQueueServerPath } = require('../utils');
const { handleGttsError, handleServerError } = require('../errorHandlers');
const logger = require('../logger');

// Ensure cache directory exists
fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Construct a safe filesystem path for cached TTS files.
 */
function getCachedFilePath(lang, queue, station) {
    const safeQueue = queue.replace(/[^A-Z0-9]/gi, '');
    const safeStation = station.replace(/[^0-9]/g, '');
    const filename = `${lang}_${safeQueue}_${safeStation}.mp3`;
    return path.join(CACHE_DIR, filename);
}

/**
 * GET /speak
 * Query params: queue (e.g. A123), station (e.g. 5), lang ("th" or "en")
 * Serves TTS audio, caching results on disk.
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
        const fallback = getFallbackQueueServerPath(lang);

        // Handle pre-recorded fallback languages
        if (['my', 'fil'].includes(lang)) {
            if (fallback && fs.existsSync(fallback)) {
                logger.info('Serving pre-recorded fallback for language:', lang);
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'public, max-age=86400'
                });
                return fs.createReadStream(fallback).pipe(res);
            }

            logger.error('Fallback not found or not enabled for language:', lang);
            return res.status(404).send('Fallback not found');
        }

        // Prepare TTS text and language code
        let text, speakLang;
        switch (lang) {
            case 'th':
                text = `หมายเลข ${queue}! ช่อง ${station}!`;
                speakLang = 'th';
                break;
            case 'en':
                text = `Number ${queue}! Station ${station}!`;
                speakLang = 'en-uk';
                break;
            default:
                logger.warn('No TTS configuration for language:', lang);
                return res.status(400).send(`Unsupported lang ${lang}`);
        }
        logger.info('TTS generation request:', { lang, queue, station });

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

        // Generate new TTS stream, cache to disk, and pipe to client
        res.set({
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
        });

        const ttsStream = gtts(speakLang).stream(text);
        const passThrough = new PassThrough();

        ttsStream.on('error', err => handleGttsError(err, res));
        ttsStream.pipe(passThrough);

        passThrough.pipe(res);
        passThrough.pipe(fs.createWriteStream(cachePath))
            .on('error', err => logger.error('Error writing TTS cache file:', err));

    } catch (err) {
        handleServerError(err, res, 'speak');
    }
});

module.exports = router;
