(() => {
    const currentQueueEl = document.getElementById("currentQueue");
    const currentStationEl = document.getElementById("currentStation");
    const historyTableBody = document.getElementById("historyTable");
    const chimeAudio = document.getElementById("chimeAudio");
    const announcementAudio = document.getElementById("announcementAudio");
    const serverStatusEl = document.getElementById("serverStatus");

    let MAX_HISTORY = 5; // Initial conservative value, will be calculated
    let isPlayingAudio = false;
    const announcementQueue = [];
    const languagesToSpeak = ['th', 'en'];
    const publicAnnouncementLanguages = ['th', 'en'];
    const RECONNECT_DELAY_MS = 5000;
    const HISTORY_RECALC_INTERVAL_MS = 30000; // Recalculate every 30s
    let socket, reconnectTimeoutId = null, historyRecalcIntervalId = null;
    let previousQueue = null, previousStation = null;

    function updateServerStatus(status, message) {
        if (!serverStatusEl) return;
        serverStatusEl.textContent = message;
        serverStatusEl.classList.remove('status-connected', 'status-disconnected', 'status-connecting');
        if (status === 'connected') serverStatusEl.classList.add('status-connected');
        else if (status === 'disconnected') serverStatusEl.classList.add('status-disconnected');
        else serverStatusEl.classList.add('status-connecting');
        // console.log(`UI: Server status updated to: ${status} - ${message}`);
    }

    // --- History Management ---
    function calculateMaxHistory() {
        let rowHeight = 0; // Initialize rowHeight
        try {
            const tableWrapper = document.querySelector('.history-table-wrapper');
            const header = historyTableBody.previousElementSibling; // thead
            if (!tableWrapper || !header) {
                console.warn("Cannot find table wrapper or header for history calculation.");
                MAX_HISTORY = 5; // Fallback
                trimHistory();
                return;
            }

            const availableHeight = tableWrapper.offsetHeight;
            const headerHeight = header.offsetHeight;
            const usableHeight = Math.max(0, availableHeight - headerHeight); // Space for rows, ensure non-negative

            // --- Get Row Height ---
            if (historyTableBody.children.length > 0) {
                // Measure existing row (reliable)
                const sampleRow = historyTableBody.children[0];
                rowHeight = sampleRow.offsetHeight;
                // console.log(`Measured existing row height: ${rowHeight}px`);
            } else {
                // Temporarily add a row to measure if table is empty
                // console.log("History table empty, creating temporary row for measurement.");
                const tempRow = document.createElement('tr');
                // IMPORTANT: These inline styles MUST match the CSS for `history-table td`
                // to get an accurate height measurement.
                tempRow.innerHTML = `<td style="padding: 1em 0.75em; font-size: clamp(28px, 3vw, 44px); line-height: 1.4; vertical-align: middle; border: none;">&nbsp;</td><td style="padding: 1em 0.75em; font-size: clamp(28px, 3vw, 44px); line-height: 1.4; vertical-align: middle; border: none;">&nbsp;</td>`;
                // Hide it visually but allow layout calculation
                tempRow.style.visibility = 'hidden';
                tempRow.style.position = 'absolute'; // Take out of flow
                tempRow.style.left = '-9999px'; // Move off-screen
                document.body.appendChild(tempRow); // Append to body to ensure styles compute
                rowHeight = tempRow.offsetHeight; // Measure the temporary row
                document.body.removeChild(tempRow); // Remove it immediately
                // console.log(`Measured temporary row height: ${rowHeight}px`);
            }

            // --- Calculate Max Rows ---
            if (rowHeight > 0) {
                // Ensure at least 1 row can be shown if space is tight
                MAX_HISTORY = Math.max(1, Math.floor(usableHeight / rowHeight));
            } else {
                console.warn("Calculated row height is 0. Using fallback MAX_HISTORY.");
                MAX_HISTORY = 5; // Fallback if height calculation failed
            }

            // console.log(`Calculated MAX_HISTORY: ${MAX_HISTORY} (Usable Height: ${usableHeight}px, Row Height: ${rowHeight}px)`);
            trimHistory(); // Apply the newly calculated limit
        } catch (e) {
            console.error("Error calculating max history:", e);
            MAX_HISTORY = 5; // Fallback on error
            trimHistory();
        }
    }


    function trimHistory() {
        if (!historyTableBody) return;
        while (historyTableBody.children.length > MAX_HISTORY) {
            historyTableBody.removeChild(historyTableBody.lastChild); // Remove oldest (bottom)
        }
        // console.log(`History trimmed to ${historyTableBody.children.length} rows (Max: ${MAX_HISTORY})`);
    }

    // --- Server-Sent Events (SSE) Connection ---
    function connectEventSource() {
        if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
        if (socket) socket.close(); // Close existing socket if any

        console.log("Attempting to connect to SSE (/events)...");
        updateServerStatus('connecting', 'Connecting...');
        socket = new EventSource("/events");

        socket.onopen = () => {
            updateServerStatus('connected', 'Connected');
            console.log("SSE connection opened.");
            if (reconnectTimeoutId) { clearTimeout(reconnectTimeoutId); reconnectTimeoutId = null; }
        };

        socket.onmessage = event => {
            // Simple heartbeat check
            if (event.data.startsWith(': heartbeat')) {
                // console.log("Heartbeat received");
                updateServerStatus('connected', 'Connected'); // Keep status connected on heartbeat
                return;
            }
            // Process actual data
            try {
                const messageData = JSON.parse(event.data);
                // console.log("SSE message received:", messageData);
                if (messageData.type === 'public_announcement_cycle_start') {
                    console.log("Public announcement cycle triggered.");
                    announcementQueue.push({ type: 'public_cycle' });
                    playNextAnnouncement();
                } else if (messageData.type === 'queue_call') {
                    const { queue, station } = messageData.data;
                    console.log(`Queue call received: Station ${station}, Queue ${queue}`);
                    updateDisplay(queue, station); // Update visuals first
                    announcementQueue.push({ type: 'queue', data: { queue, station } });
                    playNextAnnouncement(); // Then queue audio
                }
            } catch (e) {
                console.error("Error processing SSE message data:", e, "Raw data:", event.data);
            }
        };

        socket.onerror = err => {
            console.error("SSE error:", err);
            updateServerStatus('disconnected', 'Disconnected');
            socket.close(); // Close the broken connection
            // Attempt to reconnect after a delay
            if (!reconnectTimeoutId) {
                console.log(`Attempting reconnect in ${RECONNECT_DELAY_MS / 1000} seconds...`);
                updateServerStatus('disconnected', 'Retrying...');
                reconnectTimeoutId = setTimeout(connectEventSource, RECONNECT_DELAY_MS);
            }
        };
    }

    // --- Display Update ---
    function updateDisplay(queue, station) {
        const queueStr = String(queue);
        const stationStr = String(station);
        // console.log(`Updating display: Station=${stationStr}, Queue=${queueStr}`);

        // Only add to history if the *queue number* has changed since the last call
        if (previousQueue !== null && previousQueue !== queueStr) {
            // console.log(`Adding previous call to history: Station=${previousStation}, Queue=${previousQueue}`);
            const newRow = document.createElement('tr');
            newRow.classList.add('history-row-animated'); // Add animation class
            newRow.innerHTML = `<td>${previousQueue}</td><td>${previousStation}</td>`;
            // Insert at the top of the table body
            historyTableBody.insertBefore(newRow, historyTableBody.firstChild);
        }
        // else if (previousQueue === null) {console.log("First display update, not adding to history yet."); }
        // else {console.log("Queue number hasn't changed, not adding previous to history."); }

        // Update current display numbers
        currentQueueEl.textContent = queueStr;
        currentStationEl.textContent = stationStr;

        // Re-apply animation classes to trigger them
        resetAnimation(currentQueueEl, 'number-large-animated');
        resetAnimation(currentStationEl, 'number-large-animated');
        resetAnimation(currentQueueEl.previousElementSibling, 'fade-in-animated'); // Subtitle
        resetAnimation(currentQueueEl.previousElementSibling.previousElementSibling, 'fade-in-animated'); // Label
        resetAnimation(currentStationEl.previousElementSibling, 'fade-in-animated'); // Subtitle
        resetAnimation(currentStationEl.previousElementSibling.previousElementSibling, 'fade-in-animated'); // Label

        // Remove older entries with the *same queue number* (to avoid duplicates in history)
        // This check happens *after* potentially adding the previous call.
        const rowsToRemove = [];
        // Start check from the second row (index 1) if a new row was just added.
        const startIndex = (previousQueue !== null && previousQueue !== queueStr) ? 1 : 0;
        for (let i = startIndex; i < historyTableBody.children.length; i++) {
            const row = historyTableBody.children[i];
            const cells = row.getElementsByTagName('td');
            if (cells.length >= 2 && cells[0].textContent === queueStr) {
                // console.log(`Marking older history entry for removal: queue ${queueStr}`);
                rowsToRemove.push(row);
            }
        }
        rowsToRemove.forEach(row => row.remove());


        // Update the 'previous' state for the next call
        previousQueue = queueStr;
        previousStation = stationStr;

        // Trim history based on MAX_HISTORY *after* additions/removals
        trimHistory();
        // console.log("Display update finished.");
    }

    function resetAnimation(element, animationClass) {
        if (!element) return;
        element.classList.remove(animationClass);
        void element.offsetWidth; // Trigger reflow to restart animation
        element.classList.add(animationClass);
    }

    // --- Audio Playback ---
    function playNextAnnouncement() {
        if (isPlayingAudio || announcementQueue.length === 0) {
            // console.log(`Skipping audio playback: isPlaying=${isPlayingAudio}, queueLength=${announcementQueue.length}`);
            return;
        }
        isPlayingAudio = true;
        const item = announcementQueue.shift();
        console.log("Playing next announcement:", item.type, item.data || '');

        // Ensure chime is loaded and play it
        chimeAudio.currentTime = 0;
        const chimePromise = chimeAudio.play();

        chimePromise.then(() => {
            // console.log("Chime started playing.");
            // Define what happens after chime ends (or if it fails)
            const continueAfterChime = () => {
                // console.log("Chime finished or skipped. Proceeding with announcement.");
                chimeAudio.removeEventListener('ended', continueAfterChime); // Clean up listener
                chimeAudio.removeEventListener('error', handleChimeError);   // Clean up listener
                if (item.type === 'queue') {
                    playQueueSequence(item.data, 0);
                } else if (item.type === 'public_cycle') {
                    playPublicSequence(0);
                } else {
                    console.log("Unknown announcement type, finishing audio sequence.");
                    isPlayingAudio = false;
                    setTimeout(playNextAnnouncement, 100); // Check queue again shortly
                }
            };

            const handleChimeError = (e) => {
                console.error("Chime audio error:", e);
                chimeAudio.removeEventListener('ended', continueAfterChime);
                chimeAudio.removeEventListener('error', handleChimeError);
                continueAfterChime(); // Still try to play announcement even if chime fails
            };

            chimeAudio.addEventListener('ended', continueAfterChime);
            chimeAudio.addEventListener('error', handleChimeError);

            // Fallback if play() resolves but audio doesn't actually start/end quickly
            setTimeout(() => {
                if (chimeAudio.paused && !chimeAudio.ended && isPlayingAudio && !announcementAudio.src) {
                    // console.warn("Chime seems stalled, skipping to announcement.");
                    continueAfterChime();
                }
            }, 1500); // 1.5 second timeout for chime


        }).catch(error => {
            // This catches errors from the chimeAudio.play() call itself (e.g., user interaction needed)
            console.error("Error initiating chime playback:", error);
            // Skip chime and play the main announcement directly
            if (item.type === 'queue') {
                playQueueSequence(item.data, 0);
            } else if (item.type === 'public_cycle') {
                playPublicSequence(0);
            } else {
                isPlayingAudio = false;
                setTimeout(playNextAnnouncement, 100);
            }
        });
    }

    function playQueueSequence(data, langIndex) {
        if (langIndex >= languagesToSpeak.length) {
            // console.log(`Finished queue announcement sequence for Station ${data.station}, Queue ${data.queue}`);
            isPlayingAudio = false;
            setTimeout(playNextAnnouncement, 500); // Check for more items after a pause
            return;
        }

        const lang = languagesToSpeak[langIndex];
        const audioUrl = `/speak?queue=${encodeURIComponent(data.queue)}&station=${encodeURIComponent(data.station)}&lang=${encodeURIComponent(lang)}`;
        // console.log(`Playing queue announcement segment: ${lang} (${audioUrl})`);

        playAudioSegment(
            audioUrl,
            () => playQueueSequence(data, langIndex + 1), // On success, play next language
            () => playQueueSequence(data, langIndex + 1)  // On error, also try next language (skip failed one)
        );
    }

    function playPublicSequence(langIndex) {
        if (langIndex >= publicAnnouncementLanguages.length) {
            // console.log("Finished public announcement sequence.");
            isPlayingAudio = false;
            setTimeout(playNextAnnouncement, 500); // Check for more items after a pause
            return;
        }
        const lang = publicAnnouncementLanguages[langIndex];
        const audioUrl = `/media/announcement/${lang}.mp3`;
        // console.log(`Playing public announcement segment: ${lang} (${audioUrl})`);

        playAudioSegment(
            audioUrl,
            () => playPublicSequence(langIndex + 1), // On success, play next language
            () => playPublicSequence(langIndex + 1)  // On error, also try next language
        );
    }

    function playAudioSegment(url, onSuccess, onError) {
        // console.log(`Attempting to play audio segment: ${url}`);
        // Use a unique query parameter to try and bypass browser caching issues if needed
        // announcementAudio.src = url + '?t=' + new Date().getTime();
        announcementAudio.src = url;
        announcementAudio.load(); // Explicitly load

        // Clear previous listeners immediately
        announcementAudio.onended = null;
        announcementAudio.onerror = null;

        const playPromise = announcementAudio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // console.log(`Playback started for: ${url}`);
                // Setup listeners for the current playback attempt
                announcementAudio.onended = () => {
                    // console.log(`Audio segment finished: ${url}`);
                    announcementAudio.onended = null; // Clean up
                    announcementAudio.onerror = null;
                    setTimeout(onSuccess, 50); // Short delay before next action
                };
                announcementAudio.onerror = (e) => {
                    console.error(`Audio segment error: ${url}`, e);
                    announcementAudio.onended = null; // Clean up
                    announcementAudio.onerror = null;
                    setTimeout(onError, 50); // Call error handler (often same as success for sequences)
                };
            }).catch(error => {
                // This catch handles errors *initiating* playback
                console.error(`Error initiating playback for: ${url}`, error);
                announcementAudio.onended = null; // Clean up just in case
                announcementAudio.onerror = null;
                setTimeout(onError, 50); // Assume error and proceed
            });
        } else {
            // Should not happen with modern browsers, but handle defensively
            console.error(`audio.play() did not return a promise for ${url}`);
            setTimeout(onError, 50);
        }
    }


    // --- Initialization and Event Listeners ---
    window.addEventListener('load', () => {
        console.log("Window loaded.");
        // Delay initial calculation slightly to ensure layout is stable
        setTimeout(() => {
            console.log("Performing initial history calculation.");
            calculateMaxHistory(); // Initial calculation
            // Start interval timer for recalculations
            if (historyRecalcIntervalId) clearInterval(historyRecalcIntervalId);
            historyRecalcIntervalId = setInterval(calculateMaxHistory, HISTORY_RECALC_INTERVAL_MS);
            console.log(`History recalculation interval started (${HISTORY_RECALC_INTERVAL_MS}ms).`);
        }, 500); // Increased delay to 500ms

        connectEventSource(); // Start connection to server

        // Attempt to unlock audio context on first user interaction
        document.body.addEventListener('click', () => {
            console.log("User interaction detected, pre-loading audio elements.");
            chimeAudio.load();
            announcementAudio.load();
        }, { once: true }); // Listener removed after first click
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Debounce resize event
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log("Window resized, recalculating history.");
            calculateMaxHistory();
        }, 250); // Recalculate 250ms after resize stops
    });

    window.addEventListener('beforeunload', () => {
        console.log("Page unloading. Cleaning up resources.");
        if (socket) {
            socket.close(); // Close SSE connection
            console.log("SSE connection closed.");
        }
        if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId); // Clear reconnect timer
        if (historyRecalcIntervalId) clearInterval(historyRecalcIntervalId); // Clear recalc timer

        // Stop any ongoing audio
        chimeAudio.pause();
        announcementAudio.pause();
        announcementAudio.src = ""; // Release audio resource

        updateServerStatus('disconnected', 'Disconnected'); // Update status indicator
    });

    (function () {
        const INACTIVITY_DELAY = 2000; // milliseconds
        let hideTimer;

        function resetCursorTimer() {
            // 1) Always show cursor when there's activity
            document.body.classList.remove('hide-cursor');

            // 2) Clear any existing hiding timer…
            clearTimeout(hideTimer);

            // 3) …and start a new one
            hideTimer = setTimeout(() => {
                document.body.classList.add('hide-cursor');
            }, INACTIVITY_DELAY);
        }

        // Kick things off
        document.addEventListener('mousemove', resetCursorTimer);
        document.addEventListener('mousedown', resetCursorTimer);  // also reset on clicks
        document.addEventListener('keydown', resetCursorTimer);    // reset on keypresses
        resetCursorTimer();
    })();
})();