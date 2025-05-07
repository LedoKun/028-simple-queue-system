// ./src/services/ttsService.js

const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const gtts = require('node-gtts');
const ffmpeg = require('fluent-ffmpeg');

const config = require('../config');
const logger = require('../logger');

// --- Concurrency Locks ---
// For preventing multiple ffmpeg processes stitching the same file
const currentlyStitching = new Set();
// For preventing reads while online generation writes (managed by speak.js)
// Using global as a temporary workaround for shared state. Refactor recommended.
global.ttsGeneratingLocks = global.ttsGeneratingLocks || new Set();
// --- End Locks ---

// Ensure the unified cache directory exists
try {
    fs.mkdirSync(config.ttsCacheDir, { recursive: true });
} catch (err) {
    logger.error(`Failed to ensure TTS cache directory exists at ${config.ttsCacheDir}:`, err);
}

/**
 * Construct a safe filesystem path for cached files.
 */
function getCachedFilePath(lang, queue, station) {
    const safeLang = lang.replace(/[^a-z0-9_-]/gi, '');
    const safeQueue = queue.replace(/[^a-z0-9]/gi, '');
    const safeStation = station.replace(/[^a-z0-9]/g, '');
    const filename = `${safeLang}_${safeQueue}_${safeStation}.mp3`;
    return path.join(config.ttsCacheDir, filename);
}

/**
 * Prune cache directory to keep only the latest N files.
 */
function pruneCache(maxFiles = config.maxTTSCacheFiles) {
    if (maxFiles <= 0) return;
    try {
        const files = fs.readdirSync(config.ttsCacheDir)
            .filter(f => f.endsWith('.mp3')); // Only prune final mp3 files

        if (files.length <= maxFiles) return;

        const fileStats = files.map(filename => {
            const filePath = path.join(config.ttsCacheDir, filename);
            try {
                const stat = fs.statSync(filePath);
                return { filePath, mtime: stat.mtimeMs };
            } catch (statErr) {
                logger.error(`Failed to stat cache file for pruning: ${filePath}`, statErr);
                return null;
            }
        }).filter(Boolean);

        fileStats.sort((a, b) => a.mtime - b.mtime); // Oldest first

        const toDeleteCount = fileStats.length - maxFiles;
        if (toDeleteCount <= 0) return;

        logger.info(`Pruning ${toDeleteCount} oldest files from TTS cache (${config.ttsCacheDir}).`);
        const filesToDelete = fileStats.slice(0, toDeleteCount);

        filesToDelete.forEach(({ filePath }) => {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkErr) {
                logger.error('Failed to delete cache file during pruning:', filePath, unlinkErr);
            }
        });
    } catch (err) {
        logger.error('Error pruning TTS cache:', err);
    }
}

/**
 * Prepare TTS text (full phrase) and language code for online GTTS.
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
        default:
            logger.error(`Online TTS phrase structure not defined for language: ${lang}`);
            throw new Error(`Unsupported language for online TTS phrase: ${lang}`);
    }
    return { text, speakLang };
}


/**
 * Generates a text-to-speech (TTS) audio stream using GTTS online
 * and caches the result atomically (write to .tmp then rename).
 * Implements a timeout for the GTTS request.
 * Returns a PassThrough stream for immediate piping.
 * NOTE: Lock management (checking if generation is already in progress)
 * should be handled by the caller (e.g., speak.js). This function
 * ensures the lock is *released* upon completion or error.
 * @param {string} text - The text to convert to speech.
 * @param {string} gttsLangCode - The language code for the TTS conversion.
 * @param {string} cachePath - The final target cache file path.
 * @returns {Promise<PassThrough>} A promise resolving to a PassThrough stream.
 * @throws {Error} If stream creation fails synchronously. Other errors (network, write)
 * are emitted on the PassThrough stream or logged.
 */
