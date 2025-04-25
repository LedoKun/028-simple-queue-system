const createLogger = require('console-log-level');

// pick level from env (default to info)
const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    prefix: () => new Date().toISOString() + ' |'   // timestamp prefix
});

module.exports = logger;