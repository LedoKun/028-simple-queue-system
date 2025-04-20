const express = require('express');
const path = require('path');
const fs = require('fs'); // Import file system module
const gtts = require('node-gtts'); // Keep for queue calls
const rateLimit = require('express-rate-limit'); // Import rate limiting middleware
const app = express();
const port = process.env.PORT || 3000;

// --- Timing Configuration ---
const debouncingIntervalMs = parseInt(process.env.DEBOUNCINGINTERVALMS || 3000); // 3 seconds
// Default interval for the *entire* announcement cycle
const publicAnnouncementIntervalMs = parseInt(process.env.PUBLICANNOUNCEMENTINTERVALMS || 30 * 60 * 1000); // 30 minutes (Adjust as needed)
const startPublicAnnouncementsAfterMs = parseInt(process.env.STARTPUBLICANNOUNCEMENTSAFTERMS || 5 * 60 * 1000); // 5 minutes

// --- Rate Limiting Configuration ---
// Configure limits via environment variables or use defaults
const callRateLimitWindowMs = parseInt(process.env.CALL_RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
const callRateLimitMax = parseInt(process.env.CALL_RATE_LIMIT_MAX || '20', 10); // Max 20 requests per minute per IP for /call

const speakRateLimitWindowMs = parseInt(process.env.SPEAK_RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
const speakRateLimitMax = parseInt(process.env.SPEAK_RATE_LIMIT_MAX || '30', 10); // Max 30 requests per minute per IP for /speak

const triggerRateLimitWindowMs = parseInt(process.env.TRIGGER_RATE_LIMIT_WINDOW_MS || '300000', 10); // 5 minutes
const triggerRateLimitMax = parseInt(process.env.TRIGGER_RATE_LIMIT_MAX || '5', 10); // Max 5 requests per 5 minutes per IP for /trigger-announcement


// --- Configuration ---
// Keep language codes for queue fallbacks and filename consistency checks
// const languageCodes = ['th', 'en', 'my', 'vi', 'fil', 'cn', 'ja'];
const languageCodes = ['th', 'en', 'my'];
const queueFallbackBasePath = path.join(__dirname, 'public', 'media', 'queue-fallback'); // Used for queue fallbacks

// Helper function to generate a formatted timestamp for logs
const getTimestamp = () => new Date().toISOString();

// --- Setup Middleware ---
app.use(express.json());
// Serve static files from 'public' directory (Handles /media/... requests now)
app.use(express.static(path.join(__dirname, 'public')));

// --- Apply Rate Limiting ---
const callLimiter = rateLimit({
    windowMs: callRateLimitWindowMs,
    max: callRateLimitMax,
    message: 'Too many calls from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const speakLimiter = rateLimit({
    windowMs: speakRateLimitWindowMs,
    max: speakRateLimitMax,
    message: 'Too many speak requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const triggerLimiter = rateLimit({
    windowMs: triggerRateLimitWindowMs,
    max: triggerRateLimitMax,
    message: 'Too many announcement triggers from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});


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
    // Sanitize langCode input slightly for path construction, though languageCodes check is the main guard
    const safeLangCode = String(langCode || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();

    const fileLangCode = safeLangCode === 'zh-cn' ? 'cn' : safeLangCode; // Handle zh-CN mapping
    if (languageCodes.includes(fileLangCode)) {
        const filePath = path.join(queueFallbackBasePath, `queue-${fileLangCode}.mp3`);
        // Use async fs.promises.access or sync fs.existsSync carefully if performance is critical
        if (fs.existsSync(filePath)) {
            return filePath;
        } else {
            console.warn(`${getTimestamp()} - WARN (getFallbackQueueServerPath) - Fallback MP3 file not found: ${filePath}`);
            return null;
        }
    }
    console.warn(`${getTimestamp()} - WARN (getFallbackQueueServerPath) - Invalid or unsupported language code attempted: ${safeLangCode}`);
    return null;
};

// --- Error Handling Helpers ---
function handleGttsError(err, res, context, fallbackPath) {
    console.error(`${getTimestamp()} - ERROR (${context}) - gTTS stream error:`, err);
    if (!res.headersSent) {
        if (fallbackPath) {
            console.log(`${getTimestamp()} - INFO (${context}) - gTTS failed, attempting fallback: ${fallbackPath}`);
            res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', '86400');
            // Use pipe for potentially large files, handle errors
            const readStream = fs.createReadStream(fallbackPath);
            readStream.on('error', (fileErr) => {
                console.error(`${getTimestamp()} - ERROR (${context}) - Error reading fallback MP3:`, fileErr);
                if (!res.headersSent) {
                    res.status(500).send('Error generating speech and fallback failed (read error).');
                } else {
                    res.end(); // Attempt to close response if headers sent
                }
            });
            readStream.pipe(res); // Pipe file stream to response
            console.log(`${getTimestamp()} - INFO (${context}) - Started sending fallback MP3.`);
        } else { console.error(`${getTimestamp()} - ERROR (${context}) - gTTS failed and no fallback MP3 available.`); res.status(500).send('Error generating speech and fallback unavailable.'); }
    } else { console.warn(`${getTimestamp()} - WARN (${context}) - gTTS error after headers sent. Cannot send fallback.`); res.end(); }
}

function handleServerError(err, res, context) {
    console.error(`${getTimestamp()} - ERROR (${context}) - Internal server error:`, err);
    if (!res.headersSent) { res.status(500).send('Internal server error'); }
}

// --- API Endpoints ---

// POST /call - Apply rate limiting
app.post('/call', callLimiter, (req, res) => {
    // Basic sanitization/validation for queue and station
    // Keep alphanumeric characters and spaces
    const queue = String(req.body.queue || '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
    const station = String(req.body.station || '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
    if (!queue || !station) {
        console.warn(`${getTimestamp()} - POST /call - Invalid or empty queue/station after sanitization.`);
        return res.status(400).send('Invalid queue or station data.');
    }

    const now = Date.now();
    const callKey = `${queue}:${station}`; // Use sanitized values for key

    console.log(`${getTimestamp()} - POST /call - Received call: ${JSON.stringify({ queue, station })}`);

    // Debouncing logic remains the same, using sanitized callKey
    if (lastProcessedTime[callKey] && (now - lastProcessedTime[callKey] < debouncingIntervalMs)) {
        console.log(`${getTimestamp()} - POST /call - Ignoring duplicate call (debounced): ${callKey}`);
        return res.sendStatus(200);
    }
    if (pendingCalls.some(call => call.callKey === callKey)) {
        console.log(`${getTimestamp()} - POST /call - Ignoring duplicate call (already in queue): ${callKey}`);
        return res.sendStatus(200);
    }

    // Store sanitized values in the pendingCalls queue
    const callObj = { type: 'queue', queue: queue, station: station, callKey: callKey };
    pendingCalls.push(callObj);
    console.log(`${getTimestamp()} - POST /call - Added call to queue: ${callKey}. Queue length: ${pendingCalls.length}`);

    if (!isProcessingQueue) { processQueue(); }
    res.sendStatus(200);
});

// SSE endpoint /events - No rate limiting needed for the SSE connection itself
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); // Changed to no-cache for SSE
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); clients.push(res);
    console.log(`${getTimestamp()} - GET /events - Client connected. Total clients: ${clients.length}`);
    const heartbeatIntervalMs = 15000;
    const heartbeatInterval = setInterval(() => {
        try {
            // Check if the client is still writable before writing
            if (res.writableFinished || res.writableEnded) {
                console.log(`${getTimestamp()} - GET /events - Client connection ended, clearing heartbeat.`);
                clearInterval(heartbeatInterval);
                clients = clients.filter(client => client !== res);
                return;
            }
            res.write(': heartbeat\n\n');
        }
        catch (error) {
            console.error(`${getTimestamp()} - GET /events - Error sending heartbeat:`, error);
            clearInterval(heartbeatInterval);
            clients = clients.filter(client => client !== res);
        }
    }, heartbeatIntervalMs);
    req.on('close', () => { clearInterval(heartbeatInterval); clients = clients.filter(client => client !== res); console.log(`${getTimestamp()} - GET /events - Client disconnected. Total clients: ${clients.length}`); });
});

// GET /speak - Queue Call Audio (Apply rate limiting and input sanitization)
app.get('/speak', speakLimiter, (req, res) => {
    // Sanitize inputs from query parameters
    const queue = String(req.query.queue || '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
    const station = String(req.query.station || '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
    // Lang is handled by the switch, but basic path sanitization is added in getFallbackQueueServerPath
    const lang = req.query.lang;

    if (!queue || !station || !lang) {
        console.warn(`${getTimestamp()} - GET /speak - Missing or invalid parameters after sanitization.`);
        return res.status(400).send('Missing or invalid parameters');
    }

    const fallbackPath = getFallbackQueueServerPath(lang);

    // Handle languages that explicitly use fallback MP3s
    if (lang === 'my' || lang === 'fil') {
        console.log(`${getTimestamp()} - GET /speak - Burmese / Filipino requested, using fallback MP3 directly. (Filepath = ${fallbackPath})`);
        if (fallbackPath) {
            res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', '86400');
            // Use pipe for streaming the file
            const readStream = fs.createReadStream(fallbackPath);
            readStream.on('error', (fileErr) => {
                console.error(`${getTimestamp()} - ERROR (speak - fallback) - Error reading file:`, fileErr);
                if (!res.headersSent) res.status(500).send('Error sending Burmese / Filipino fallback audio (read error).');
                else res.end();
            });
            readStream.pipe(res);
            console.log(`${getTimestamp()} - GET /speak - Started sending Burmese / Filipino fallback MP3 for queue=${queue}, station=${station}`);
        } else {
            console.error(`${getTimestamp()} - GET /speak - Burmese / Filipino fallback MP3 not found for lang=${lang}`);
            res.status(404).send('Burmese / Filipino fallback audio not found.');
        }
        return; // Important to return after sending fallback
    }

    // Prepare text for gTTS using the sanitized inputs
    let text = '';
    let speakLang = lang; // Default to requested lang
    switch (lang) {
        case 'th': speakLang = 'th'; text = `เชิญคิวหมายเลข ${queue} ที่ช่องบริการ ${station} ค่ะ`; break;
        case 'en': speakLang = 'en-uk'; text = `Queue number ${queue}, please proceed to station ${station}.`; break;
        case 'vi': speakLang = 'vi'; text = `Số thứ tự ${queue}, mời đến quầy ${station}.`; break;
        case 'cn': speakLang = 'zh-CN'; text = `排队号码 ${queue}，请到 ${station} 号窗口。`; break;
        case 'ja': speakLang = 'ja'; text = `整理番号 ${queue} 番の方、 ${station} 番窓口までお越しください。`; break;
        default:
            console.warn(`${getTimestamp()} - GET /speak - Unsupported language for TTS: ${lang}`);
            if (fallbackPath) {
                console.log(`${getTimestamp()} - GET /speak - Unsupported TTS lang ${lang}, attempting fallback.`);
                res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', '86400');
                const readStream = fs.createReadStream(fallbackPath);
                readStream.on('error', (fileErr) => {
                    console.error(`${getTimestamp()} - ERROR (speak - unsupported fallback) - Error reading file:`, fileErr);
                    if (!res.headersSent) res.status(500).send('Error sending fallback audio (read error).');
                    else res.end();
                });
                readStream.pipe(res);
                console.log(`${getTimestamp()} - GET /speak - Started sending fallback MP3 for unsupported lang ${lang}, queue=${queue}, station=${station}`);
            } else {
                res.status(400).send(`Unsupported language and no fallback: ${lang}`);
            }
            return; // Important to return after handling unsupported lang
    }

    console.log(`${getTimestamp()} - GET /speak - Attempting TTS generation for lang=${lang} (using ${speakLang}), queue=${queue}, station=${station}`);

    try {
        if (typeof gtts !== 'function') { throw new Error('node-gtts module not loaded correctly.'); }
        res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', '86400'); // Cache for 1 day
        const stream = gtts(speakLang).stream(text);
        stream.on('error', (err) => handleGttsError(err, res, `speak (lang=${lang}, queue=${queue})`, fallbackPath));
        stream.on('end', () => console.log(`${getTimestamp()} - GET /speak - Finished streaming TTS speech for lang=${lang}, queue=${queue}, station=${station}`));
        stream.pipe(res); // Pipe gTTS stream to response
    } catch (err) {
        console.error(`${getTimestamp()} - ERROR (speak setup - lang=${lang}) - Error setting up TTS:`, err);
        // Handle errors during gTTS setup, attempting fallback if available and headers not sent
        if (!res.headersSent && fallbackPath) {
            console.log(`${getTimestamp()} - INFO (speak setup) - TTS setup failed, attempting fallback: ${fallbackPath}`);
            res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', '86400');
            const readStream = fs.createReadStream(fallbackPath);
            readStream.on('error', (fileErr) => {
                console.error(`${getTimestamp()} - ERROR (speak setup fallback) - Error reading fallback MP3:`, fileErr);
                if (!res.headersSent) { res.status(500).send('Error generating speech and fallback failed (read error).'); }
                else { res.end(); }
            });
            readStream.pipe(res);
            console.log(`${getTimestamp()} - INFO (speak setup) - Started sending fallback MP3 after setup error.`);
        } else if (!res.headersSent) {
            handleServerError(err, res, `speak setup (lang=${lang})`);
        } else {
            console.warn(`${getTimestamp()} - WARN (speak setup) - TTS setup error after headers sent. Cannot send fallback or send 500.`);
            res.end(); // Ensure response is closed
        }
    }
});

// POST /trigger-announcement - Manual trigger for public announcement cycle (Apply rate limiting)
app.post('/trigger-announcement', triggerLimiter, (req, res) => {
    console.log(`${getTimestamp()} - POST /trigger-announcement - Manual announcement trigger received.`);
    // Manually trigger the announcement cycle
    const payload = JSON.stringify({
        type: 'public_announcement_cycle_start' // New event type
    });

    // Broadcast to clients
    clients = clients.filter(clientRes => {
        if (clientRes.writableEnded || clientRes.writableFinished) { // Check both for robustness
            console.log(`${getTimestamp()} - trigger-announcement - Removing client (connection ended before broadcast).`);
            return false;
        }
        try {
            clientRes.write(`data: ${payload}\n\n`);
            return true;
        } catch (error) {
            console.error(`${getTimestamp()} - trigger-announcement - Error broadcasting public announcement CYCLE trigger:`, error);
            return false; // Remove client on error
        }
    });
    console.log(`${getTimestamp()} - trigger-announcement - CYCLE START event broadcasted. Total clients: ${clients.length}`);

    res.sendStatus(200);
});

// --- Queue Processing Logic ---
function processQueue() {
    if (pendingCalls.length === 0) { isProcessingQueue = false; console.log(`${getTimestamp()} - processQueue - Queue is empty.`); return; }
    if (!isProcessingQueue) { isProcessingQueue = true; console.log(`${getTimestamp()} - processQueue - Starting processing.`); }
    const callObj = pendingCalls.shift(); lastProcessedTime[callObj.callKey] = Date.now(); // Use callKey with sanitized values
    console.log(`${getTimestamp()} - processQueue - Processing call: ${callObj.callKey}. Remaining: ${pendingCalls.length}`);

    // The payload uses the *sanitized* data already stored in callObj
    const payload = JSON.stringify({ type: 'queue_call', data: { queue: callObj.queue, station: callObj.station } });

    clients = clients.filter(clientRes => {
        if (clientRes.writableEnded || clientRes.writableFinished) { return false; } // Check both
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
            if (clientRes.writableEnded || clientRes.writableFinished) { // Check both
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
    // Log configured rate limits
    console.log(`${getTimestamp()} - Configured Rate Limits:`);
    console.log(`  /call: ${callRateLimitMax} requests per ${callRateLimitWindowMs / 1000} seconds`);
    console.log(`  /speak: ${speakRateLimitMax} requests per ${speakRateLimitWindowMs / 1000} seconds`);
    console.log(`  /trigger-announcement: ${triggerRateLimitMax} requests per ${triggerRateLimitWindowMs / 1000} seconds`);


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