function generateOnlineTtsStream(text, gttsLangCode, cachePath) {
    // Use the global lock for this workaround
    const currentlyGeneratingOnline = global.ttsGeneratingLocks;

    return new Promise((resolve, reject) => {
        const tempCachePath = cachePath + '.tmp'; // Write to temporary file first
        logger.info(`Generating ONLINE TTS for "${text}" (lang: ${gttsLangCode}) -> ${tempCachePath} (Timeout: ${config.gttsTimeoutMs}ms)`);

        let ttsStream;
        let writeStream;
        let passThrough = new PassThrough();
        let timeoutId = null;
        let setupFinished = false; // Flag for initial promise resolution/rejection

        const cleanupAndHandleError = (err, type = 'Generic') => {
            if (passThrough.destroyed && writeStream && writeStream.destroyed) return; // Already handled

            clearTimeout(timeoutId);
            logger.error(`TTS ${type} Error for "${text}" (lang: ${gttsLangCode}):`, err.message);

            // --- Release Lock ---
            if (currentlyGeneratingOnline.has(cachePath)) {
                currentlyGeneratingOnline.delete(cachePath);
                logger.debug(`Released online generation lock for ${cachePath} due to ${type} error.`);
            }
            // --- End Release Lock ---

            // Destroy streams
            if (ttsStream && !ttsStream.destroyed) ttsStream.destroy(err);
            if (passThrough && !passThrough.destroyed) passThrough.destroy(err); // Critical: ensure client stream stops
            if (writeStream && !writeStream.destroyed) writeStream.destroy(); // Destroy write stream

            // Attempt cleanup of temporary file
            fs.unlink(tempCachePath, (unlinkErr) => {
                if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                    logger.error(`Error deleting temporary file ${tempCachePath} after ${type} error: ${unlinkErr.message}`);
                }
            });

            // Only reject if the promise hasn't resolved yet (for setup errors/timeout before resolve)
            if (!setupFinished) {
                reject(err); // Reject the main promise only if setup failed
            } else {
                // If setup was done, the error should have propagated via the PassThrough stream 'error' event
                logger.debug("Error occurred after PassThrough stream was returned.");
            }
            setupFinished = true; // Prevent further rejection attempts
        };


        // Start the timeout timer
        timeoutId = setTimeout(() => {
            cleanupAndHandleError(new Error(`GTTS request timed out after ${config.gttsTimeoutMs}ms`), 'Timeout');
        }, config.gttsTimeoutMs);

        try {
            ttsStream = gtts(gttsLangCode).stream(text);
            writeStream = fs.createWriteStream(tempCachePath); // Write to temp path

            ttsStream.once('error', (err) => cleanupAndHandleError(err, 'GTTS Stream')); // Error from Google

            // Monitor the PassThrough stream for errors after it's been returned
            passThrough.once('error', (err) => {
                logger.debug("PassThrough stream error detected:", err.message);
                // This usually means the source (ttsStream) errored. cleanupAndHandleError should handle it.
                // No need to call cleanup here again, as ttsStream error handler does it.
            });

            writeStream.once('error', (err) => { // Error writing to temp file
                logger.error(`File write stream error for temp file "${tempCachePath}":`, err.message);
                clearTimeout(timeoutId);
                // --- Release Lock on Write Error ---
                if (currentlyGeneratingOnline.has(cachePath)) {
                    currentlyGeneratingOnline.delete(cachePath);
                    logger.debug(`Released online generation lock for ${cachePath} due to write stream error.`);
                }
                // --- End Release Lock ---
                fs.unlink(tempCachePath, () => { });
                // Don't necessarily reject the main promise here if PassThrough might still work
            });

            writeStream.once('finish', () => { // Successfully wrote temp file
                clearTimeout(timeoutId);
                logger.debug(`Finished writing temporary TTS file: ${tempCachePath}`);
                // Rename temp file to final cache path
                fs.rename(tempCachePath, cachePath, (renameErr) => {
                    // --- Release Lock After Rename Attempt ---
                    if (currentlyGeneratingOnline.has(cachePath)) {
                        currentlyGeneratingOnline.delete(cachePath);
                        logger.debug(`Released online generation lock for ${cachePath} after rename attempt.`);
                    }
                    // --- End Release Lock ---
                    if (renameErr) {
                        logger.error(`Failed to rename temp TTS file ${tempCachePath} to ${cachePath}:`, renameErr);
                        fs.unlink(tempCachePath, () => { });
                    } else {
                        logger.info(`Finished caching ONLINE TTS: ${cachePath}`);
                        pruneCache(config.maxTTSCacheFiles); // Prune only after successful rename
                    }
                });
            });

            // Pipe the TTS audio to both the client (via PassThrough) and the temp cache file
            ttsStream.pipe(passThrough);
            ttsStream.pipe(writeStream);

            // Resolve immediately with the PassThrough stream
            if (!setupFinished) {
                resolve(passThrough);
                setupFinished = true; // Mark setup as complete
            }

        } catch (initialError) {
            // Catch sync errors like invalid lang during stream creation
            cleanupAndHandleError(initialError, 'Initial Setup');
        }
    });
}


// --- Functions for Offline Atomic TTS Mode ---

/** Sanitizes a key for use in a filename. */
function sanitizeFilenameKey(key) {
    if (!key) return '';
    return key.toString().toLowerCase();
}

