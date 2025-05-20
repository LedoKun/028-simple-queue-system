// public/js/operator_ui.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const callForm = document.getElementById('call-form');
    const originalIdInput = document.getElementById('call-original-id');
    const locationInput = document.getElementById('call-location');
    const btnCall = document.getElementById('btn-call');
    const btnSkip = document.getElementById('btn-skip');

    const statusCurrentCallId = document.getElementById('status-current-call-id');
    const statusCurrentCallLocation = document.getElementById('status-current-call-location');
    const listHistoryCalls = document.getElementById('list-history-calls');
    const listSkippedCalls = document.getElementById('list-skipped-calls');

    const statusAnnouncementSlot = document.getElementById('status-announcement-slot');
    const statusAnnouncementCooldown = document.getElementById('status-announcement-cooldown');
    const statusAnnouncementCooldownTimer = document.getElementById('status-announcement-cooldown-timer');
    const btnNextAnnouncement = document.getElementById('btn-next-announcement');

    const sseStatusIndicator = document.getElementById('sse-status-indicator');

    let cooldownIntervalId = null;
    const MAX_LIST_ITEMS_OPERATOR = 7;

    // --- Ensure common.js and api_client.js are loaded ---
    if (typeof apiClient === 'undefined' || typeof showFeedback === 'undefined' || typeof UI_TEXT === 'undefined' || typeof sanitizeText === 'undefined' || typeof formatDisplayTime === 'undefined') {
        console.error("OperatorUI: CRITICAL - common.js or api_client.js might not be loaded correctly or before operator_ui.js. Some utilities are missing.");
        alert("Operator UI cannot initialize fully. Please check browser console for errors related to common.js or api_client.js loading.");
        if (btnCall) btnCall.disabled = true;
        if (btnSkip) btnSkip.disabled = true;
        if (btnNextAnnouncement) btnNextAnnouncement.disabled = true;
        return;
    }

    window.currentGlobalLanguage = 'en';

    // --- Validation Function ---
    function validateInputs() {
        const originalId = originalIdInput.value.trim();
        const location = locationInput.value.trim();

        // Regex for Identifier: Starts with one uppercase letter, followed by one or more digits.
        const idPattern = /^[A-Z]\d+$/;
        // Regex for Location: One or more digits.
        const locationPattern = /^\d+$/;

        const isIdValid = idPattern.test(originalId);
        const isLocationValid = locationPattern.test(location);

        // Enable or disable buttons based on validation
        btnCall.disabled = !(isIdValid && isLocationValid);
        btnSkip.disabled = !(isIdValid && isLocationValid);
    }

    // --- Update UI Functions ---
    function updateQueueStatusDisplay(queueState) {
        console.log("OperatorUI: updateQueueStatusDisplay called with state:", queueState);
        const labels = UI_TEXT.en;

        if (!queueState) {
            console.warn("OperatorUI: queueState is null or undefined in updateQueueStatusDisplay.");
            if (statusCurrentCallId) statusCurrentCallId.textContent = '----';
            if (statusCurrentCallLocation) statusCurrentCallLocation.textContent = '----';
            if (listHistoryCalls) listHistoryCalls.innerHTML = `<li class="history-list-item italic">${labels.historyPlaceholder}</li>`;
            if (listSkippedCalls) listSkippedCalls.innerHTML = `<li class="history-list-item italic">${labels.skippedPlaceholder}</li>`;
            return;
        }

        if (queueState.current_call) {
            if (statusCurrentCallId) statusCurrentCallId.textContent = sanitizeText(queueState.current_call.id);
            if (statusCurrentCallLocation) statusCurrentCallLocation.textContent = sanitizeText(queueState.current_call.location);
        } else {
            if (statusCurrentCallId) statusCurrentCallId.textContent = '----';
            if (statusCurrentCallLocation) statusCurrentCallLocation.textContent = '----';
        }

        if (listHistoryCalls) {
            listHistoryCalls.innerHTML = '';
            if (queueState.completed_history && queueState.completed_history.length > 0) {
                queueState.completed_history.slice(0, MAX_LIST_ITEMS_OPERATOR).forEach(call => {
                    const li = document.createElement('li');
                    li.className = 'history-list-item flex justify-between items-center';
                    li.innerHTML = `<span><strong class="font-semibold">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold">${sanitizeText(call.location)}</strong></span>
                                    <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                    listHistoryCalls.insertBefore(li, listHistoryCalls.firstChild);
                });
            } else {
                listHistoryCalls.innerHTML = `<li class="history-list-item italic">${labels.historyPlaceholder}</li>`;
            }
        }

        if (listSkippedCalls) {
            listSkippedCalls.innerHTML = '';
            if (queueState.skipped_history && queueState.skipped_history.length > 0) {
                queueState.skipped_history.slice(0, MAX_LIST_ITEMS_OPERATOR).forEach(call => {
                    const li = document.createElement('li');
                    li.className = 'history-list-item flex justify-between items-center';
                    li.innerHTML = `<span><strong class="font-semibold text-yellow-400">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold text-yellow-400">${sanitizeText(call.location)}</strong></span>
                                    <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                    listSkippedCalls.insertBefore(li, listSkippedCalls.firstChild);
                });
            } else {
                listSkippedCalls.innerHTML = `<li class="history-list-item italic">${labels.skippedPlaceholder}</li>`;
            }
        }
    }

    function updateAnnouncementStatusDisplay(announcementStatus) {
        console.log("OperatorUI: updateAnnouncementStatusDisplay called with status:", announcementStatus);
        if (!announcementStatus) {
            console.warn("OperatorUI: announcementStatus is null or undefined in updateAnnouncementStatusDisplay.");
            if (statusAnnouncementSlot) statusAnnouncementSlot.textContent = 'N/A';
            if (statusAnnouncementCooldown) statusAnnouncementCooldown.textContent = 'Unknown';
            if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = '';
            if (btnNextAnnouncement) {
                btnNextAnnouncement.disabled = true;
                btnNextAnnouncement.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }

        if (statusAnnouncementSlot) statusAnnouncementSlot.textContent = announcementStatus.current_slot_id || 'N/A';

        if (cooldownIntervalId) {
            clearInterval(cooldownIntervalId);
            cooldownIntervalId = null;
        }

        if (announcementStatus.cooldown_active && announcementStatus.cooldown_remaining_seconds > 0) {
            if (statusAnnouncementCooldown) statusAnnouncementCooldown.textContent = 'On Cooldown';
            if (btnNextAnnouncement) {
                btnNextAnnouncement.disabled = true;
                btnNextAnnouncement.classList.add('opacity-50', 'cursor-not-allowed');
                btnNextAnnouncement.textContent = 'Trigger Next Announcement';
            }

            let remaining = announcementStatus.cooldown_remaining_seconds;
            if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = `(${remaining}s)`;

            cooldownIntervalId = setInterval(() => {
                remaining--;
                if (remaining > 0) {
                    if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = `(${remaining}s)`;
                } else {
                    clearInterval(cooldownIntervalId);
                    cooldownIntervalId = null;
                    if (statusAnnouncementCooldown) statusAnnouncementCooldown.textContent = 'Ready';
                    if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = '';
                    if (btnNextAnnouncement) {
                        btnNextAnnouncement.disabled = false;
                        btnNextAnnouncement.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                }
            }, 1000);
        } else {
            if (statusAnnouncementCooldown) statusAnnouncementCooldown.textContent = 'Ready';
            if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = '';
            if (btnNextAnnouncement) {
                btnNextAnnouncement.disabled = false;
                btnNextAnnouncement.classList.remove('opacity-50', 'cursor-not-allowed');
                btnNextAnnouncement.textContent = 'Trigger Next Announcement';
            }
        }
    }

    function updateSSEIndicator(statusData) {
        if (!sseStatusIndicator) return;
        console.log("OperatorUI: Updating SSE Indicator with data:", statusData);
        sseStatusIndicator.textContent = statusData.message || statusData.status;

        let bgColor = sseStatusIndicator.dataset.lastBgColor || 'bg-gray-700';
        switch (statusData.status) {
            case 'connecting': bgColor = 'bg-yellow-500'; break;
            case 'connected': bgColor = 'bg-green-500'; break;
            case 'disconnected': bgColor = 'bg-red-500'; break;
            default: bgColor = 'bg-gray-600';
        }
        sseStatusIndicator.className = `p-2 text-xs rounded-full text-white opacity-80 ${bgColor}`;
        sseStatusIndicator.dataset.lastBgColor = bgColor;
    }

    // --- Event Handlers ---
    async function handleCallFormSubmit(event) {
        event.preventDefault();
        clearFeedback();
        const originalId = originalIdInput.value.trim();
        const location = locationInput.value.trim();

        // Re-validate just in case buttons were manually enabled or script bypassed
        const idPattern = /^[A-Z]\d+$/;
        const locationPattern = /^\d+$/;

        if (!idPattern.test(originalId)) { showFeedback('Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).', 'error'); originalIdInput.focus(); return; }
        if (!locationPattern.test(location)) { showFeedback('Location must be digits only (e.g., 5, 10).', 'error'); locationInput.focus(); return; }


        btnCall.disabled = true;
        btnCall.textContent = 'Calling...';

        const callPayload = {
            original_id: originalId,
            location: location,
            id: originalId,
            timestamp: new Date().toISOString()
        };

        console.log("OperatorUI: Submitting call:", callPayload);
        const addCallResponse = await apiClient.addCall(callPayload);

        if (addCallResponse) {
            const message = (addCallResponse.message && typeof addCallResponse.message === 'string')
                ? addCallResponse.message
                : `Call request for ${sanitizeText(originalId)} processed.`;
            showFeedback(message, 'success');
            originalIdInput.value = '';
            // locationInput.value = ''; // Clear location input as well
            originalIdInput.focus();
        } else {
            if (!document.getElementById('feedback-area')?.textContent?.includes('Error:')) {
                showFeedback(`Failed to process call for ${sanitizeText(originalId)}.`, 'error');
            }
        }

        btnCall.disabled = false;
        btnCall.textContent = 'Call Number';
        validateInputs(); // Re-validate after submission to update button states
    }

    async function handleForceSkipCall(event) {
        event.preventDefault();
        clearFeedback();
        const originalId = originalIdInput.value.trim();
        const location = locationInput.value.trim();

        // Re-validate just in case buttons were manually enabled or script bypassed
        const idPattern = /^[A-Z]\d+$/;
        const locationPattern = /^\d+$/;

        if (!idPattern.test(originalId)) { showFeedback('Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).', 'error'); originalIdInput.focus(); return; }
        if (!locationPattern.test(location)) { showFeedback('Location must be digits only (e.g., 5, 10).', 'error'); locationInput.focus(); return; }

        btnSkip.disabled = true;
        btnSkip.textContent = 'Skipping...';

        const skipPayload = {
            original_id: originalId,
            location: location,
            id: originalId,
            timestamp: new Date().toISOString()
        };

        console.log("OperatorUI: Skipping queue:", skipPayload);
        const skipQueueResponse = await apiClient.forceSkipNewCall(skipPayload);

        if (skipQueueResponse) {
            const message = (skipQueueResponse.message && typeof skipQueueResponse.message === 'string')
                ? skipQueueResponse.message
                : `Call request for ${sanitizeText(originalId)} processed.`;
            showFeedback(message, 'success');
            originalIdInput.value = '';
            locationInput.value = ''; // Clear location input as well
            originalIdInput.focus();
        } else {
            if (!document.getElementById('feedback-area')?.textContent?.includes('Error:')) {
                showFeedback(`Failed to process skip queue for ${sanitizeText(originalId)}.`, 'error');
            }
        }

        btnSkip.disabled = false;
        btnSkip.textContent = 'Skip Queue';
        validateInputs(); // Re-validate after submission to update button states
    }

    async function handleNextAnnouncement() {
        clearFeedback();
        btnNextAnnouncement.disabled = true;
        btnNextAnnouncement.textContent = 'Triggering...';
        const response = await apiClient.nextAnnouncement();
        if (response) {
            showFeedback((response.message && typeof response.message === 'string') ? response.message : 'Next announcement triggered.', 'info');
        }
        setTimeout(() => {
            if (btnNextAnnouncement && btnNextAnnouncement.disabled &&
                !(statusAnnouncementCooldown && statusAnnouncementCooldown.textContent === 'On Cooldown')) {
                btnNextAnnouncement.disabled = false;
                btnNextAnnouncement.textContent = 'Trigger Next Announcement';
                console.warn("OperatorUI: Re-enabled 'Next Announcement' button via timeout; SSE might be delayed or an issue occurred.");
            } else if (btnNextAnnouncement && !btnNextAnnouncement.disabled) {
                btnNextAnnouncement.textContent = 'Trigger Next Announcement';
            }
        }, 7000);
    }

    if (originalIdInput) {
        originalIdInput.addEventListener('input', function (e) {
            const selectionStart = this.selectionStart;
            const selectionEnd = this.selectionEnd;
            let value = e.target.value;

            if (value.length > 0) {
                let cleanedValue = '';
                // First character must be a letter, auto-uppercase
                if (value.length > 0) {
                    let firstChar = value.charAt(0).toUpperCase();
                    if (/[A-Z]/.test(firstChar)) {
                        cleanedValue += firstChar;
                    }
                }
                // Subsequent characters must be digits
                if (value.length > 1) {
                    cleanedValue += value.substring(1).replace(/[^0-9]/g, '');
                }
                this.value = cleanedValue;
            } else {
                this.value = '';
            }
            this.setSelectionRange(selectionStart, selectionEnd);
            validateInputs(); // Validate on every input change
        });
    }

    if (locationInput) {
        locationInput.addEventListener('input', function (e) {
            const selectionStart = this.selectionStart;
            const selectionEnd = this.selectionEnd;
            this.value = e.target.value.replace(/[^0-9]/g, ''); // Allow only digits
            this.setSelectionRange(selectionStart, selectionEnd);
            validateInputs(); // Validate on every input change
        });
    }


    async function initOperatorPage() {
        console.log("OperatorUI: Initializing page...");
        if (typeof showFeedback === 'function') showFeedback(UI_TEXT.en.loading, 'info', 0);

        const [queueStateResult, announcementStatusResult] = await Promise.allSettled([
            apiClient.getQueueState(),
            apiClient.getAnnouncementStatus()
        ]);

        if (typeof clearFeedback === 'function') clearFeedback();

        if (queueStateResult.status === 'fulfilled' && queueStateResult.value) {
            console.log("OperatorUI: Initial Queue State Received:", queueStateResult.value);
            updateQueueStatusDisplay(queueStateResult.value);
        } else {
            if (typeof showFeedback === 'function') showFeedback('Failed to load initial queue state. Waiting for live updates.', 'warning', 5000);
            updateQueueStatusDisplay(null);
            console.error("OperatorUI: Initial queue state fetch failed:", queueStateResult.reason || "API error");
        }
        if (announcementStatusResult.status === 'fulfilled' && announcementStatusResult.value) {
            console.log("OperatorUI: Initial Announcement Status Received:", announcementStatusResult.value);
            updateAnnouncementStatusDisplay(announcementStatusResult.value);
        } else {
            if (typeof showFeedback === 'function') showFeedback('Failed to load initial announcement status. Waiting for live updates.', 'warning', 5000);
            updateAnnouncementStatusDisplay(null);
            console.error("OperatorUI: Initial announcement status fetch failed:", announcementStatusResult.reason || "API error");
        }

        if (callForm) callForm.addEventListener('submit', handleCallFormSubmit);
        if (btnSkip) btnSkip.addEventListener('click', handleForceSkipCall);
        if (btnNextAnnouncement) btnNextAnnouncement.addEventListener('click', handleNextAnnouncement);

        document.addEventListener('sse_queueupdate', (event) => {
            console.log("OperatorUI: Custom event 'sse_queueupdate' received", event.detail);
            updateQueueStatusDisplay(event.detail);
        });
        document.addEventListener('sse_announcementstatus', (event) => {
            console.log("OperatorUI: Custom event 'sse_announcementstatus' received", event.detail);
            updateAnnouncementStatusDisplay(event.detail);
        });
        document.addEventListener('sse_status', (event) => {
            console.log("OperatorUI: Custom event 'sse_status' received", event.detail);
            updateSSEIndicator(event.detail);
        });
        document.addEventListener('sse_ttscomplete', (event) => {
            console.log('OperatorUI: Notified of TTS Complete event (for logging only):', event.detail);
        });

        // Initial validation call to set button states on page load
        validateInputs();

        console.log("OperatorUI: Initialization complete. Event listeners attached.");
        if (originalIdInput) originalIdInput.focus();
    }

    initOperatorPage();
});