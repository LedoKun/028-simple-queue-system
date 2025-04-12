const express = require('express');
const path = require('path');
const gtts = require('node-gtts'); // <--- Import node-gtts
const app = express();
const port = process.env.PORT || 3000;

const debouncingIntervalMs = 3000; // 3 seconds

// Array to store connected SSE clients
let clients = [];

// Queue debouncing variables:
const pendingCalls = [];          // Queue for pending call objects
let isProcessingQueue = false;    // Flag indicating if the queue is currently being processed
const lastProcessedTime = {};     // Map to store the last processed timestamp for each call key

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
    const callObj = { queue: queueStr, station: stationStr, callKey };
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

    // Construct the payload for SSE clients
    const payload = JSON.stringify({ queue: callObj.queue, station: callObj.station });

    // Broadcast the call event to all connected SSE clients
    clients.forEach(clientRes => {
        try {
            clientRes.write(`data: ${payload}\n\n`);
            console.log(`${getTimestamp()} - processQueue - Broadcasted event to client: ${payload}`);
        } catch (error) {
            console.error(`${getTimestamp()} - processQueue - Error writing to SSE client:`, error);
            // Consider removing the client if writing fails consistently
            clients = clients.filter(client => client !== clientRes);
            console.log(`${getTimestamp()} - processQueue - Removed unresponsive client. Total clients: ${clients.length}`);
        }
    });

    // Schedule the next queue processing after the debounce interval
    setTimeout(processQueue, debouncingIntervalMs);
}

// SSE endpoint for clients to subscribe to call events
app.get('/events', (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Add the new client (response object) to the list of connected clients
    clients.push(res);
    console.log(`${getTimestamp()} - GET /events - Client connected. Total clients: ${clients.length}`);

    // Send a heartbeat message every 15 seconds to prevent the connection from timing out
    const heartbeatIntervalMs = 15000;
    const heartbeatInterval = setInterval(() => {
        try {
            res.write(': heartbeat\n\n');
            // console.log(`${getTimestamp()} - GET /events - Sent heartbeat to client.`); // Less verbose logging
        } catch (error) {
            console.error(`${getTimestamp()} - GET /events - Error sending heartbeat:`, error);
            // Stop trying to send heartbeats and remove the client
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

// --- TTS Endpoint ---
app.get('/speak', (req, res) => {
    const { queue, station, lang } = req.query;

    if (!queue || !station || !lang) {
        console.error(`${getTimestamp()} - GET /speak - Missing parameters: queue, station, or lang`);
        return res.status(400).send('Missing queue, station, or lang parameter');
    }

    // --- Text generation based on language ---
    // !! IMPORTANT: Verify and adjust these translations for accuracy and naturalness !!
    let text = '';
    let speakLang = lang; // Use the provided lang code directly for gtts

    switch (lang) {
        case 'th':
            text = `คิวหมายเลข ${queue} เชิญที่ช่องบริการ ${station} ค่ะ`;
            break;
        case 'en':
            text = `Queue number ${queue}, please proceed to station ${station}.`;
            break;
        case 'vi': // Vietnamese
            text = `Số thứ tự ${queue}, mời đến quầy ${station}.`; // Example translation
            break;
        case 'zh': // Chinese (Simplified)
            speakLang = 'zh-CN'; // Specify variant if needed
            text = `排队号码 ${queue}，请到 ${station} 号窗口。`; // Example translation
            break;
        // Add other Chinese variants like 'zh-TW' if needed
        default:
            console.warn(`${getTimestamp()} - GET /speak - Unsupported language: ${lang}`);
            return res.status(400).send('Unsupported language');
    }
    // --- End Text Generation ---

    console.log(`${getTimestamp()} - GET /speak - Generating speech for lang=${lang}, queue=${queue}, station=${station}, text="${text}"`);

    try {
        // Set response headers for audio streaming
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache'); // Don't cache the audio

        // Get the audio stream from gTTS
        const stream = gtts(speakLang).stream(text);

        // Pipe the stream directly to the response
        stream.pipe(res);

        stream.on('error', (err) => {
            console.error(`${getTimestamp()} - GET /speak - gTTS stream error for lang=${lang}:`, err);
            if (!res.headersSent) {
                res.status(500).send('Error generating speech');
            } else {
                // If headers are already sent, we can only try to end the connection
                res.end();
            }
        });

        stream.on('end', () => {
            console.log(`${getTimestamp()} - GET /speak - Finished streaming speech for lang=${lang}, queue=${queue}, station=${station}`);
        });

    } catch (err) {
        console.error(`${getTimestamp()} - GET /speak - Error processing request for lang=${lang}:`, err);
        if (!res.headersSent) {
            res.status(500).send('Internal server error');
        }
    }
});
// --- End TTS Endpoint ---

app.listen(port, () => console.log(`${getTimestamp()} - Queue server running on http://localhost:${port}`));