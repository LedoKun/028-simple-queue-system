// public/js/operator_ui.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const callForm = document.getElementById('call-form');
    const originalIdInput = document.getElementById('call-original-id');
    const locationInput = document.getElementById('call-location');
    // TTS Language Select related elements are removed from HTML and JS
    const btnCall = document.getElementById('btn-call');
    const btnSkip = document.getElementById('btn-skip');
    // const btnSkipCurrent = document.getElementById('btn-skip-current');

    const statusCurrentCallId = document.getElementById('status-current-call-id');
    const statusCurrentCallLocation = document.getElementById('status-current-call-location');
    const listHistoryCalls = document.getElementById('list-history-calls');
    const listSkippedCalls = document.getElementById('list-skipped-calls');

    const statusAnnouncementSlot = document.getElementById('status-announcement-slot');
    const statusAnnouncementCooldown = document.getElementById('status-announcement-cooldown');
    const statusAnnouncementCooldownTimer = document.getElementById('status-announcement-cooldown-timer');
    const btnNextAnnouncement = document.getElementById('btn-next-announcement');

    const sseStatusIndicator = document.getElementById('sse-status-indicator');
    // feedbackArea is used by showFeedback/clearFeedback from common.js

    let cooldownIntervalId = null;
    const MAX_LIST_ITEMS_OPERATOR = 7; // Max items for history/skipped lists in operator UI

    // --- Ensure common.js and api_client.js are loaded ---
    if (typeof apiClient === 'undefined' || typeof showFeedback === 'undefined' || typeof UI_TEXT === 'undefined' || typeof sanitizeText === 'undefined' || typeof formatDisplayTime === 'undefined') {
        console.error("OperatorUI: CRITICAL - common.js or api_client.js might not be loaded correctly or before operator_ui.js. Some utilities are missing.");
        alert("Operator UI cannot initialize fully. Please check browser console for errors related to common.js or api_client.js loading.");
        // Gracefully degrade or stop further execution if critical parts are missing
        if (btnCall) btnCall.disabled = true;
        if (btnSkip) btnSkipCurrent.disabled = true;
        // if (btnSkipCurrent) btnSkipCurrent.disabled = true;
        if (btnNextAnnouncement) btnNextAnnouncement.disabled = true;
        return; // Stop initialization if common utilities are missing
    }

    // Operator UI is English, set global hint for sse_handler status messages.
    window.currentGlobalLanguage = 'en';


    // --- Update UI Functions ---
    function updateQueueStatusDisplay(queueState) {
        console.log("OperatorUI: updateQueueStatusDisplay called with state:", queueState);
        const labels = UI_TEXT.en; // Operator UI is English

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
                btnNextAnnouncement.textContent = 'Trigger Next Announcement'; // Reset text
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
        console.log("OperatorUI: Updating SSE Indicator with data:", statusData); // O6 DEBUG
        sseStatusIndicator.textContent = statusData.message || statusData.status;

        let bgColor = sseStatusIndicator.dataset.lastBgColor || 'bg-gray-700'; // Use a slightly different default from gray-500 for visibility
        switch (statusData.status) {
            case 'connecting': bgColor = 'bg-yellow-500'; break;
            case 'connected': bgColor = 'bg-green-500'; break;
            case 'disconnected': bgColor = 'bg-red-500'; break;
            default: bgColor = 'bg-gray-600'; // Fallback for unknown status
        }
        sseStatusIndicator.className = `p-2 text-xs rounded-full text-white opacity-80 ${bgColor}`; // Increased opacity
        sseStatusIndicator.dataset.lastBgColor = bgColor;
    }

    // --- Event Handlers ---
    async function handleCallFormSubmit(event) {
        event.preventDefault();
        clearFeedback();
        const originalId = originalIdInput.value;
        const location = locationInput.value.trim();

        if (!originalId) { showFeedback('Identifier cannot be empty.', 'error'); originalIdInput.focus(); return; }
        if (!/^[A-Z][A-Z0-9]*$/.test(originalId)) { showFeedback('Identifier must start with a letter (auto-uppercased), followed by letters or numbers.', 'error'); originalIdInput.focus(); return; }
        if (!location) { showFeedback('Location cannot be empty.', 'error'); locationInput.focus(); return; }
        if (!/^\d+$/.test(location)) { showFeedback('Location must be a number.', 'error'); locationInput.focus(); return; }

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
            originalIdInput.focus();
        } else {
            // Feedback for error is usually handled by apiClient's showFeedback call
            // If it returns null and didn't show feedback, add a generic one.
            if (!document.getElementById('feedback-area')?.textContent?.includes('Error:')) {
                showFeedback(`Failed to process call for ${sanitizeText(originalId)}.`, 'error');
            }
        }

        btnCall.disabled = false;
        btnCall.textContent = 'Call Number';
    }

    async function handleForceSkipCall(event) {
        event.preventDefault();
        clearFeedback();
        const originalId = originalIdInput.value;
        const location = locationInput.value.trim();

        if (!originalId) { showFeedback('Identifier cannot be empty.', 'error'); originalIdInput.focus(); return; }
        if (!/^[A-Z][A-Z0-9]*$/.test(originalId)) { showFeedback('Identifier must start with a letter (auto-uppercased), followed by letters or numbers.', 'error'); originalIdInput.focus(); return; }
        if (!location) { showFeedback('Location cannot be empty.', 'error'); locationInput.focus(); return; }
        if (!/^\d+$/.test(location)) { showFeedback('Location must be a number.', 'error'); locationInput.focus(); return; }

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
            originalIdInput.focus();
        } else {
            // Feedback for error is usually handled by apiClient's showFeedback call
            // If it returns null and didn't show feedback, add a generic one.
            if (!document.getElementById('feedback-area')?.textContent?.includes('Error:')) {
                showFeedback(`Failed to process skip queue for ${sanitizeText(originalId)}.`, 'error');
            }
        }

        btnSkip.disabled = false;
        btnSkip.textContent = 'Skip Queue';
    }

    // async function handleSkipCall() {
    //     clearFeedback();
    //     btnSkipCurrent.disabled = true;
    //     btnSkipCurrent.textContent = 'Skipping...';
    //     const response = await apiClient.skipCall();
    //     if (response) {
    //         showFeedback((response.message && typeof response.message === 'string') ? response.message : 'Skip request processed.', 'info');
    //     }
    //     btnSkipCurrent.disabled = false;
    //     btnSkipCurrent.textContent = 'Skip Current Call';
    // }

    async function handleNextAnnouncement() {
        clearFeedback();
        btnNextAnnouncement.disabled = true;
        btnNextAnnouncement.textContent = 'Triggering...';
        const response = await apiClient.nextAnnouncement();
        if (response) {
            showFeedback((response.message && typeof response.message === 'string') ? response.message : 'Next announcement triggered.', 'info');
        }
        // Do not re-enable button here manually if it's not an error case.
        // updateAnnouncementStatusDisplay driven by SSE should handle re-enabling after cooldown.
        // Add a timeout only as a fallback for truly stuck state (e.g., if SSE somehow misses update).
        setTimeout(() => {
            if (btnNextAnnouncement && btnNextAnnouncement.disabled &&
                !(statusAnnouncementCooldown && statusAnnouncementCooldown.textContent === 'On Cooldown')) {
                // Only re-enable if it seems it *should* be enabled and isn't
                // This is a safety net, ideally SSE handles this.
                btnNextAnnouncement.disabled = false;
                btnNextAnnouncement.textContent = 'Trigger Next Announcement';
                console.warn("OperatorUI: Re-enabled 'Next Announcement' button via timeout; SSE might be delayed or an issue occurred.");
            } else if (btnNextAnnouncement && !btnNextAnnouncement.disabled) {
                btnNextAnnouncement.textContent = 'Trigger Next Announcement'; // Ensure text reset
            }
        }, 7000);
    }

    if (originalIdInput) {
        originalIdInput.addEventListener('input', function (e) {
            const selectionStart = this.selectionStart;
            const selectionEnd = this.selectionEnd;
            let value = e.target.value;
            if (value.length > 0) {
                // Auto-uppercase and allow only letters (first char) and alphanumeric (subsequent chars)
                let firstChar = value.charAt(0).toUpperCase();
                if (!/^[A-Z]$/.test(firstChar)) { // Ensure first char is a letter
                    firstChar = ''; // Or some other handling if first char is not a letter
                }
                let restChars = '';
                if (value.length > 1) {
                    restChars = value.substring(1).toUpperCase().replace(/[^A-Z0-9]/g, '');
                }
                this.value = firstChar + restChars;
            } else {
                this.value = '';
            }
            this.setSelectionRange(selectionStart, selectionEnd);
        });
    }

    async function initOperatorPage() {
        console.log("OperatorUI: Initializing page...");
        if (typeof showFeedback === 'function') showFeedback(UI_TEXT.en.loading, 'info', 0);

        // O1: TTS Language Select related fetching is removed.

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
        // if (btnSkipCurrent) btnSkipCurrent.addEventListener('click', handleSkipCall);
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

        console.log("OperatorUI: Initialization complete. Event listeners attached.");
        if (originalIdInput) originalIdInput.focus();
    }

    initOperatorPage();
});