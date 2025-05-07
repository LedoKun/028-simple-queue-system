// ./src/services/ttsService.js

const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const gtts = require('node-gtts');
const ffmpeg = require('fluent-ffmpeg'); // <-- Add ffmpeg

const config = require('../config'); // Use config for paths and limits
const logger = require('../logger');

// Ensure the unified cache directory exists
try {
    fs.mkdirSync(config.ttsCacheDir, { recursive: true });
} catch (err) {
    logger.error(`Failed to ensure TTS cache directory exists at ${config.ttsCacheDir}:`, err);
    // Depending on severity, you might want to exit or handle this error
}


// --- Existing Functions for Online GTTS Cache/Prune ---

/**
 * Construct a safe filesystem path for cached files (both online & offline stitched).
 * Uses the unified config.ttsCacheDir.
 */
function getCachedFilePath(lang, queue, station) {
    // Sanitize inputs for filename safety
    const safeLang = lang.replace(/[^a-z0-9_-]/gi, '');
    const safeQueue = queue.replace(/[^a-z0-9]/gi, ''); // Allow letters and numbers
    const safeStation = station.replace(/[^a-z0-9]/g, ''); // Allow letters and numbers if stations can have them
    const filename = `${safeLang}_${safeQueue}_${safeStation}.mp3`;
    return path.join(config.ttsCacheDir, filename);
}

/**
 * Prune cache directory to keep only the latest N files.
 * Uses the unified config.ttsCacheDir.
 */
function pruneCache(maxFiles = 200) {
    if (maxFiles <= 0) return; // Skip if pruning disabled
    try {
        const files = fs.readdirSync(config.ttsCacheDir)
            .filter(f => f.endsWith('.mp3')); // Only prune mp3 files

        if (files.length <= maxFiles) return;

        const fileStats = files.map(filename => {
            const filePath = path.join(config.ttsCacheDir, filename);
            try {
                const stat = fs.statSync(filePath);
                return { filePath, mtime: stat.mtimeMs };
            } catch (statErr) {
                logger.error(`Failed to stat cache file for pruning: ${filePath}`, statErr);
                return null; // Skip files that can't be stat'd
            }
        }).filter(Boolean); // Remove null entries

        // Sort by modification time ascending (oldest first)
        fileStats.sort((a, b) => a.mtime - b.mtime);

        // Delete oldest files beyond maxFiles
        const toDeleteCount = fileStats.length - maxFiles;
        if (toDeleteCount <= 0) return;

        logger.info(`Pruning ${toDeleteCount} oldest files from TTS cache (${config.ttsCacheDir}).`);
        const filesToDelete = fileStats.slice(0, toDeleteCount);

        filesToDelete.forEach(({ filePath }) => {
            try {
                fs.unlinkSync(filePath);
                // logger.debug('Pruned old TTS cache file:', filePath); // Use debug level if too verbose
            } catch (unlinkErr) {
                logger.error('Failed to delete cache file during pruning:', filePath, unlinkErr);
            }
        });
    } catch (err) {
        logger.error('Error pruning TTS cache:', err);
    }
}

// --- Functions for Online GTTS Mode (kept as they were) ---

/**
 * Prepare TTS text (full phrase) and language code for online GTTS.
 * @param {string} lang - Language code
 * @param {string} queue - Queue identifier
 * @param {string} station - Station identifier
 * @returns {{text: string, speakLang: string}} - Object containing the full text phrase and gtts language code
 * @throws {Error} If language not supported for phrase structure
 */
function prepareTTSForOnlineMode(lang, queue, station) {
    let text, speakLang;
    switch (lang.toLowerCase()) {
        case 'th':
            text = `หมายเลข ${queue}, ช่อง ${station}`;
            speakLang = 'th';
            break;
        case 'en':
            text = `Number ${queue}, station ${station}`;
            speakLang = 'en-uk';
            break;
        // Add other languages if needed for online mode
        // case 'my':
        //     text = `အမှတ် ${queue}, ကောင်တာ ${station}`;
        //     speakLang = 'my';
        //     break;
        default:
            // Fallback or throw error if language structure unknown
            logger.error(`Online TTS phrase structure not defined for language: ${lang}`);
            throw new Error(`Unsupported language for online TTS phrase: ${lang}`);
    }
    return { text, speakLang };
}

