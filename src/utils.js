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

module.exports = {
    getTimestamp,
    toBool,
};