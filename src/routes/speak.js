// ./routes/speak.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const gtts = require('node-gtts');
const router = express.Router();

const {
    ttsCacheDir: CACHE_DIR,
    languageCodes,
    maxTTSCacheFiles,
} = require('../config');

const { speakLimiter } = require('../rateLimiters');
const { handleGttsError, handleServerError } = require('../errorHandlers');
const logger = require('../logger');

// Ensure cache directory exists
fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Prune cache directory to keep only the latest N files.
 */
function pruneCache(maxFiles = 200) {
    try {
        const files = fs.readdirSync(CACHE_DIR)
            .filter(f => f.endsWith('.mp3'));
        if (files.length <= maxFiles) return;

        const fileStats = files.map(filename => {
            const filePath = path.join(CACHE_DIR, filename);
            const stat = fs.statSync(filePath);
            return { filePath, mtime: stat.mtimeMs };
        });

        // Sort by modification time ascending (oldest first)
        fileStats.sort((a, b) => a.mtime - b.mtime);

        // Delete oldest files beyond maxFiles
        const toDelete = fileStats.slice(0, fileStats.length - maxFiles);
        toDelete.forEach(({ filePath }) => {
            try {
                fs.unlinkSync(filePath);
                logger.info('Pruned old TTS cache file:', filePath);
            } catch (err) {
                logger.error('Failed to delete cache file:', filePath, err);
            }
        });
    } catch (err) {
        logger.error('Error pruning TTS cache:', err);
    }
}

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

        // Prepare TTS text and language code
        let text, speakLang;
        switch (lang) {
            case 'th':
                text = `หมายเลข ${queue}, ช่อง ${station}`;
                speakLang = 'th';
                break;
            case 'en':
                text = `Number ${queue}, station ${station}`;
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

        const writeStream = fs.createWriteStream(cachePath);
        passThrough.pipe(writeStream)
            .on('error', err => logger.error('Error writing TTS cache file:', err))
            .on('finish', () => pruneCache(maxFiles = maxTTSCacheFiles));

    } catch (err) {
        handleServerError(err, res, 'speak');
    }
});

module.exports = router;
