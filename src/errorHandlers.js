// ./errorHandlers.js

const logger = require('./logger');

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
    handleServerError,
};
