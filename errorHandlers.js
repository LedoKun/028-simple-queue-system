const fsEH = require('fs');
const { getTimestamp } = require('./utils');
const { enableQueueFallback } = require('./config')

function handleGttsError(err, res, context, fallbackPath) {
    console.error(`❌ ${getTimestamp()} - ERROR (${context}) - gTTS error:`, err);
    if (!res.headersSent) {
        if (fallbackPath && enableQueueFallback) {
            console.log(`✅ ${getTimestamp()} - INFO (${context}) - Using fallback: ${fallbackPath}`);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            const readStream = fsEH.createReadStream(fallbackPath);
            readStream.on('error', (fileErr) => {
                console.error(`❌ ${getTimestamp()} - ERROR (${context}) - Reading fallback failed:`, fileErr);
                if (!res.headersSent) res.status(500).send('Error with fallback.');
                else res.end();
            });
            readStream.pipe(res);
            console.log(`✅ ${getTimestamp()} - Sent fallback audio.`);
        } else if (!enableQueueFallback) {
            console.error(`⚠️ ${getTimestamp()} - WARN (${context}) - Fallback disabled.`);
            res.status(500).send('Fallback disabled.');
        } else {
            console.error(`❌ ${getTimestamp()} - ERROR (${context}) - No fallback available.`);
            res.status(500).send('No fallback available.');
        }
    } else {
        console.warn(`⚠️ ${getTimestamp()} - WARN (${context}) - Headers already sent, cannot fallback.`);
        res.end();
    }
}

function handleServerError(err, res, context) {
    console.error(`❌ ${getTimestamp()} - ERROR (${context}) - Internal error:`, err);
    if (!res.headersSent) res.status(500).send('Internal server error');
}

module.exports = { handleGttsError, handleServerError };