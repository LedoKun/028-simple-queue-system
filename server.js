const express = require('express');
const path = require('path');
const gtts = require('node-gtts');
const app = express();
const port = process.env.PORT || 3000;

const debouncingIntervalMs = 3000; // 3 seconds
const publicAnnouncementIntervalMs = 30 * 60 * 1000; // 30 minutes

// Array to store connected SSE clients
let clients = [];

// Queue debouncing variables:
const pendingCalls = [];          // Queue for pending call objects
let isProcessingQueue = false;    // Flag indicating if the queue is currently being processed
const lastProcessedTime = {};     // Map to store the last processed timestamp for each call key

// Public Announcement Configuration
const publicAnnouncements = [
    { lang: 'th', langCode: 'th', text: 'หมายเลขคิวใช้สำหรับเรียกท่านเข้ารับบริการเท่านั้น ลำดับการเรียกจะไม่เรียงตามหมายเลข' },
    { lang: 'en', langCode: 'en-uk', text: 'This queue number is used only to call you for service. The calling order will not be sequential.' },
    { lang: 'vi', langCode: 'vi', text: 'Số thứ tự này chỉ dùng để gọi quý khách vào nhận dịch vụ. Thứ tự gọi sẽ không theo trình tự số.' },
    { lang: 'zh-CN', langCode: 'zh-CN', text: '此排队号码仅用于呼叫您前来就诊。呼叫顺序将不按数字排列。' },
    { lang: 'ja', langCode: 'ja', text: 'この整理番号は患者様をお呼び出しするためだけに使用します。お呼び出しの順番は番号順ではありません。' }
];

let publicAnnouncementIntervalId = null;

// Function to generate a formatted timestamp for logs
const getTimestamp = () => new Date().toISOString();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /call endpoint - handles incoming queue call requests
app.post('/call', (req, res) => {
    const { queue, station } = req.body;
    // Ensure queue and station are treated as strings for consistency
    const queueStr = String(queue);
    const stationStr = String(station);
    const now = Date.now();
    const callKey = `${queueStr}:${stationStr}`;

    console.log(`${getTimestamp()} - POST /call - Received call: ${JSON.stringify({ queue: queueStr, station: stationStr })}`);

    // Check if the same call was processed recently
    if (lastProcessedTime[callKey] && (now - lastProcessedTime[callKey] < debouncingIntervalMs)) {
        console.log(`${getTimestamp()} - POST /call - Ignoring duplicate call (debounced): ${callKey}`);
        return res.sendStatus(200); // Ignore the call if processed within the debounce interval
    }

    // Check if the same call is already in the pending queue
    if (pendingCalls.some(call => call.callKey === callKey)) {
        console.log(`${getTimestamp()} - POST /call - Ignoring duplicate call (already in queue): ${callKey}`);
        return res.sendStatus(200); // Ignore duplicate calls in the queue
    }

    // Add the new call to the pending calls queue
    const callObj = { type: 'queue', queue: queueStr, station: stationStr, callKey }; // Add type
    pendingCalls.push(callObj);
    console.log(`${getTimestamp()} - POST /call - Added call to queue: ${callKey}. Queue length: ${pendingCalls.length}`);

    // Start processing the queue if it's not already active
    if (!isProcessingQueue) {
        processQueue();
    }

    res.sendStatus(200);
});

// Function to process the pending call queue with a defined interval
function processQueue() {
    if (pendingCalls.length === 0) {
        isProcessingQueue = false;
        console.log(`${getTimestamp()} - processQueue - Queue is empty. Processing finished.`);
        return;
    }

    if (!isProcessingQueue) {
        isProcessingQueue = true;
        console.log(`${getTimestamp()} - processQueue - Starting queue processing.`);
    }

    const callObj = pendingCalls.shift(); // Get the next call from the front of the queue
    lastProcessedTime[callObj.callKey] = Date.now(); // Update the last processed time for this call
    console.log(`${getTimestamp()} - processQueue - Processing call: ${callObj.callKey}. Remaining in queue: ${pendingCalls.length}`);

    // Construct the payload for SSE clients (only send queue/station for display)
    const payload = JSON.stringify({ queue: callObj.queue, station: callObj.station });

    // Broadcast the call event to all connected SSE clients
    clients.forEach(clientRes => {
        try {
            // Send 'queue_call' type explicitly if needed, or just the data
            // const eventPayload = JSON.stringify({ type: 'queue_call', data: { queue: callObj.queue, station: callObj.station } });
            // For simplicity, keeping the original payload structure for queue calls
            clientRes.write(`data: ${payload}\n\n`);
            console.log(`${getTimestamp()} - processQueue - Broadcasted event to client: ${payload}`);
        } catch (error) {
            console.error(`${getTimestamp()} - processQueue - Error writing to SSE client:`, error);
            clients = clients.filter(client => client !== clientRes);
            console.log(`${getTimestamp()} - processQueue - Removed unresponsive client. Total clients: ${clients.length}`);
        }
    });

    // Schedule the next queue processing after the debounce interval
    setTimeout(processQueue, debouncingIntervalMs);
}

// SSE endpoint for clients to subscribe to events
app.get('/events', (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Add the new client (response object) to the list of connected clients
    clients.push(res);
    console.log(`${getTimestamp()} - GET /events - Client connected. Total clients: ${clients.length}`);

    // Send a heartbeat message every 15 seconds
    const heartbeatIntervalMs = 15000;
    const heartbeatInterval = setInterval(() => {
        try {
            res.write(': heartbeat\n\n');
        } catch (error) {
            console.error(`${getTimestamp()} - GET /events - Error sending heartbeat:`, error);
            clearInterval(heartbeatInterval);
            clients = clients.filter(client => client !== res);
            console.log(`${getTimestamp()} - GET /events - Removed unresponsive client after heartbeat error. Total clients: ${clients.length}`);
        }
    }, heartbeatIntervalMs);

    // Handle client disconnection
    req.on('close', () => {
        clearInterval(heartbeatInterval);
        clients = clients.filter(client => client !== res);
        console.log(`${getTimestamp()} - GET /events - Client disconnected. Total clients: ${clients.length}`);
    });
});

