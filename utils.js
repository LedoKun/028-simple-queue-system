// ./utils.js

const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

/**
 * Returns an ISO timestamp string.
 */
const getTimestamp = () => new Date().toISOString();

/**
 * Looks up a pre-recorded fallback MP3 for a given language code.
 * Returns the filepath if it exists, or null otherwise.
 */
const getFallbackQueueServerPath = (langCode) => {
    const safeLangCode = String(langCode || '')
        .replace(/[^a-z0-9-]/gi, '')
        .toLowerCase();

    // normalize zh-cn → cn
    const fileLangCode = safeLangCode === 'zh-cn' ? 'cn' : safeLangCode;

    if (!config.languageCodes.includes(fileLangCode)) {
        logger.warn('Unsupported language code:', safeLangCode);
        return null;
    }

    const filePath = path.join(
        config.fallbackMediaPath,
        `queue-${fileLangCode}.mp3`
    );

    if (fs.existsSync(filePath)) {
        logger.info('Found fallback MP3:', filePath);
        return filePath;
    } else {
        logger.warn('Fallback MP3 not found:', filePath);
        return null;
    }
};

module.exports = {
    getTimestamp,
    getFallbackQueueServerPath,
};
