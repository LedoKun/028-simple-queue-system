// ./errorHandlers.js

const fs = require('fs');
const { enableQueueFallback } = require('./config');
const logger = require('./logger');

/**
 * Handle errors from node-gtts streams.
 * Attempts to serve a fallback file if configured and enabled.
 */
function handleGttsError(err, res, context, fallbackPath) {
    logger.error(`ERROR (${context}) - gTTS error:`, err);

    if (res.headersSent) {
        logger.warn(`WARN (${context}) - Headers already sent; cannot fallback`);
        return res.end();
    }

    if (enableQueueFallback && fallbackPath) {
        logger.info(`INFO (${context}) - Using fallback: ${fallbackPath}`);
        res.set({
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
        });

        const readStream = fs.createReadStream(fallbackPath);
        readStream.on('error', fileErr => {
            logger.error(`ERROR (${context}) - Reading fallback failed:`, fileErr);
            if (!res.headersSent) {
                res.status(500).send('Error with fallback.');
            } else {
                res.end();
            }
        });

        readStream.pipe(res)
            .on('finish', () =>
                logger.info(`INFO (${context}) - Sent fallback audio.`)
            );

    } else if (!enableQueueFallback) {
        logger.warn(`WARN (${context}) - Fallback disabled.`);
        res.status(500).send('Fallback disabled.');
    } else {
        logger.error(`ERROR (${context}) - No fallback available.`);
        res.status(500).send('No fallback available.');
    }
}

/**
 * Handle generic server errors.
 */
function handleServerError(err, res, context) {
    logger.error(`ERROR (${context}) - Internal error:`, err);
    if (!res.headersSent) {
        res.status(500).send('Internal server error');
    }
}

module.exports = {
    handleGttsError,
    handleServerError,
};
