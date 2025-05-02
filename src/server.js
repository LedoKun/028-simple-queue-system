// ./server.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const logger = require('./logger');

const queueService = require('./services/queueService');
const callRoute = require('./routes/call');
const eventsRoute = require('./routes/events');
const speakRoute = require('./routes/speak');
const triggerRoute = require('./routes/triggerAnnouncement');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// mount all routes
app.use(callRoute);
app.use(eventsRoute);
app.use(speakRoute);
app.use(triggerRoute);

// ensure media directories exist
announcementDir = path.join(__dirname, 'public', 'media', 'announcement');
[announcementDir, config.ttsCacheDir].forEach(dir => {
    try {
        fs.mkdirSync(dir, { recursive: true });
        logger.info('Ensured media directory:', dir);
    } catch (err) {
        logger.error('Failed to ensure media directory', dir, err);
    }
});

// kick off any background processes
queueService.startPublicAnnouncements();

// start server
app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
});
