// ./src/services/ttsService.js

const fs = require('fs');
const path = require('path');
// PassThrough is no longer needed here as we wait for the file
// const { PassThrough } = require('stream');
const gtts = require('node-gtts');
const ffmpeg = require('fluent-ffmpeg');

const config = require('../config');
const logger = require('../logger');

// Lock only needed for stitching now
const currentlyStitching = new Set();
// For preventing reads while online generation writes (managed by speak.js)
// Using global as a temporary workaround for shared state. Refactor recommended.
global.ttsGeneratingLocks = global.ttsGeneratingLocks || new Set();


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
 * Generates a text-to-speech (TTS) audio file using GTTS online and caches it atomically.
 * Implements a timeout for the GTTS request.
 * Returns a Promise that resolves only when the file is successfully created and cached,
 * or rejects on any error (timeout, stream error, write error, rename error).
 * @param {string} text - The text to convert to speech.
 * @param {string} gttsLangCode - The language code for the TTS conversion.
 * @param {string} cachePath - The final target cache file path.
 * @returns {Promise<void>} Resolves on success, rejects on error.
 */
function generateOnlineTtsStream(text, gttsLangCode, cachePath) {
    // Use the global lock (workaround)
    const currentlyGeneratingOnline = global.ttsGeneratingLocks;

    return new Promise((resolve, reject) => {
        const tempCachePath = cachePath + '.tmp';
        logger.info(`Generating ONLINE TTS for "${text}" (lang: ${gttsLangCode}) -> ${tempCachePath} (Timeout: ${config.gttsTimeoutMs}ms)`);

        let ttsStream;
        let writeStream;
        let timeoutId = null;
        let finished = false; // Prevent multiple rejects/resolves

        const cleanupAndReject = (err, type = 'Generic') => {
            if (finished) return;
            finished = true;
            clearTimeout(timeoutId);
            logger.error(`TTS ${type} Error for "${text}" (lang: ${gttsLangCode}, path: ${cachePath}):`, err.message);

            // --- Release Lock ---
            if (currentlyGeneratingOnline && currentlyGeneratingOnline.has(cachePath)) {
                currentlyGeneratingOnline.delete(cachePath);
                logger.debug(`Released online generation lock for ${cachePath} due to ${type} error.`);
            }
            // --- End Release Lock ---

            if (ttsStream && !ttsStream.destroyed) ttsStream.destroy(err);
            if (writeStream && !writeStream.destroyed) writeStream.destroy();

            // Attempt cleanup of temporary file
            fs.unlink(tempCachePath, (unlinkErr) => {
                if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                    logger.error(`Error deleting temporary file ${tempCachePath} after ${type} error: ${unlinkErr.message}`);
                }
            });
            reject(err); // Reject the main promise
        };

        timeoutId = setTimeout(() => {
            cleanupAndReject(new Error(`GTTS request timed out after ${config.gttsTimeoutMs}ms`), 'Timeout');
        }, config.gttsTimeoutMs);

        try {
            ttsStream = gtts(gttsLangCode).stream(text);
            writeStream = fs.createWriteStream(tempCachePath);

            ttsStream.once('error', (err) => cleanupAndReject(err, 'GTTS Stream'));

            writeStream.once('error', (err) => cleanupAndReject(err, 'File Write Stream'));

            writeStream.once('finish', () => {
                if (finished) return; // Already errored/timed out
                clearTimeout(timeoutId); // Clear timeout on successful write *before* rename
                logger.debug(`Finished writing temporary TTS file: ${tempCachePath}`);
                // Rename temp file to final cache path
                fs.rename(tempCachePath, cachePath, (renameErr) => {
                    // --- Release Lock After Rename Attempt ---
                    if (currentlyGeneratingOnline && currentlyGeneratingOnline.has(cachePath)) {
                        currentlyGeneratingOnline.delete(cachePath);
                        logger.debug(`Released online generation lock for ${cachePath} after rename attempt.`);
                    }
                    // --- End Release Lock ---

                    if (renameErr) {
                        // Pass the rename error to the main rejection handler
                        cleanupAndReject(renameErr, 'File Rename');
                    } else {
                        if (finished) return; // Avoid resolving if already errored
                        finished = true;
                        logger.info(`Finished caching ONLINE TTS: ${cachePath}`);
                        pruneCache(config.maxTTSCacheFiles);
                        resolve(); // Resolve the main promise successfully
                    }
                });
            });

            ttsStream.pipe(writeStream);

        } catch (initialError) {
            cleanupAndReject(initialError, 'Initial Setup');
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
    for (const char of String(queue)) { phraseKeys.push(sanitizeFilenameKey(char)); }
    phraseKeys.push(stationKeyword);
    for (const digit of String(station)) { phraseKeys.push(sanitizeFilenameKey(digit)); }
    return phraseKeys;
}

/**
 * Stitches atomic audio files together and saves the result to outputPath.
 * Forces MP3 output codec for better compatibility.
 */
function stitchAndCacheFiles(atomicFilePaths, outputPath) {
    return new Promise((resolve, reject) => {
        if (!atomicFilePaths || atomicFilePaths.length === 0) {
            return reject(new Error('No atomic files provided for stitching.'));
        }
        const command = ffmpeg();
        atomicFilePaths.forEach(p => command.input(p));
        command
            .outputOptions('-acodec libmp3lame')
            .on('start', (commandLine) => { logger.info('ffmpeg start stitching -> ' + outputPath); logger.debug('ffmpeg command: ' + commandLine); })
            .on('stderr', (stderrLine) => { logger.debug(`ffmpeg stderr line: ${stderrLine}`); })
            .on('error', (err, stdout, stderr) => {
                logger.error(`ffmpeg stitching error for "${outputPath}":`, err.message);
                if (stdout) logger.error('ffmpeg stdout on error:', stdout);
                if (stderr) logger.error('ffmpeg stderr on error:', stderr);
                fs.unlink(outputPath, (unlinkErr) => { if (unlinkErr && unlinkErr.code !== 'ENOENT') { logger.warn(`Could not delete failed stitch file ${outputPath}: ${unlinkErr.message}`); } });
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
 * Gets a readable stream for the requested TTS phrase using offline stitching.
 * Checks cache first, stitches/caches if needed, then returns stream.
 * Includes locking to prevent concurrent stitching of the same file.
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
        if (!phraseFileKeys) throw new Error(`Offline TTS keywords not configured for language: ${lang}`);
        const atomicFilePaths = phraseFileKeys.map(key => path.join(config.ttsQueueOfflineBaseDir, lang, `${key}.mp3`));
        const missingFiles = atomicFilePaths.filter(filePath => !fs.existsSync(filePath));
        if (missingFiles.length > 0) throw new Error(`Required audio components not found for offline playback. Missing: ${missingFiles.join(', ')}`);
        if (atomicFilePaths.length === 0) throw new Error('No audio components determined for phrase.');

        await stitchAndCacheFiles(atomicFilePaths, cachePath);
        pruneCache(config.maxTTSCacheFiles);
        logger.info(`Offline TTS: Serving newly stitched and cached audio: ${cachePath}`);
        // Now that the file is definitely created, return the stream
        return fs.createReadStream(cachePath);
    } catch (error) {
        logger.error(`Error during stitching process for ${cachePath}: ${error.message}`);
        throw error; // Re-throw to be caught by the caller (speak.js)
    } finally {
        // --- Release Stitching Lock ---
        currentlyStitching.delete(cachePath);
        logger.debug(`Offline TTS: Released stitching lock for ${cachePath}`);
        // --- Release Stitching Lock End ---
    }
}


module.exports = {
    prepareTTSForOnlineMode,
    generateOnlineTtsStream, // Returns promise that resolves on successful cache write
    getCachedFilePath,
    getStitchedAudioStream, // Returns promise resolving to a readable stream
    pruneCache,
};