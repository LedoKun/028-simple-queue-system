const { getTimestamp } = require('../utils');
const configQS = require('../config');

let clients = [];
const pendingCalls = [];
let isProcessingQueue = false;
const lastProcessedTime = {};

function addClient(res) {
    clients.push(res);
    console.log(`➕ ${getTimestamp()} - Client connected. Total: ${clients.length}`);
}

function removeClient(res) {
    clients = clients.filter(c => c !== res);
    console.log(`➖ ${getTimestamp()} - Client disconnected. Total: ${clients.length}`);
}

function enqueueCall(queue, station) {
    const now = Date.now();
    const callKey = `${queue}:${station}`;
    if (lastProcessedTime[callKey] && now - lastProcessedTime[callKey] < configQS.debouncingIntervalMs) {
        console.log(`🚫 ${getTimestamp()} - Debounced call: ${callKey}`);
        return;
    }
    if (pendingCalls.some(c => c.callKey === callKey)) {
        console.log(`🚫 ${getTimestamp()} - Duplicate in queue: ${callKey}`);
        return;
    }
    pendingCalls.push({ queue, station, callKey });
    console.log(`✅ ${getTimestamp()} - Enqueued call: ${callKey}. Pending: ${pendingCalls.length}`);
    if (!isProcessingQueue) processQueue();
}

function processQueue() {
    if (pendingCalls.length === 0) {
        isProcessingQueue = false;
        console.log(`✅ ${getTimestamp()} - Queue empty.`);
        return;
    }
    isProcessingQueue = true;
    const callObj = pendingCalls.shift();
    lastProcessedTime[callObj.callKey] = Date.now();
    console.log(`🔄 ${getTimestamp()} - Processing: ${callObj.callKey}`);

    const payload = JSON.stringify({ type: 'queue_call', data: { queue: callObj.queue, station: callObj.station } });
    clients = clients.filter(res => {
        if (res.writableEnded || res.writableFinished) return false;
        try { res.write(`data: ${payload}\n\n`); return true; } catch { return false; }
    });

    setTimeout(processQueue, configQS.debouncingIntervalMs);
}

function startPublicAnnouncements() {
    console.log(`⏱️ ${getTimestamp()} - Scheduling public announcements every ${configQS.publicAnnouncementIntervalMs / 1000}s`);
    const announce = () => {
        console.log(`📢 ${getTimestamp()} - Broadcasting public announcement.`);
        const payload = JSON.stringify({ type: 'public_announcement_cycle_start' });
        clients = clients.filter(res => {
            if (res.writableEnded || res.writableFinished) return false;
            try { res.write(`data: ${payload}\n\n`); return true; } catch { return false; }
        });
    };
    setTimeout(() => {
        announce();
        setInterval(announce, configQS.publicAnnouncementIntervalMs);
    }, configQS.startPublicAnnouncementsAfterMs);
}

function triggerAnnouncement() {
    console.log(`📢 ${getTimestamp()} - Manual announcement trigger.`);
    const payload = JSON.stringify({ type: 'public_announcement_cycle_start' });
    clients = clients.filter(res => {
        if (res.writableEnded || res.writableFinished) return false;
        try { res.write(`data: ${payload}\n\n`); return true; } catch { return false; }
    });
}

module.exports = { addClient, removeClient, enqueueCall, startPublicAnnouncements, triggerAnnouncement };