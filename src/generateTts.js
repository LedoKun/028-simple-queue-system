// ./refactored_tts_generator.js (or your chosen filename)

const fs = require('fs');
const path = require('path');
const gtts = require('node-gtts');

// Assuming config.js and logger.js are in the same directory or accessible via this path.
// Adjust if your project structure is different (e.g., '../config')
const { languageCodes } = require('./config');
const logger = require('./logger');

const TTS_QUEUE_BASE_DIR = "src/public/media/queue_calling";

// Pre-generate digits and English characters as they are constant
const DIGITS = Object.freeze(Array.from({ length: 10 }, (_, i) => String(i)));
const ENG_CHARS = Object.freeze(Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)));

/**
 * Prepares a list of vocabulary items (text to speak and filename key)
 * for a given language.
 * @param {string} lang - The language code (e.g., 'th', 'en').
 * @returns {{vocabulary: Array<{textToSpeak: string, filenameKey: string}>, speakLang: string}}
 * An object containing an array of vocabulary items and the gtts-compatible language code.
 * @throws {Error} If the language is not supported with specific base words and no fallback is desired.
 */
function prepareTTSVocabulary(lang) {
    let baseVocabularyItems = []; // Will store objects like { textToSpeak: "สวัสดี", filenameKey: "greeting" }
    let speakLang;

    switch (lang.toLowerCase()) {
        case 'th':
            baseVocabularyItems = [
                { textToSpeak: "หมายเลข", filenameKey: "number" },
                { textToSpeak: "ช่อง", filenameKey: "station" }
            ];
            speakLang = 'th';
            break;
        case 'en':
            baseVocabularyItems = [
                { textToSpeak: "number", filenameKey: "number" },
                { textToSpeak: "station", filenameKey: "station" }
            ];
            speakLang = 'en-uk'; // Or 'en-us', 'en-au' as preferred by gtts for quality
            break;
        // Example for another language:
        // case 'my':
        //     baseVocabularyItems = [
        //         { textToSpeak: "အမှတ်", filenameKey: "number" }, // Burmese for "number"
        //         { textToSpeak: "ကောင်တာ", filenameKey: "station" } // Burmese for "counter/station"
        //     ];
        //     speakLang = 'my'; // Check gtts documentation for correct code if 'my' isn't direct
        //     break;
        default:
            // For languages from config.languageCodes not explicitly defined here,
            // they will only generate digits and English characters by default.
            // If a language MUST have base words, you might want to throw an error:
            // throw new Error(`Unsupported language for base vocabulary: ${lang}`);
            logger.warn(`Language "${lang}" has no specific base vocabulary defined in prepareTTSVocabulary. Only digits and English characters will be generated for it, using "${lang}" as speakLang.`);
            baseVocabularyItems = []; // No specific base words, will only get digits/chars
            speakLang = lang; // Use the lang code directly; ensure gtts supports it or map it.
            break;
    }

    // Add digits: { textToSpeak: "0", filenameKey: "0" }, ...
    const digitItems = DIGITS.map(digit => ({ textToSpeak: digit, filenameKey: digit }));

    // Add English characters: { textToSpeak: "A", filenameKey: "a" } (lowercase for filename)
    const engCharItems = ENG_CHARS.map(char => ({ textToSpeak: char, filenameKey: char.toLowerCase() }));

    // Combine: specific words first, then digits, then characters
    const allVocabularyItems = [...baseVocabularyItems, ...digitItems, ...engCharItems];

    return { vocabulary: allVocabularyItems, speakLang };
}

/**
 * Generates a TTS audio stream and saves it to a file.
 * Ensures the target directory exists before writing.
 * @param {string} textToSpeak - The text to convert to speech.
 * @param {string} gttsLangCode - The language code compatible with node-gtts.
 * @param {string} filePath - The full path to save the MP3 file.
 * @returns {Promise<void>} A promise that resolves when the file is successfully written, or rejects on error.
 */
