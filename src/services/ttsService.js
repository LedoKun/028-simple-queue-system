// ./services/queueService.js

const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const gtts = require('node-gtts');

const {
    ttsCacheDir: CACHE_DIR,
    maxTTSCacheFiles,
} = require('../config');

const logger = require('../logger');

/**
 * Construct a safe filesystem path for cached TTS files.
 */
function getCachedFilePath(lang, queue, station) {
    const safeQueue = queue.replace(/[^A-Z0-9]/gi, '');
    const safeStation = station.replace(/[^0-9]/g, '');
    const filename = `${lang}_${safeQueue}_${safeStation}.mp3`;
    return path.join(CACHE_DIR, filename);
}

/**
 * Prune cache directory to keep only the latest N files.
 */
function pruneCache(maxFiles = 200) {
    try {
        const files = fs.readdirSync(CACHE_DIR)
            .filter(f => f.endsWith('.mp3'));
        if (files.length <= maxFiles) return;

        const fileStats = files.map(filename => {
            const filePath = path.join(CACHE_DIR, filename);
            const stat = fs.statSync(filePath);
            return { filePath, mtime: stat.mtimeMs };
        });

        // Sort by modification time ascending (oldest first)
        fileStats.sort((a, b) => a.mtime - b.mtime);

        // Delete oldest files beyond maxFiles
        const toDelete = fileStats.slice(0, fileStats.length - maxFiles);
        toDelete.forEach(({ filePath }) => {
            try {
                fs.unlinkSync(filePath);
                logger.info('Pruned old TTS cache file:', filePath);
            } catch (err) {
                logger.error('Failed to delete cache file:', filePath, err);
            }
        });
    } catch (err) {
        logger.error('Error pruning TTS cache:', err);
    }
}

/**
 * Prepare TTS text and language code.
 * @param {string} lang - Language code
 * @param {string} queue - Queue identifier
 * @param {string} station - Station identifier
 * @returns {Object} - Object containing text and language code
 */
function prepareTTS(lang, queue, station) {
    let text, speakLang;
    switch (lang) {
        case 'th':
            text = `หมายเลข ${queue}, ช่อง ${station}`;
            speakLang = 'th';
            break;
        case 'en':
            text = `Number ${queue}, station ${station}`;
            speakLang = 'en-uk';
            break;
        case 'my':
            text = `အမှတ် ${queue}, ကောင်တာ ${station}`;
            speakLang = 'my';
            break;
        default:
            throw new Error(`Unsupported language: ${lang}`);
    }
    return { text, speakLang };
}

/**
 * Generate a TTS stream, cache the audio file, and return a readable stream.
 * @param {string} text - Text to convert to speech
 * @param {string} lang - Language code
 * @param {string} cachePath - Path to save the cached audio file
 * @returns {Stream} - Readable stream of the TTS audio
 */
function generateTtsStream(text, lang, cachePath) {
    const ttsStream = gtts(lang).stream(text);
    const passThrough = new PassThrough();

    // Handle errors during TTS stream generation
    ttsStream.on('error', err => {
        logger.error('Error generating TTS stream:', err);
    });

    // Pipe TTS stream to a PassThrough stream
    ttsStream.pipe(passThrough);

    // Write the TTS audio to the cache file
    const writeStream = fs.createWriteStream(cachePath);
    passThrough.pipe(writeStream)
        .on('error', err => {
            logger.error('Error writing TTS cache file:', err);
        })
        .on('finish', () => {
            // Prune the cache directory after writing the file
            pruneCache(maxTTSCacheFiles);
        });

    // Return the PassThrough stream for client consumption
    return passThrough;
}

module.exports = {
    getCachedFilePath,
    pruneCache,
    prepareTTS,
    generateTtsStream
};
