const express = require('express');
const fs = require('fs');
const gtts = require('node-gtts');
const router = express.Router();
const { speakLimiter } = require('../rateLimiters');
const { getTimestamp, getFallbackQueueServerPath } = require('../utils');
const { handleGttsError, handleServerError } = require('../errorHandlers');

router.get('/speak', speakLimiter, (req, res) => {
    const queue = String(req.query.queue || '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
    const station = String(req.query.station || '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
    const lang = req.query.lang;
    if (!queue || !station || !lang) return res.status(400).send('Missing parameters');

    const fallbackPath = getFallbackQueueServerPath(lang);

    if (['my', 'fil'].includes(lang)) {
        console.log(`✅ ${getTimestamp()} - Serving fallback for ${lang}`);
        if (fallbackPath) {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', '86400');
            fs.createReadStream(fallbackPath).pipe(res);
        } else {
            console.error(`❌ ${getTimestamp()} - Fallback not found for ${lang}`);
            return res.status(404).send('Fallback not found');
        }
        return;
    }

    let text, speakLang;
    switch (lang) {
        case 'th': text = `เชิญคิวหมายเลข ${queue} ที่ช่องบริการ ${station} ค่ะ`; speakLang = 'th'; break;
        case 'en': text = `Queue number ${queue}, please proceed to station ${station}.`; speakLang = 'en-uk'; break;
        default:
            console.warn(`⚠️ ${getTimestamp()} - Unsupported lang: ${lang}`);
            return res.status(400).send(`Unsupported lang ${lang}`);
    }

    console.log(`✅ ${getTimestamp()} - TTS generation for ${lang}`);
    try {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', '86400');
        const stream = gtts(speakLang).stream(text);
        stream.on('error', (err) => handleGttsError(err, res, 'speak', fallbackPath));
        stream.pipe(res);
    } catch (err) {
        handleServerError(err, res, 'speak setup');
    }
});

module.exports = router;
