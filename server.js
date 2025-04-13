const express = require('express');
const path = require('path');
const fs = require('fs'); // Import file system module
const gtts = require('node-gtts'); // Keep for queue calls
const app = express();
const port = process.env.PORT || 3000;

// --- Timing Configuration ---
const debouncingIntervalMs = process.env.DEBOUNCINGINTERVALMS || 3000; // 3 seconds
// Default interval for the *entire* announcement cycle
const publicAnnouncementIntervalMs = process.env.PUBLICANNOUNCEMENTINTERVALMS || 30 * 60 * 1000; // 30 minutes (Adjust as needed)
const startPublicAnnouncementsAfterMs = process.env.STARTPUBLICANNOUNCEMENTSAFTERMS || 5 * 60 * 1000; // 5 minutes

// --- Configuration ---
// Keep language codes for queue fallbacks and filename consistency checks
const languageCodes = ['th', 'en', 'my', 'vi', 'cn', 'ja'];
const queueFallbackBasePath = path.join(__dirname, 'public', 'media', 'queue-fallback'); // Used for queue fallbacks

// Helper function to generate a formatted timestamp for logs
const getTimestamp = () => new Date().toISOString();

// --- Setup Middleware ---
app.use(express.json());
// Serve static files from 'public' directory (Handles /media/... requests now)
app.use(express.static(path.join(__dirname, 'public')));


// --- SSE Setup ---
let clients = [];

// --- Queue Debouncing ---
const pendingCalls = [];
let isProcessingQueue = false;
const lastProcessedTime = {};

// --- Public Announcement ---
let publicAnnouncementIntervalId = null;

// Get the absolute server path for the fallback queue MP3
const getFallbackQueueServerPath = (langCode) => {
    const fileLangCode = langCode === 'zh-CN' ? 'cn' : langCode;
    if (languageCodes.includes(fileLangCode)) {
        const filePath = path.join(queueFallbackBasePath, `queue-${fileLangCode}.mp3`);
        if (fs.existsSync(filePath)) {
            return filePath;
        } else {
            console.warn(`${getTimestamp()} - WARN (getFallbackQueueServerPath) - Fallback MP3 file not found: ${filePath}`);
            return null;
        }
    }
    return null;
};

// --- Error Handling Helpers --- (Unchanged)
function handleGttsError(err, res, context, fallbackPath) {
    console.error(`${getTimestamp()} - ERROR (${context}) - gTTS stream error:`, err);
    if (!res.headersSent) {
        if (fallbackPath) {
            console.log(`${getTimestamp()} - INFO (${context}) - gTTS failed, attempting fallback: ${fallbackPath}`);
            res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', 'no-cache');
            res.sendFile(fallbackPath, (fileErr) => {
                if (fileErr) { console.error(`${getTimestamp()} - ERROR (${context}) - Error sending fallback MP3:`, fileErr); if (!res.headersSent) res.status(500).send('Error generating speech and fallback failed.'); }
                else { console.log(`${getTimestamp()} - INFO (${context}) - Successfully sent fallback MP3.`); }
            });
        } else { console.error(`${getTimestamp()} - ERROR (${context}) - gTTS failed and no fallback MP3 available.`); res.status(500).send('Error generating speech and fallback unavailable.'); }
    } else { console.warn(`${getTimestamp()} - WARN (${context}) - gTTS error after headers sent. Cannot send fallback.`); res.end(); }
}
function handleServerError(err, res, context) {
    console.error(`${getTimestamp()} - ERROR (${context}) - Internal server error:`, err);
    if (!res.headersSent) { res.status(500).send('Internal server error'); }
}

// --- API Endpoints ---

// POST /call - (Unchanged)
app.post('/call', (req, res) => {
    const { queue, station } = req.body; const queueStr = String(queue); const stationStr = String(station);
    const now = Date.now(); const callKey = `${queueStr}:${stationStr}`;
    console.log(`${getTimestamp()} - POST /call - Received call: ${JSON.stringify({ queue: queueStr, station: stationStr })}`);
    if (lastProcessedTime[callKey] && (now - lastProcessedTime[callKey] < debouncingIntervalMs)) { console.log(`${getTimestamp()} - POST /call - Ignoring duplicate call (debounced): ${callKey}`); return res.sendStatus(200); }
    if (pendingCalls.some(call => call.callKey === callKey)) { console.log(`${getTimestamp()} - POST /call - Ignoring duplicate call (already in queue): ${callKey}`); return res.sendStatus(200); }
    const callObj = { type: 'queue', queue: queueStr, station: stationStr, callKey }; pendingCalls.push(callObj);
    console.log(`${getTimestamp()} - POST /call - Added call to queue: ${callKey}. Queue length: ${pendingCalls.length}`);
    if (!isProcessingQueue) { processQueue(); } res.sendStatus(200);
});