/**
 * Generates a text-to-speech (TTS) audio stream using GTTS online
 * and caches the result to the unified cache directory.
 * Returns a PassThrough stream for immediate piping while caching happens.
 * @param {string} text - The text to be converted into speech.
 * @param {string} gttsLangCode - The language code for the TTS conversion.
 * @param {string} cachePath - The file path where the generated TTS audio will be cached.
 * @returns {Promise<PassThrough>} A promise that resolves to a PassThrough stream containing the TTS audio.
 * @throws {Error} If an error occurs during the TTS generation or file writing process.
 */
function generateOnlineTtsStream(text, gttsLangCode, cachePath) {
    return new Promise((resolve, reject) => {
        logger.info(`Generating ONLINE TTS for "${text}" (lang: ${gttsLangCode}) -> ${cachePath}`);
        const ttsStream = gtts(gttsLangCode).stream(text);
        const passThrough = new PassThrough();
        const writeStream = fs.createWriteStream(cachePath);

        let ttsError = null;

        ttsStream.on('error', (err) => {
            logger.error(`GTTS stream error generating "${text}" (lang: ${gttsLangCode}):`, err);
            ttsError = err;
            passThrough.destroy(err); // Stop passthrough on error
            writeStream.destroy();
            fs.unlink(cachePath, () => { }); // Attempt cleanup
            reject(err); // Reject the promise
        });

        writeStream.on('error', (err) => {
            logger.error(`File write stream error caching online TTS to "${cachePath}":`, err);
            // Note: passthrough might still be streaming to client, but caching failed.
            // Depending on requirements, you might want to signal this differently.
            // For simplicity here, we don't reject the main promise if only caching fails,
            // but we log the error. The client still gets the audio via passThrough.
        });

        writeStream.on('finish', () => {
            if (!ttsError) { // Only prune if generation/writing seemed successful
                logger.info(`Finished caching ONLINE TTS: ${cachePath}`);
                pruneCache(config.maxTTSCacheFiles);
            }
        });

        ttsStream.pipe(passThrough);
        ttsStream.pipe(writeStream); // Pipe GTTS stream directly to file as well

        // Resolve with the passThrough stream immediately for the client
        resolve(passThrough);
    });
}


// --- NEW Functions for Offline Atomic TTS Mode ---

/**
 * Sanitizes a key (like a character or word) for use in a filename.
 * Lowercases and replaces non-alphanumeric (excluding underscore/hyphen) with underscore.
 */
function sanitizeFilenameKey(key) {
    if (!key) return '';
    // Keep it simple, ensure it matches pre-generation naming
    return key.toString().toLowerCase(); // Assuming pre-gen filenames are just lowercase key
}

/**
 * Determines the sequence of atomic audio file keys for a given queue call.
 */
function getAtomicPhraseKeys(lang, queue, station) {
    let numberKeyword, stationKeyword;
    switch (lang.toLowerCase()) {
        case 'th':
        case 'en': // Uses "number.mp3" and "station.mp3" keys
            numberKeyword = "number";
            stationKeyword = "station";
            break;
        // Add other lang mappings if they use the same "number"/"station" keys
        default:
            logger.warn(`Offline TTS keywords not defined for lang "${lang}". Cannot form phrase.`);
            return null;
    }

    const phraseKeys = [numberKeyword];
    for (const char of String(queue)) {
        phraseKeys.push(sanitizeFilenameKey(char));
    }
    phraseKeys.push(stationKeyword);
    for (const digit of String(station)) {
        phraseKeys.push(sanitizeFilenameKey(digit));
    }
    return phraseKeys;
}

/**
 * Stitches atomic audio files together and saves the result to outputPath.
 * @param {string[]} atomicFilePaths - Array of full paths to the source MP3 files.
 * @param {string} outputPath - Full path to save the stitched MP3 file.
 * @returns {Promise<void>} Resolves on success, rejects on error.
 */
