// --- Elements ---
const form = document.getElementById('queueForm');
const stationInput = document.getElementById('station');
const queueInput = document.getElementById('queue');
const callButton = document.getElementById('callButton');
const announceButton = document.getElementById('announceButton');
const serverStatusEl = document.getElementById('serverStatus');

// --- State Variables ---
let socket = null;
let reconnectTimeoutId = null;
const RECONNECT_DELAY_MS = 5000;

// --- Initial Setup ---
window.onload = () => {
    stationInput.focus();
    stationInput.select();
    connectEventSource();

    // Force uppercase for queue input
    queueInput.addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });

    // Set background color on document for consistent coloring
    document.documentElement.style.backgroundColor = '#121212';
};

// --- Enable/Disable Call Button ---
form.addEventListener('input', () => {
    callButton.disabled = !form.checkValidity();
});

// --- Call Queue Form Submit ---
form.addEventListener('submit', (event) => {
    callQueue(event);
});

// --- Focus Behavior ---
stationInput.addEventListener('focus', () => stationInput.select());
queueInput.addEventListener('focus', () => queueInput.select());

// --- Announce Button Click ---
announceButton.addEventListener('click', triggerAnnouncement);

// --- Keyboard Navigation ---
document.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        // prevent default to avoid accidental full-page submits
        event.preventDefault();
        if (document.activeElement === announceButton) return;
        if (document.activeElement === stationInput) {
            queueInput.focus();
        } else if (document.activeElement === queueInput) {
            callButton.focus();
            callQueue();
        } else {
            callQueue();
        }
    } else if (
        document.activeElement !== announceButton &&
        document.activeElement !== queueInput &&
        document.activeElement !== stationInput &&
        stationInput.value &&
        event.key.length === 1 &&
        !event.ctrlKey && !event.altKey && !event.metaKey
    ) {
        if (/^[a-zA-Z0-9]$/.test(event.key)) {
            queueInput.value = event.key.toUpperCase();
            queueInput.focus();
        }
    }
});

window.addEventListener('beforeunload', () => {
    console.log("Page unloading. Closing SSE connection.");
    if (socket) { socket.close(); socket = null; }
    if (reconnectTimeoutId) { clearTimeout(reconnectTimeoutId); }
});

// --- Call Queue Function ---
function callQueue(event) {
    if (event) event.preventDefault();

    // trigger browser validation UI
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const station = stationInput.value;
    const queue = queueInput.value;

    console.log(`Sending call: Queue=${queue}, Station=${station}`);
    fetch('/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, station })
    })
        .then(resp => {
            if (!resp.ok) {
                console.error('Call failed:', resp.status);
                showNotification('Error calling queue', 'is-danger');
            } else {
                console.log("Call command sent successfully.");
                showNotification('Queue called successfully', 'is-success');
                queueInput.value = '';
                queueInput.focus();
            }
        })
        .catch(err => {
            console.error('Network error:', err);
            showNotification('Network error. Check your connection.', 'is-danger');
        });
}

// --- Trigger Announcement Function ---
function triggerAnnouncement() {
    if (announceButton.disabled) return;

    announceButton.disabled = true;
    let timeLeft = 120;
    const originalHTML = announceButton.innerHTML;

    const timer = setInterval(() => {
        timeLeft--;
        announceButton.innerHTML = `<span class="icon"><i class="fas fa-clock"></i></span><span>Wait ${timeLeft}s</span>`;
        announceButton.title = `Wait ${timeLeft}s before next`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            announceButton.disabled = false;
            announceButton.innerHTML = originalHTML;
            announceButton.title = '';
        }
    }, 1000);

    fetch('/trigger-announcement', { method: 'POST' })
        .then(resp => {
            if (!resp.ok) {
                clearInterval(timer);
                announceButton.disabled = false;
                announceButton.innerHTML = originalHTML;
                announceButton.title = '';
                showNotification(`Error triggering announcement: ${resp.status}`, 'is-danger');
            } else {
                showNotification('Announcement triggered', 'is-success');
            }
        })
        .catch(err => {
            clearInterval(timer);
            announceButton.disabled = false;
            announceButton.innerHTML = originalHTML;
            announceButton.title = '';
            showNotification('Network error triggering announcement.', 'is-danger');
        });
}

// --- Server Status via SSE ---
function updateServerStatus(status, msg) {
    const statusIcons = {
        'connecting': '<i class="fas fa-sync fa-spin"></i>',
        'connected': '<i class="fas fa-check-circle"></i>',
        'disconnected': '<i class="fas fa-exclamation-circle"></i>'
    };

    serverStatusEl.innerHTML = `<span class="icon">${statusIcons[status]}</span><span>${msg}</span>`;
    serverStatusEl.title = msg;
    serverStatusEl.className = `tag status-tag is-large is-${status}`;
}

function connectEventSource() {
    if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
    if (socket) socket.close();

    console.log("Attempting to connect to SSE endpoint (/events)...");
    updateServerStatus('connecting', 'Connecting...');
    socket = new EventSource('/events');

    socket.onopen = () => updateServerStatus('connected', 'Connected');
    socket.onmessage = e => {
        if (!e.data.startsWith(': heartbeat')) {
            console.log('SSE:', e.data);
        }
    };
    socket.onerror = _ => {
        updateServerStatus('disconnected', 'Disconnected');
        socket.close(); socket = null;
        reconnectTimeoutId = setTimeout(connectEventSource, RECONNECT_DELAY_MS);
    };
}

// --- Notification Helper ---
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.position = 'fixed';
    notification.style.top = '1.5rem';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.zIndex = '1000';
    notification.style.width = 'auto';
    notification.style.maxWidth = '80%';

    // Add delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete';
    deleteButton.addEventListener('click', () => {
        document.body.removeChild(notification);
    });

    notification.appendChild(deleteButton);
    notification.appendChild(document.createTextNode(message));

    // Add to body
    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}