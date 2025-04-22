const express = require('express');
const fs = require('fs');
const gtts = require('node-gtts');
const router = express.Router();
const { speakLimiter } = require('../rateLimiters');
const { getTimestamp, getFallbackQueueServerPath } = require('../utils');
const { handleGttsError, handleServerError } = require('../errorHandlers');
const { languageCodes } = require('../config')

router.get('/speak', speakLimiter, (req, res) => {
    const rawQueue = String(req.body.queue || '').toUpperCase().trim();
    const rawStation = String(req.body.station || '').trim();
    const rawLang = String(req.body.lang || '').toLowerCase().trim();

    // validate queue: 1 letter + ≥1 digit
    if (!/^[A-Z]\d+$/.test(rawQueue)) {
        console.warn(`⚠️ ${getTimestamp()} - POST /speak invalid data.`);
        return res.status(400).send({
            error: 'Queue must be 1 letter followed by digits, e.g. A123'
        });
    }

    // validate station: ≥1 digit
    if (!/^\d+$/.test(rawStation)) {
        console.warn(`⚠️ ${getTimestamp()} - POST /speak invalid data.`);
        return res.status(400).send({
            error: 'Station must be numeric, e.g. 5 or 42'
        });
    }

    if (!languageCodes.includes(rawLang)) {
        console.warn(`⚠️ ${getTimestamp()} - POST /speak invalid data.`);
        return res.status(400).send({
            error: 'Language is not supported'
        });
    }

    // if we get here, inputs are valid:
    const queue = rawQueue;
    const station = rawStation;
    const lang = rawLang;

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