function stitchAndCacheFiles(atomicFilePaths, outputPath) {
    return new Promise((resolve, reject) => {
        if (!atomicFilePaths || atomicFilePaths.length === 0) {
            return reject(new Error('No atomic files provided for stitching.'));
        }

        const command = ffmpeg();
        atomicFilePaths.forEach(p => command.input(p));

        command
            .on('start', (commandLine) => {
                logger.info('ffmpeg start stitching -> ' + outputPath);
                logger.debug('ffmpeg command: ' + commandLine); // Debug level for command
            })
            .on('error', (err, stdout, stderr) => {
                logger.error(`ffmpeg stitching error for "${outputPath}":`, err.message);
                if (stderr) logger.error('ffmpeg stderr:', stderr);
                fs.unlink(outputPath, () => { }); // Clean up failed output file
                reject(err);
            })
            .on('end', () => {
                logger.info(`SUCCESS: Finished stitching offline TTS: ${outputPath}`);
                resolve();
            })
            .mergeToFile(outputPath, config.ttsCacheDir); // Use cache dir for temp files if needed by ffmpeg
    });
}


/**
 * Gets a readable stream for the requested TTS phrase, using offline stitching if enabled.
 * Checks cache first, generates/stitches and caches if needed, then returns stream.
 * @param {string} lang - Language code.
 * @param {string} queue - Queue number.
 * @param {string} station - Station number.
 * @returns {Promise<fs.ReadStream>} A promise resolving to a readable file stream.
 * @throws {Error} If required atomic files are missing or stitching fails.
 */
async function getStitchedAudioStream(lang, queue, station) {
    const cachePath = getCachedFilePath(lang, queue, station); // Use same naming for stitched cache
    logger.debug(`Offline mode: Checking cache for stitched file: ${cachePath}`);

    if (fs.existsSync(cachePath)) {
        logger.info(`Offline TTS: Serving cached stitched audio: ${cachePath}`);
        return fs.createReadStream(cachePath);
    }

    logger.info(`Offline TTS: Cache miss for ${cachePath}. Stitching required.`);

    const phraseFileKeys = getAtomicPhraseKeys(lang, queue, station);
    if (!phraseFileKeys) {
        throw new Error(`Offline TTS keywords not configured for language: ${lang}`);
    }

    const atomicFilePaths = phraseFileKeys.map(key =>
        path.join(config.ttsQueueOfflineBaseDir, lang, `${key}.mp3`) // Assumes pre-gen names are key.mp3
    );

    // Check if all source atomic files exist BEFORE attempting to stitch
    const missingFiles = atomicFilePaths.filter(filePath => !fs.existsSync(filePath));
    if (missingFiles.length > 0) {
        logger.error('Offline TTS: Cannot stitch phrase because atomic files are missing:', missingFiles);
        throw new Error(`Required audio components not found for offline playback. Missing: ${missingFiles.join(', ')}`);
    }

    if (atomicFilePaths.length === 0) {
        logger.warn('Offline TTS: No atomic files determined for stitching.');
        throw new Error('No audio components determined for phrase.');
    }

    // Generate the stitched file and cache it
    await stitchAndCacheFiles(atomicFilePaths, cachePath);

    // Prune the cache directory AFTER successful generation
    pruneCache(config.maxTTSCacheFiles);

    // Now that the file is cached, return a stream to it
    logger.info(`Offline TTS: Serving newly stitched and cached audio: ${cachePath}`);
    return fs.createReadStream(cachePath);
}


module.exports = {
    // Online mode functions (potentially renamed for clarity)
    prepareTTSForOnlineMode,
    generateOnlineTtsStream,
    getCachedFilePath, // This is used by BOTH online caching and stitched caching

    // Offline mode function
    getStitchedAudioStream,

    // Utilities (if used externally, otherwise keep internal)
    // getAtomicPhraseKeys,
    // sanitizeFilenameKey,
    pruneCache, // Export pruneCache if needed externally, otherwise it's used internally
};