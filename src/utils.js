// ./utils.js

/**
 * Returns an ISO timestamp string.
 */
const getTimestamp = () => new Date().toISOString();

/**
 * Convert environment variable strings to boolean.
 * Accepts 'true', '1', or 'yes' (case-insensitive) as truthy values.
 */
function toBool(val) {
    return ['true', '1', 'yes'].includes(String(val || '').toLowerCase());
}

/**
 * Parse an environment variable as integer with a fallback default.
 */
function toInt(val, defaultVal) {
    const n = parseInt(val, 10);
    return Number.isNaN(n) ? defaultVal : n;
}

module.exports = {
    getTimestamp,
    toBool,
    toInt,
};