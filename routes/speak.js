const express = require('express');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const gtts = require('node-gtts');
const router = express.Router();

const {
    cacheDir: CACHE_DIR,
    languageCodes,
} = require('../config');

const { speakLimiter } = require('../rateLimiters');
const { getTimestamp, getFallbackQueueServerPath } = require('../utils');
const { handleGttsError, handleServerError } = require('../errorHandlers');

// 1. Ensure cache dir exists
fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Build a filesystem-safe cache path
 */
function getCachedFilePath(lang, queue, station) {
    const safeQueue = queue.replace(/[^A-Z0-9]/gi, '');
    const safeStation = station.replace(/[^0-9]/g, '');
    const filename = `${lang}_${safeQueue}_${safeStation}.mp3`;
    return path.join(CACHE_DIR, filename);
}

router.get('/speak', speakLimiter, (req, res) => {
    try {
        const rawQueue = String(req.query.queue || '').toUpperCase().trim();
        const rawStation = String(req.query.station || '').trim();
        const rawLang = String(req.query.lang || '').toLowerCase().trim();

        // 2. Input validation
        if (!/^[A-Z]\d+$/.test(rawQueue)) {
            console.warn(`⚠️ ${getTimestamp()} - Invalid queue: ${rawQueue}`);
            return res.status(400).json({ error: 'Queue must be 1 letter followed by digits, e.g. A123' });
        }
        if (!/^\d+$/.test(rawStation)) {
            console.warn(`⚠️ ${getTimestamp()} - Invalid station: ${rawStation}`);
            return res.status(400).json({ error: 'Station must be numeric, e.g. 5 or 42' });
        }
        if (!languageCodes.includes(rawLang)) {
            console.warn(`⚠️ ${getTimestamp()} - Unsupported language: ${rawLang}`);
            return res.status(400).json({ error: 'Language is not supported' });
        }

        const queue = rawQueue;
        const station = rawStation;
        const lang = rawLang;
        const fallback = getFallbackQueueServerPath(lang);

        // 3. Serve pre‐recorded fallback if configured
        if (['my', 'fil'].includes(lang)) {
            if (fallback && fs.existsSync(fallback)) {
                console.log(`✅ ${getTimestamp()} - Serving fallback for ${lang}`);
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'public, max-age=86400'
                });
                return fs.createReadStream(fallback).pipe(res);
            } else {
                console.error(`❌ ${getTimestamp()} - Fallback missing for ${lang}`);
                return res.status(404).send('Fallback not found');
            }
        }

        // 4. Prepare TTS text & code
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
                console.warn(`⚠️ ${getTimestamp()} - No TTS config for lang: ${lang}`);
                return res.status(400).send(`Unsupported lang ${lang}`);
        }
        console.log(`✅ ${getTimestamp()} - TTS generation: ${lang} ${queue}/${station}`);

        // 5. Try serving from cache
        const cachePath = getCachedFilePath(lang, queue, station);
        if (fs.existsSync(cachePath)) {
            console.log(`🔄 ${getTimestamp()} - Serving cached audio: ${cachePath}`);
            res.set({
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400'
            });
            return fs.createReadStream(cachePath).pipe(res);
        }

        // 6. Generate, cache, and stream
        res.set({
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
        });

        const ttsStream = gtts(speakLang).stream(text);
        const passThrough = new PassThrough();

        ttsStream.on('error', err => handleGttsError(err, res));
        ttsStream.pipe(passThrough);

        // Pipe into both response and cache file
        passThrough.pipe(res);
        passThrough.pipe(fs.createWriteStream(cachePath))
            .on('error', err => console.error(`❌ ${getTimestamp()} - Cache write error:`, err));

    } catch (err) {
        handleServerError(err, res, 'speak');
    }
});

module.exports = router;
