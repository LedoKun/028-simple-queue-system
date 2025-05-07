// --- Constants ---
const RECONNECT_DELAY_MS = 1000;
const STATUS_ICONS = {
    'connecting': '<i class="fas fa-sync fa-spin"></i>',
    'connected': '<i class="fas fa-check-circle"></i>',
    'disconnected': '<i class="fas fa-exclamation-circle"></i>'
};
const BACKGROUND_COLOR = '#121212';
const NOTIFICATION_DISPLAY_DURATION_MS = 3000;

// --- Elements ---
const form = document.getElementById('queueForm');
const stationInput = document.getElementById('station');
const queueInput = document.getElementById('queue');
const callButton = document.getElementById('callButton');
const announceButton = document.getElementById('announceButton');
const serverStatusEl = document.getElementById('serverStatus');
const editStationButton = document.getElementById('editStationBtn');

// --- State Variables ---
let socket = null; // Holds the current EventSource instance
let reconnectTimeoutId = null; // Holds the ID of the setTimeout for reconnection

// --- Utility Functions ---
const updateServerStatus = (status, message) => {
    if (!serverStatusEl) return; // Guard clause
    serverStatusEl.innerHTML = `<span class="icon">${STATUS_ICONS[status]}</span><span>${message}</span>`;
    serverStatusEl.title = message;
    serverStatusEl.className = `tag status-tag is-large is-${status}`;
};