/** Determines the sequence of atomic audio file keys. */
function getAtomicPhraseKeys(lang, queue, station) {
    let numberKeyword, stationKeyword;
    switch (lang.toLowerCase()) {
        case 'th':
        case 'en':
            numberKeyword = "number";
            stationKeyword = "station";
            break;
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
 * Forces MP3 output codec for better compatibility.
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
            .outputOptions('-acodec libmp3lame') // Force MP3 codec
            .on('start', (commandLine) => {
                logger.info('ffmpeg start stitching -> ' + outputPath);
                logger.debug('ffmpeg command: ' + commandLine);
            })
            .on('stderr', (stderrLine) => { // Log stderr lines
                logger.debug(`ffmpeg stderr line: ${stderrLine}`);
            })
            .on('error', (err, stdout, stderr) => {
                logger.error(`ffmpeg stitching error for "${outputPath}":`, err.message);
                if (stdout) logger.error('ffmpeg stdout on error:', stdout);
                if (stderr) logger.error('ffmpeg stderr on error:', stderr);
                fs.unlink(outputPath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                        logger.warn(`Could not delete failed stitch file ${outputPath}: ${unlinkErr.message}`);
                    }
                });
                reject(err);
            })
            .on('end', (stdout, stderr) => {
                if (stderr) { logger.debug(`ffmpeg final stderr (on success): ${stderr}`); }
                logger.info(`SUCCESS: Finished stitching offline TTS: ${outputPath}`);
                resolve();
            })
            .mergeToFile(outputPath, config.ttsCacheDir);
    });
}


/**
 * Gets a readable stream for the requested TTS phrase, using offline stitching if enabled.
 * Checks cache first, generates/stitches and caches if needed, then returns stream.
 * Includes locking to prevent concurrent stitching of the same file.
 * @param {string} lang - Language code.
 * @param {string} queue - Queue number.
 * @param {string} station - Station number.
 * @returns {Promise<fs.ReadStream>} A promise resolving to a readable file stream.
 * @throws {Error} If required atomic files are missing or stitching fails.
 */
async function getStitchedAudioStream(lang, queue, station) {
    const cachePath = getCachedFilePath(lang, queue, station);
    logger.debug(`Offline mode: Checking cache for stitched file: ${cachePath}`);

    if (fs.existsSync(cachePath)) {
        logger.info(`Offline TTS: Serving cached stitched audio: ${cachePath}`);
        return fs.createReadStream(cachePath);
    }

    // --- Stitching Locking Mechanism Start ---
    while (currentlyStitching.has(cachePath)) {
        logger.warn(`Offline TTS: Stitching already in progress for ${cachePath}. Waiting 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        if (fs.existsSync(cachePath)) {
            logger.info(`Offline TTS: File ${cachePath} appeared after waiting. Serving.`);
            return fs.createReadStream(cachePath);
        }
    }
    currentlyStitching.add(cachePath);
    logger.debug(`Offline TTS: Acquired stitching lock for ${cachePath}`);
    // --- Stitching Locking Mechanism End ---

    try {
        logger.info(`Offline TTS: Cache miss for ${cachePath}. Stitching required.`);

        const phraseFileKeys = getAtomicPhraseKeys(lang, queue, station);
        if (!phraseFileKeys) {
            throw new Error(`Offline TTS keywords not configured for language: ${lang}`);
        }

        const atomicFilePaths = phraseFileKeys.map(key =>
            path.join(config.ttsQueueOfflineBaseDir, lang, `${key}.mp3`)
        );

        const missingFiles = atomicFilePaths.filter(filePath => !fs.existsSync(filePath));
        if (missingFiles.length > 0) {
            logger.error('Offline TTS: Cannot stitch phrase because atomic files are missing:', missingFiles);
            throw new Error(`Required audio components not found for offline playback. Missing: ${missingFiles.join(', ')}`);
        }

        if (atomicFilePaths.length === 0) {
            logger.warn('Offline TTS: No atomic files determined for stitching.');
            throw new Error('No audio components determined for phrase.');
        }

        await stitchAndCacheFiles(atomicFilePaths, cachePath);
        pruneCache(config.maxTTSCacheFiles);

        logger.info(`Offline TTS: Serving newly stitched and cached audio: ${cachePath}`);
        return fs.createReadStream(cachePath);

    } catch (error) {
        logger.error(`Error during stitching process for ${cachePath}: ${error.message}`);
        throw error;
    } finally {
        // --- Release Stitching Lock ---
        currentlyStitching.delete(cachePath);
        logger.debug(`Offline TTS: Released stitching lock for ${cachePath}`);
        // --- Release Stitching Lock End ---
    }
}

module.exports = {
    prepareTTSForOnlineMode,
    generateOnlineTtsStream,
    getCachedFilePath,
    getStitchedAudioStream,
    pruneCache,
    // Exporting locks if needed elsewhere (use cautiously - consider dedicated state module)
    // currentlyStitching,
    // currentlyGeneratingOnline: global.ttsGeneratingLocks
};