// SSE endpoint /events - (Unchanged)
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); clients.push(res);
    console.log(`${getTimestamp()} - GET /events - Client connected. Total clients: ${clients.length}`);
    const heartbeatIntervalMs = 15000;
    const heartbeatInterval = setInterval(() => {
        try { if (res.writableEnded) { clearInterval(heartbeatInterval); clients = clients.filter(client => client !== res); return; } res.write(': heartbeat\n\n'); }
        catch (error) { console.error(`${getTimestamp()} - GET /events - Error sending heartbeat:`, error); clearInterval(heartbeatInterval); clients = clients.filter(client => client !== res); }
    }, heartbeatIntervalMs);
    req.on('close', () => { clearInterval(heartbeatInterval); clients = clients.filter(client => client !== res); console.log(`${getTimestamp()} - GET /events - Client disconnected. Total clients: ${clients.length}`); });
});

// GET /speak - Queue Call Audio (Unchanged - still handles TTS/fallback)
app.get('/speak', (req, res) => {
    const { queue, station, lang } = req.query;
    if (!queue || !station || !lang) { console.error(`${getTimestamp()} - GET /speak - Missing parameters`); return res.status(400).send('Missing parameters'); }
    const fallbackPath = getFallbackQueueServerPath(lang);
    if (lang === 'my') { /* ... unchanged my handling ... */
        console.log(`${getTimestamp()} - GET /speak - Burmese requested, using fallback MP3 directly.`);
        if (fallbackPath) {
            res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', 'no-cache');
            res.sendFile(fallbackPath, (fileErr) => { if (fileErr) { console.error(`${getTimestamp()} - ERROR (speak - my fallback) - Error sending file:`, fileErr); if (!res.headersSent) res.status(500).send('Error sending Burmese fallback audio.'); } else { console.log(`${getTimestamp()} - GET /speak - Sent Burmese fallback MP3 for queue=${queue}, station=${station}`); } });
        } else { console.error(`${getTimestamp()} - GET /speak - Burmese fallback MP3 not found for lang=my`); res.status(404).send('Burmese fallback audio not found.'); } return;
    }
    let text = ''; let speakLang = lang;
    switch (lang) { /* ... unchanged switch case ... */
        case 'th': speakLang = 'th'; text = `คิวหมายเลข ${queue} เชิญที่ช่องบริการ ${station} ค่ะ`; break;
        case 'en': speakLang = 'en-uk'; text = `Queue number ${queue}, please proceed to station ${station}.`; break;
        case 'vi': speakLang = 'vi'; text = `Số thứ tự ${queue}, mời đến quầy ${station}.`; break;
        case 'cn': speakLang = 'zh-CN'; text = `排队号码 ${queue}，请到 ${station} 号窗口。`; break;
        case 'ja': speakLang = 'ja'; text = `整理番号 ${queue} 番の方、 ${station} 番窓口までお越しください。`; break;
        default: /* ... unchanged default/fallback handling ... */
            console.warn(`${getTimestamp()} - GET /speak - Unsupported language for TTS: ${lang}`);
            if (fallbackPath) { console.log(`${getTimestamp()} - GET /speak - Unsupported TTS lang ${lang}, attempting fallback.`); res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', 'no-cache'); res.sendFile(fallbackPath, (fileErr) => { if (fileErr) { console.error(`${getTimestamp()} - ERROR (speak - unsupported fallback) - Error sending file:`, fileErr); if (!res.headersSent) res.status(500).send('Error sending fallback audio.'); } else { console.log(`${getTimestamp()} - GET /speak - Sent fallback MP3 for unsupported lang ${lang}, queue=${queue}, station=${station}`); } }); } else { res.status(400).send(`Unsupported language and no fallback: ${lang}`); } return;
    }
    console.log(`${getTimestamp()} - GET /speak - Attempting TTS generation for lang=${lang} (using ${speakLang}), queue=${queue}, station=${station}`);
    try { /* ... unchanged try/catch for gTTS ... */
        if (typeof gtts !== 'function') { throw new Error('node-gtts module not loaded correctly.'); }
        res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', 'no-cache');
        const stream = gtts(speakLang).stream(text);
        stream.on('error', (err) => handleGttsError(err, res, `speak (lang=${lang}, queue=${queue})`, fallbackPath));
        stream.on('end', () => console.log(`${getTimestamp()} - GET /speak - Finished streaming TTS speech for lang=${lang}, queue=${queue}, station=${station}`));
        stream.pipe(res);
    } catch (err) { /* ... unchanged catch ... */
        console.error(`${getTimestamp()} - ERROR (speak setup - lang=${lang}) - Error setting up TTS:`, err);
        if (!res.headersSent && fallbackPath) { console.log(`${getTimestamp()} - INFO (speak setup) - TTS setup failed, attempting fallback: ${fallbackPath}`); res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', 'no-cache'); res.sendFile(fallbackPath, (fileErr) => { if (fileErr) { console.error(`${getTimestamp()} - ERROR (speak setup fallback) - Error sending fallback MP3:`, fileErr); if (!res.headersSent) { res.status(500).send('Error generating speech and fallback failed.'); } } else { console.log(`${getTimestamp()} - INFO (speak setup) - Successfully sent fallback MP3 after setup error.`); } }); } else if (!res.headersSent) { handleServerError(err, res, `speak setup (lang=${lang})`); } else { console.warn(`${getTimestamp()} - WARN (speak setup) - TTS setup error after headers sent. Cannot send fallback.`); res.end(); }
    }
});

// --- Queue Processing Logic --- (Unchanged)
function processQueue() {
    if (pendingCalls.length === 0) { isProcessingQueue = false; console.log(`${getTimestamp()} - processQueue - Queue is empty.`); return; }
    if (!isProcessingQueue) { isProcessingQueue = true; console.log(`${getTimestamp()} - processQueue - Starting processing.`); }
    const callObj = pendingCalls.shift(); lastProcessedTime[callObj.callKey] = Date.now();
    console.log(`${getTimestamp()} - processQueue - Processing call: ${callObj.callKey}. Remaining: ${pendingCalls.length}`);
    const payload = JSON.stringify({ type: 'queue_call', data: { queue: callObj.queue, station: callObj.station } });
    clients = clients.filter(clientRes => {
        if (clientRes.writableEnded) { return false; }
        try { clientRes.write(`data: ${payload}\n\n`); return true; }
        catch (error) { console.error(`${getTimestamp()} - processQueue - Error writing queue_call:`, error); return false; }
    });
    setTimeout(processQueue, debouncingIntervalMs);
}

// --- Public Announcement Triggering ---
function startPublicAnnouncements() {
    console.log(`${getTimestamp()} - Starting periodic public announcement CYCLE trigger every ${publicAnnouncementIntervalMs / 1000} seconds.`);
    if (publicAnnouncementIntervalId) {
        clearInterval(publicAnnouncementIntervalId);
    }

    const makeAnnouncement = () => {
        console.log(`${getTimestamp()} - makeAnnouncement - Interval triggered. Sending CYCLE START event.`);

        // Payload is now just a simple type indicator
        const payload = JSON.stringify({
            type: 'public_announcement_cycle_start' // New event type
        });

        // Broadcast to clients
        clients = clients.filter(clientRes => {
            if (clientRes.writableEnded) {
                console.log(`${getTimestamp()} - makeAnnouncement - Removing client (connection ended before broadcast).`);
                return false;
            }
            try {
                clientRes.write(`data: ${payload}\n\n`);
                return true;
            } catch (error) {
                console.error(`${getTimestamp()} - Error broadcasting public announcement CYCLE trigger:`, error);
                return false; // Remove client on error
            }
        });
        console.log(`${getTimestamp()} - makeAnnouncement - CYCLE START event broadcasted. Total clients: ${clients.length}`);

    };

    // Schedule first trigger, then set interval
    console.log(`${getTimestamp()} - Scheduling first announcement cycle trigger after ${startPublicAnnouncementsAfterMs / 1000} seconds.`);
    setTimeout(() => {
        console.log(`${getTimestamp()} - Timer finished, triggering first announcement cycle.`);
        makeAnnouncement();
        console.log(`${getTimestamp()} - Setting interval for subsequent announcement cycles every ${publicAnnouncementIntervalMs / 1000} seconds.`);
        publicAnnouncementIntervalId = setInterval(makeAnnouncement, publicAnnouncementIntervalMs);
    }, startPublicAnnouncementsAfterMs);
}


// --- Start Server ---
app.listen(port, () => {
    console.log(`${getTimestamp()} - Queue server running on http://localhost:${port}`);
    // Ensure media directories exist inside 'public'
    try {
        const publicAnnPath = path.join(__dirname, 'public', 'media', 'announcement');
        const publicFallbackPath = path.join(__dirname, 'public', 'media', 'queue-fallback');
        if (!fs.existsSync(publicAnnPath)) fs.mkdirSync(publicAnnPath, { recursive: true });
        if (!fs.existsSync(publicFallbackPath)) fs.mkdirSync(publicFallbackPath, { recursive: true });
        console.log(`${getTimestamp()} - Media directories checked/created inside 'public'.`);
        console.log(`${getTimestamp()} - Expecting announcement MP3s in: ${publicAnnPath}`);
        console.log(`${getTimestamp()} - Expecting queue fallback MP3s in: ${publicFallbackPath}`);
    } catch (err) {
        console.error(`${getTimestamp()} - ERROR creating media directories inside 'public':`, err);
    }

    startPublicAnnouncements(); // Start the periodic announcements
});