const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
            position: fixed;
            top: 1.5rem;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            width: auto;
            maxWidth: 80%;
            padding-right: 2.5em;
        `;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete';
    deleteButton.setAttribute('aria-label', 'delete'); // Accessibility
    deleteButton.addEventListener('click', () => notification.remove());

    notification.appendChild(deleteButton);
    notification.appendChild(document.createTextNode(message));
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), NOTIFICATION_DISPLAY_DURATION_MS);
};

const sendCallQueueRequest = (station, queue) => {
    console.log(`Sending call: Queue=${queue}, Station=${station}`);
    return fetch('/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, station })
    })
        .then(response => {
            if (!response.ok) {
                console.error('Call failed:', response.status);
                showNotification(`Error calling queue: ${response.statusText || response.status}`, 'is-danger');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log("Call command sent successfully.");
            showNotification('Queue called successfully', 'is-success');
            queueInput.value = ''; // Clear queue input after successful call
            queueInput.focus();    // Focus for next input
        })
        .catch(error => {
            console.error('Call Queue Error:', error);
            showNotification('Network error calling queue. Please check connection.', 'is-danger');
        });
};

const sendTriggerAnnouncementRequest = () => {
    if (announceButton.disabled) return Promise.resolve(); // Already disabled, do nothing

    announceButton.disabled = true;
    let timeLeft = 120; // Cooldown period in seconds
    const originalHTML = announceButton.innerHTML;
    announceButton.title = `Wait ${timeLeft}s before next announcement`; // Initial title

    const updateButtonTimer = () => {
        announceButton.innerHTML = `<span class="icon"><i class="fas fa-clock"></i></span><span>Wait ${timeLeft}s</span>`;
        announceButton.title = `Wait ${timeLeft}s before next announcement`;
    };
    updateButtonTimer(); // Set initial text

    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            updateButtonTimer();
        } else {
            clearInterval(timer);
            announceButton.disabled = false;
            announceButton.innerHTML = originalHTML;
            announceButton.title = ''; // Clear title
        }
    }, 1000);

    return fetch('/trigger-announcement', { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                showNotification(`Error triggering announcement: ${response.statusText || response.status}`, 'is-danger');
                throw new Error(`HTTP error! status: ${response.status}`);
                // Note: Cooldown timer continues unless explicitly cleared on error before full duration
            }
            showNotification('Announcement triggered successfully', 'is-success');
            // Cooldown timer continues as intended
        })
        .catch(error => {
            // If the fetch fails, we should also reset the button sooner than the full cooldown
            clearInterval(timer); // Stop the countdown
            announceButton.disabled = false;
            announceButton.innerHTML = originalHTML;
            announceButton.title = ''; // Clear title

            console.error('Trigger Announcement Error:', error);
            showNotification('Network error triggering announcement.', 'is-danger');
        });
};

// --- Server-Sent Events (SSE) Connection ---
const connectEventSource = () => {
    // 1. Clear any previously scheduled reconnection attempt and nullify its ID
    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }

    // 2. Clean up any existing EventSource instance
    if (socket) {
        // Detach event handlers to prevent them from firing on the old, closed socket
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.close();
        // No need to set global `socket = null;` here, as it will be reassigned below
    }

    console.log("Attempting to connect to SSE endpoint (/events)...");
    updateServerStatus('connecting', 'Connecting...');
    socket = new EventSource('/events'); // Create and assign the new EventSource instance

    socket.onopen = () => {
        updateServerStatus('connected', 'Connected');
        console.log("SSE connection opened successfully.");
        // If a connection opens, cancel any (unlikely) pending reconnect timeout.
        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
        }
    };

    socket.onmessage = e => {
        if (e.data.startsWith(': heartbeat')) {
            // console.log("SSE Heartbeat received");
            // Optionally, refresh status if it somehow got stuck on connecting/disconnected
            // though onopen should handle the primary "connected" state.
            // updateServerStatus('connected', 'Connected');
            return;
        }
        console.log('SSE Data:', e.data);
        // Process other SSE messages if needed
    };

    socket.onerror = (err) => { // It's good practice to capture the error object
        console.error("SSE error occurred. Closing connection and scheduling reconnect.", err);
        updateServerStatus('disconnected', 'Disconnected - Retrying...');

        if (socket) { // This is the EventSource instance that encountered the error
            // Detach handlers from this specific failing instance
            socket.onopen = null;
            socket.onmessage = null;
            socket.onerror = null; // Crucial: prevent this handler from re-triggering for THIS instance
            socket.close();
            // Setting the global `socket` variable to null is fine, as it indicates no active connection.
            // It will be reassigned when `connectEventSource` successfully creates a new EventSource.
            socket = null;
        }

        // Clear any existing timeout before setting a new one, to ensure only one is pending.
        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
        }

        console.log(`Scheduling reconnect in ${RECONNECT_DELAY_MS / 1000} seconds...`);
        reconnectTimeoutId = setTimeout(connectEventSource, RECONNECT_DELAY_MS);
    };
};

// --- Event Listeners ---
window.addEventListener('load', () => {
    if (stationInput) { // Ensure elements exist
        stationInput.focus();
        stationInput.select();
    }
    if (queueInput) {
        queueInput.addEventListener('input', () => {
            queueInput.value = queueInput.value.toUpperCase();
        });
    }
    if (form) {
        form.addEventListener('input', () => {
            if (callButton) callButton.disabled = !form.checkValidity();
        });
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (form.checkValidity()) {
                sendCallQueueRequest(stationInput.value, queueInput.value);
            } else {
                form.reportValidity(); // Show native HTML5 validation messages
            }
        });
    }
    if (stationInput) {
        stationInput.addEventListener('focus', () => stationInput.select());
        stationInput.addEventListener('blur', () => {
            if (editStationButton && /^\d+$/.test(stationInput.value.trim())) {
                stationInput.disabled = true;
                editStationButton.style.display = 'inline-flex';
            }
        });
    }
    if (queueInput) {
        queueInput.addEventListener('focus', () => queueInput.select());
    }
    if (announceButton) {
        announceButton.addEventListener('click', sendTriggerAnnouncementRequest);
    }
    if (editStationButton) {
        editStationButton.addEventListener('click', () => {
            stationInput.disabled = false;
            stationInput.focus();
            editStationButton.style.display = 'none';
        });
    }

    connectEventSource(); // Initialize SSE connection
    if (document.documentElement) {
        document.documentElement.style.backgroundColor = BACKGROUND_COLOR;
    }
});


document.addEventListener('keydown', event => {
    // Check if focus is on an input field where default Enter behavior is desired
    const activeEl = document.activeElement;
    const isInputFocused = activeEl === stationInput || activeEl === queueInput;

    if (event.key === 'Enter') {
        if (activeEl === announceButton) return; // Allow default button behavior (or click)

        event.preventDefault(); // Prevent default form submission if not already handled

        if (activeEl === stationInput) {
            if (queueInput) queueInput.focus();
        } else if (activeEl === queueInput) {
            if (callButton) {
                callButton.focus(); // Focus the button
                if (!callButton.disabled) {
                    sendCallQueueRequest(stationInput.value, queueInput.value);
                }
            }
        } else if (activeEl === callButton && callButton && !callButton.disabled) {
            sendCallQueueRequest(stationInput.value, queueInput.value);
        } else if (!isInputFocused && form && callButton && !callButton.disabled && form.checkValidity()) {
            // If no specific input is focused but form is valid, allow Enter to call
            sendCallQueueRequest(stationInput.value, queueInput.value);
        }
    } else if (
        activeEl !== announceButton &&
        activeEl !== queueInput &&
        activeEl !== stationInput &&
        stationInput && stationInput.value && // Station must have a value
        queueInput && // queueInput must exist
        event.key.length === 1 &&
        !event.ctrlKey && !event.altKey && !event.metaKey &&
        /^[a-zA-Z0-9]$/.test(event.key)
    ) {
        queueInput.value = event.key.toUpperCase();
        queueInput.focus();
    }
});

window.addEventListener('beforeunload', () => {
    console.log("Page unloading. Cleaning up resources.");
    if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.close();
        socket = null;
        console.log("SSE connection closed.");
    }
    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
        console.log("Reconnect timer cleared.");
    }
});