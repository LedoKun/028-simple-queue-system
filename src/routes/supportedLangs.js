// ./src/routes/supportedLangs.js

const express = require('express');
const router = express.Router();
const config = require('../config');
const logger = require('../logger');

/**
 * GET /supported_langs
 * Provides configuration details needed by the frontend, like language lists.
 */
router.get('/supported_langs', (req, res) => {
    logger.info('GET /supported_langs request received'); // Log the request

    try {
        // Check if config and languageCodes are available
        if (!config || !Array.isArray(config.languageCodes)) {
            logger.error('Configuration or languageCodes not found in config.js');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Construct the response object
        // Both languagesToSpeak and publicAnnouncementLanguages use config.languageCodes as requested
        const environmentData = {
            languagesToSpeak: config.languageCodes,
            publicAnnouncementLanguages: config.languageCodes
        };

        // Send the JSON response
        res.json(environmentData);

    } catch (error) {
        logger.error('Error handling /supported_langs request:', error);
        // Avoid sending detailed errors to the client in production
        res.status(500).json({ error: 'Failed to retrieve environment configuration' });
    }
});

module.exports = router;