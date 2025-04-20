const { getTimestamp } = require('../utils');
const configQS = require('../config');

let clients = [];
const pendingCalls = [];
let isProcessingQueue = false;
const lastProcessedTime = {};

function addClient(res) {
    clients.push(res);
    console.log(`${getTimestamp()} - Client added. Total clients: ${clients.length}`);
}

function enqueueCall(queue, station) {
    const now = Date.now();
    const callKey = `${queue}:${station}`;
    if (lastProcessedTime[callKey] && now - lastProcessedTime[callKey] < configQS.debouncingIntervalMs) return;
    if (pendingCalls.some(c => c.callKey === callKey)) return;
    pendingCalls.push({ queue, station, callKey });
    console.log(`${getTimestamp()} - Call enqueued: ${callKey}. Pending: ${pendingCalls.length}`);
    if (!isProcessingQueue) processQueue();
}

function processQueue() {
    if (pendingCalls.length === 0) {
        isProcessingQueue = false;
        console.log(`${getTimestamp()} - Queue empty.`);
        return;
    }
    isProcessingQueue = true;
    const callObj = pendingCalls.shift();
    lastProcessedTime[callObj.callKey] = Date.now();
    console.log(`${getTimestamp()} - Processing: ${callObj.callKey}`);

    const payload = JSON.stringify({ type: 'queue_call', data: { queue: callObj.queue, station: callObj.station } });
    clients = clients.filter(res => {
        if (res.writableEnded || res.writableFinished) return false;
        try { res.write(`data: ${payload}\n\n`); return true; } catch { return false; }
    });

    setTimeout(processQueue, configQS.debouncingIntervalMs);
}

function startPublicAnnouncements() {
    const announce = () => {
        const payload = JSON.stringify({ type: 'public_announcement_cycle_start' });
        console.log(`${getTimestamp()} - Broadcasting public announcement.`);
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
    const payload = JSON.stringify({ type: 'public_announcement_cycle_start' });
    console.log(`${getTimestamp()} - Manual public announcement trigger.`);
    clients = clients.filter(res => {
        if (res.writableEnded || res.writableFinished) return false;
        try { res.write(`data: ${payload}\n\n`); return true; } catch { return false; }
    });
}

module.exports = { addClient, enqueueCall, startPublicAnnouncements, triggerAnnouncement };
