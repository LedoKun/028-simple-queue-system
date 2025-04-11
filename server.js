const express = require('express');
const path = require('path');
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
    const now = Date.now();
    const callKey = `${queue}:${station}`;

    console.log(`${getTimestamp()} - POST /call - Received call: ${JSON.stringify({ queue, station })}`);

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
    const callObj = { queue, station, callKey };
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
        res.write(': heartbeat\n\n');
        console.log(`${getTimestamp()} - GET /events - Sent heartbeat to client.`);
    }, heartbeatIntervalMs);

    // Handle client disconnection
    req.on('close', () => {
        clearInterval(heartbeatInterval);
        clients = clients.filter(client => client !== res);
        console.log(`${getTimestamp()} - GET /events - Client disconnected. Total clients: ${clients.length}`);
    });
});

app.listen(port, () => console.log(`${getTimestamp()} - Queue server running on http://localhost:${port}`));