// --- Queue Call TTS Endpoint ---
app.get('/speak', (req, res) => {
    const { queue, station, lang } = req.query;

    if (!queue || !station || !lang) {
        console.error(`${getTimestamp()} - GET /speak - Missing parameters: queue, station, or lang`);
        return res.status(400).send('Missing queue, station, or lang parameter');
    }

    let text = '';
    let speakLang = lang; // Default to the provided lang

    switch (lang) {
        case 'th':
            speakLang = 'th';
            text = `คิวหมายเลข ${queue} เชิญที่ช่องบริการ ${station} ค่ะ`;
            break;
        case 'en': // British English
            speakLang = 'en-uk';
            text = `Queue number ${queue}, please proceed to station ${station}.`;
            break;
        case 'vi': // Vietnamese
            speakLang = 'vi';
            text = `Số thứ tự ${queue}, mời đến quầy ${station}.`;
            break;
        case 'zh-CN': // Simplified Mandarin
            speakLang = 'zh-CN';
            text = `排队号码 ${queue}，请到 ${station} 号窗口。`;
            break;
        case 'ja': // Japanese
            speakLang = 'ja';
            text = `整理番号 ${queue} 番の方、 ${station} 番窓口までお越しください。`; // Adjust phrasing if needed
            break;
        default:
            console.warn(`${getTimestamp()} - GET /speak - Unsupported language: ${lang}`);
            return res.status(400).send('Unsupported language');
    }

    console.log(`${getTimestamp()} - GET /speak - Generating speech for lang=${lang} (using ${speakLang}), queue=${queue}, station=${station}`);

    try {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        const stream = gtts(speakLang).stream(text);
        stream.pipe(res);
        stream.on('error', (err) => handleGttsError(err, res, `speak (lang=${lang})`));
        stream.on('end', () => console.log(`${getTimestamp()} - GET /speak - Finished streaming speech for lang=${lang}, queue=${queue}, station=${station}`));
    } catch (err) {
        handleServerError(err, res, `speak (lang=${lang})`);
    }
});

// --- Public Announcement TTS Endpoint ---
app.get('/speak-announcement', (req, res) => {
    const { lang } = req.query;

    if (!lang) {
        console.error(`${getTimestamp()} - GET /speak-announcement - Missing lang parameter`);
        return res.status(400).send('Missing lang parameter');
    }

    const announcement = publicAnnouncements.find(a => a.lang === lang);

    if (!announcement) {
        console.warn(`${getTimestamp()} - GET /speak-announcement - Unsupported language: ${lang}`);
        return res.status(400).send('Unsupported language for public announcement');
    }

    const speakLang = announcement.langCode; // Use the specific code (e.g., 'tl' for 'fil')
    const text = announcement.text;

    console.log(`${getTimestamp()} - GET /speak-announcement - Generating speech for lang=${lang} (using ${speakLang})`);

    try {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        const stream = gtts(speakLang).stream(text);
        stream.pipe(res);
        stream.on('error', (err) => handleGttsError(err, res, `speak-announcement (lang=${lang})`));
        stream.on('end', () => console.log(`${getTimestamp()} - GET /speak-announcement - Finished streaming speech for lang=${lang}`));
    } catch (err) {
        handleServerError(err, res, `speak-announcement (lang=${lang})`);
    }
});

// --- Helper Functions for Error Handling ---
function handleGttsError(err, res, context) {
    console.error(`${getTimestamp()} - ERROR (${context}) - gTTS stream error:`, err);
    if (!res.headersSent) {
        res.status(500).send('Error generating speech');
    } else {
        res.end();
    }
}

function handleServerError(err, res, context) {
    console.error(`${getTimestamp()} - ERROR (${context}) - Internal server error:`, err);
    if (!res.headersSent) {
        res.status(500).send('Internal server error');
    }
}

// --- Function to Start Periodic Public Announcements ---
function startPublicAnnouncements() {
    console.log(`${getTimestamp()} - Starting periodic public announcements every ${publicAnnouncementIntervalMs / 60000} minutes.`);
    if (publicAnnouncementIntervalId) {
        clearInterval(publicAnnouncementIntervalId); // Clear existing interval if any
    }

    const makeAnnouncement = () => {
        console.log(`${getTimestamp()} - Triggering public announcement.`);
        const payload = JSON.stringify({ type: 'public_announcement' });
        clients.forEach(clientRes => {
            try {
                clientRes.write(`data: ${payload}\n\n`);
                console.log(`${getTimestamp()} - Broadcasted public announcement trigger to client.`);
            } catch (error) {
                console.error(`${getTimestamp()} - Error broadcasting public announcement trigger:`, error);
                // Consider removing client if write fails
                clients = clients.filter(client => client !== clientRes);
                console.log(`${getTimestamp()} - Removed unresponsive client during public announcement broadcast. Total clients: ${clients.length}`);
            }
        });
    };

    // Make the first announcement shortly after start, then set interval
    setTimeout(makeAnnouncement, 5000); // Announce 5 seconds after start
    publicAnnouncementIntervalId = setInterval(makeAnnouncement, publicAnnouncementIntervalMs);
}


// --- Start Server and Announcements ---
app.listen(port, () => {
    console.log(`${getTimestamp()} - Queue server running on http://localhost:${port}`);
    startPublicAnnouncements(); // Start the periodic announcements
});