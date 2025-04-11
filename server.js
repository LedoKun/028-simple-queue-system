const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const deboundingInterval = 5000; // 5 seconds

// Array of currently connected SSE clients
let clients = [];

// Queue debouncing variables:
const pendingCalls = [];          // Queue for pending call objects
let processing = false;           // Flag if processing is in progress
const lastProcessed = {};         // Map to store the last processed time for each call key

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /call endpoint - incoming queue call requests
app.post('/call', (req, res) => {
    const { queue, station } = req.body;
    const now = Date.now();
    const callKey = `${queue}:${station}`;

    // If the same call was processed in the last 30 seconds, ignore it.
    if (lastProcessed[callKey] && (now - lastProcessed[callKey] < 30000)) {
        return res.sendStatus(200);
    }

    // If the same call is already in the pending queue, ignore it.
    if (pendingCalls.some(call => call.callKey === callKey)) {
        return res.sendStatus(200);
    }

    // Add the new call to the pending calls queue.
    const callObj = { queue, station, callKey };
    pendingCalls.push(callObj);

    // If not already processing, start the queue processing.
    if (!processing) {
        processQueue();
    }

    res.sendStatus(200);
});

// Function to process pending call queue with a 30-second interval between calls.
function processQueue() {
    if (pendingCalls.length === 0) {
        processing = false;
        return;
    }

    processing = true;
    const callObj = pendingCalls.shift(); // Get the next call in queue
    lastProcessed[callObj.callKey] = Date.now();  // Record the processing time for this call

    // Broadcast the call to all connected SSE clients.
    const payload = JSON.stringify({ queue: callObj.queue, station: callObj.station });
    clients.forEach(clientRes => clientRes.write(`data: ${payload}\n\n`));

    // Wait 30 seconds before processing the next call.
    setTimeout(processQueue, deboundingInterval);
}

// SSE endpoint for clients to receive call events
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Add this client to our list
    clients.push(res);
    req.on('close', () => {
        // Remove the client when connection closes
        clients = clients.filter(client => client !== res);
    });
});

app.listen(port, () => console.log(`Queue server running on http://localhost:${port}`));
