const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { getTimestamp } = require('./utils');
const queueService = require('./services/queueService');
const callRoute = require('./routes/call');
const eventsRoute = require('./routes/events');
const speakRoute = require('./routes/speak');
const triggerRoute = require('./routes/triggerAnnouncement');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(callRoute);
app.use(eventsRoute);
app.use(speakRoute);
app.use(triggerRoute);

['announcement', 'queue-fallback'].forEach(folder => {
    const dir = path.join(__dirname, 'public', 'media', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ ${getTimestamp()} - Ensured media directory: ${dir}`);
});

queueService.startPublicAnnouncements();

app.listen(config.port, () => {
    console.log(`🟢 ${getTimestamp()} - Server running on port ${config.port}`);
});