async function generateAndSaveTTS(textToSpeak, gttsLangCode, filePath) {
    return new Promise((resolve, reject) => {
        const targetDir = path.dirname(filePath);

        try {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
                logger.info(`Created directory: ${targetDir}`);
            }
        } catch (dirError) {
            reject(new Error(`Failed to create directory ${targetDir}: ${dirError.message}`));
            return;
        }

        const ttsStream = gtts(gttsLangCode).stream(textToSpeak);
        const writeStream = fs.createWriteStream(filePath);

        ttsStream.on('error', (err) => {
            logger.error(`GTTS stream error for text "${textToSpeak}" (lang: ${gttsLangCode}, path: ${filePath}):`, err.message);
            writeStream.destroy();
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) logger.error(`Error deleting partial file ${filePath} after gtts error: ${unlinkErr.message}`);
            });
            reject(err);
        });

        writeStream.on('error', (err) => {
            logger.error(`File write stream error for "${filePath}":`, err.message);
            reject(err);
        });

        writeStream.on('finish', () => {
            logger.info(`SUCCESS: Generated TTS for "${textToSpeak}" (lang: ${gttsLangCode}) -> ${filePath}`);
            resolve();
        });

        ttsStream.pipe(writeStream);
    });
}

/**
 * Sanitizes a string to be safe for use as a part of a filename.
 * Keeps alphanumeric, underscore, hyphen. Converts to lowercase.
 * @param {string} key - The input string (typically a filenameKey).
 * @returns {string} - The sanitized string.
 */
function sanitizeFilenameKey(key) {
    if (!key) return '';
    return key.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}


/**
 * Main function to iterate through languages and vocabulary items to generate TTS files.
 */
async function pregenerateTTSFiles() {
    logger.info('Starting pre-generation of TTS audio files...');

    if (!languageCodes || languageCodes.length === 0) {
        logger.warn('No languageCodes found in configuration. Exiting TTS generation.');
        return;
    }

    for (const lang of languageCodes) {
        logger.info(`Processing language: ${lang}`);
        try {
            const { vocabulary, speakLang } = prepareTTSVocabulary(lang);

            if (!vocabulary || vocabulary.length === 0) {
                logger.warn(`No vocabulary items to process for language: ${lang}`);
                continue;
            }

            const langDir = path.join(TTS_QUEUE_BASE_DIR, lang);
            if (!fs.existsSync(langDir)) {
                fs.mkdirSync(langDir, { recursive: true });
                logger.info(`Created base language directory: ${langDir}`);
            }

            for (const item of vocabulary) {
                if (!item || typeof item.textToSpeak !== 'string' || item.textToSpeak.trim() === "" || typeof item.filenameKey !== 'string' || item.filenameKey.trim() === "") {
                    logger.warn(`Skipping invalid vocabulary item for language ${lang}:`, item);
                    continue;
                }

                const filename = `${sanitizeFilenameKey(item.filenameKey)}.mp3`;
                const filePath = path.join(langDir, filename);

                try {
                    // Optional: Check if file already exists to skip regeneration
                    // if (fs.existsSync(filePath)) {
                    //     logger.info(`Skipping existing file: ${filePath} (Text: "${item.textToSpeak}")`);
                    //     continue;
                    // }
                    await generateAndSaveTTS(item.textToSpeak, speakLang, filePath);
                } catch (error) {
                    logger.error(`  Error generating file for text "${item.textToSpeak}" (key: "${item.filenameKey}", lang: "${lang}"): ${error.message}`);
                }
            }
            logger.info(`Finished processing for language: ${lang}`);
        } catch (error) {
            logger.error(`Could not process language ${lang}: ${error.message}`);
        }
    }

    logger.info('TTS audio file pre-generation process completed.');
}

// Execute the main function
pregenerateTTSFiles().catch(err => {
    logger.error('A critical error occurred during the TTS generation script:', err);
    process.exit(1);
});