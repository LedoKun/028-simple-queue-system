// ./errorHandlers.js

const logger = require('./logger');

/**
 * Handle errors from node-gtts streams.
 */
function handleGttsError(err, res, context) {
    logger.error(`ERROR (${context}) - gTTS error:`, err);

    if (res.headersSent) {
        logger.warn(`WARN (${context}) - Headers already sent`);
        return res.end();
    }

    res.status(500).send('Text-to-Speech service is currently unavailable. Please try again later.');
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
