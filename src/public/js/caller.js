(() => {
    // --- Constants ---
    const RECONNECT_DELAY_MS = 5000;
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
    let socket = null;
    let reconnectTimeoutId = null;

    // --- Utility Functions ---
    const updateServerStatus = (status, message) => {
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
                    showNotification('Error calling queue', 'is-danger');
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log("Call command sent successfully.");
                showNotification('Queue called successfully', 'is-success');
                queueInput.value = '';
                queueInput.focus();
            })
            .catch(error => {
                console.error('Call Queue Error:', error);
                showNotification('Network error. Check your connection.', 'is-danger');
            });
    };

    const sendTriggerAnnouncementRequest = () => {
        if (announceButton.disabled) return Promise.resolve();

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

        return fetch('/trigger-announcement', { method: 'POST' })
            .then(response => {
                if (!response.ok) {
                    clearInterval(timer);
                    announceButton.disabled = false;
                    announceButton.innerHTML = originalHTML;
                    announceButton.title = '';
                    showNotification(`Error triggering announcement: ${response.status}`, 'is-danger');
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                showNotification('Announcement triggered', 'is-success');
            })
            .catch(error => {
                clearInterval(timer);
                announceButton.disabled = false;
                announceButton.innerHTML = originalHTML;
                announceButton.title = '';
                console.error('Trigger Announcement Error:', error);
                showNotification('Network error triggering announcement.', 'is-danger');
            });
    };

    const connectEventSource = () => {
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
        socket.onerror = () => {
            updateServerStatus('disconnected', 'Disconnected');
            if (socket) {
                socket.close();
                socket = null;
            }
            reconnectTimeoutId = setTimeout(connectEventSource, RECONNECT_DELAY_MS);
        };
    };

    // --- Event Listeners ---
    window.addEventListener('load', () => {
        stationInput.focus();
        stationInput.select();
        connectEventSource();
        queueInput.addEventListener('input', () => {
            queueInput.value = queueInput.value.toUpperCase();
        });
        document.documentElement.style.backgroundColor = BACKGROUND_COLOR;
    });

    form.addEventListener('input', () => {
        callButton.disabled = !form.checkValidity();
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (form.checkValidity()) {
            sendCallQueueRequest(stationInput.value, queueInput.value);
        } else {
            form.reportValidity();
        }
    });

    stationInput.addEventListener('focus', () => stationInput.select());
    queueInput.addEventListener('focus', () => queueInput.select());
    announceButton.addEventListener('click', sendTriggerAnnouncementRequest);

    document.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (document.activeElement === announceButton) return;
            if (document.activeElement === stationInput) {
                queueInput.focus();
            } else if (document.activeElement === queueInput) {
                callButton.focus();
                if (!callButton.disabled) {
                    sendCallQueueRequest(stationInput.value, queueInput.value);
                }
            } else if (document.activeElement === callButton && !callButton.disabled) {
                sendCallQueueRequest(stationInput.value, queueInput.value);
            }
        } else if (
            document.activeElement !== announceButton &&
            document.activeElement !== queueInput &&
            document.activeElement !== stationInput &&
            stationInput.value &&
            event.key.length === 1 &&
            !event.ctrlKey && !event.altKey && !event.metaKey &&
            /^[a-zA-Z0-9]$/.test(event.key)
        ) {
            queueInput.value = event.key.toUpperCase();
            queueInput.focus();
        }
    });

    window.addEventListener('beforeunload', () => {
        console.log("Page unloading. Closing SSE connection.");
        if (socket) {
            socket.close();
            socket = null;
        }
        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
        }
    });

    stationInput.addEventListener('blur', () => {
        if (/^\d+$/.test(stationInput.value.trim())) {
            stationInput.disabled = true;
            editStationButton.style.display = 'inline-flex';
        }
    });

    editStationButton.addEventListener('click', () => {
        stationInput.disabled = false;
        stationInput.focus();
        editStationButton.style.display = 'none';
    });
})();