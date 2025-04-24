const fs = require('fs');
const path = require('path');
const config = require('./config');

const getTimestamp = () => new Date().toISOString();

const getFallbackQueueServerPath = (langCode) => {
    const safeLangCode = String(langCode || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
    const fileLangCode = safeLangCode === 'zh-cn' ? 'cn' : safeLangCode;
    if (config.languageCodes.includes(fileLangCode)) {
        const filePath = path.join(config.queueFallbackBasePath, `queue-${fileLangCode}.mp3`);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${getTimestamp()} - Found fallback MP3: ${filePath}`);
            return filePath;
        }
        console.warn(`⚠️ ${getTimestamp()} - Fallback MP3 not found: ${filePath}`);
    } else {
        console.warn(`⚠️ ${getTimestamp()} - Unsupported language code: ${safeLangCode}`);
    }
    return null;
};

module.exports = { getTimestamp, getFallbackQueueServerPath };