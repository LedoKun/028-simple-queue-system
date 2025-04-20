const fsEH = require('fs');
const { getTimestamp } = require('./utils');

function handleGttsError(err, res, context, fallbackPath) {
    console.error(`${getTimestamp()} - ERROR (${context}) - gTTS stream error:`, err);
    if (!res.headersSent) {
        if (fallbackPath) {
            console.log(`${getTimestamp()} - INFO (${context}) - gTTS failed, using fallback: ${fallbackPath}`);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', '86400');
            const readStream = fsEH.createReadStream(fallbackPath);
            readStream.on('error', (fileErr) => {
                console.error(`${getTimestamp()} - ERROR (${context}) - Error reading fallback MP3:`, fileErr);
                if (!res.headersSent) res.status(500).send('Error generating speech and fallback failed.');
                else res.end();
            });
            readStream.pipe(res);
            console.log(`${getTimestamp()} - INFO (${context}) - Streaming fallback MP3.`);
        } else {
            console.error(`${getTimestamp()} - ERROR (${context}) - No fallback available.`);
            res.status(500).send('Error generating speech and no fallback.');
        }
    } else {
        console.warn(`${getTimestamp()} - WARN (${context}) - Headers already sent, cannot fallback.`);
        res.end();
    }
}

function handleServerError(err, res, context) {
    console.error(`${getTimestamp()} - ERROR (${context}) - Internal server error:`, err);
    if (!res.headersSent) res.status(500).send('Internal server error');
}

module.exports = { handleGttsError, handleServerError };