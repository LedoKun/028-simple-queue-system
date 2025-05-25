// public/js/operator_ui.js

/**
 * @file This script manages the interactive user interface for the operator's page
 * (`operator.html`). It handles form submissions, updates queue and announcement
 * status displays, and integrates with Server-Sent Events (SSE) for real-time
 * updates from the backend.
 * @author LedoKun <romamp100@gmail.com>
 * @version 1.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // Cache references to frequently accessed DOM elements for efficiency.
    const callForm = document.getElementById('call-form');
    const originalIdInput = document.getElementById('call-original-id');
    const locationInput = document.getElementById('call-location');
    const btnCall = document.getElementById('btn-call');
    const btnSkip = document.getElementById('btn-skip'); // This button is used for force_skip_new_call

    const statusCurrentCallId = document.getElementById('status-current-call-id');
    const statusCurrentCallLocation = document.getElementById('status-current-call-location');
    const listHistoryCalls = document.getElementById('list-history-calls');
    const listSkippedCalls = document.getElementById('list-skipped-calls');

    const statusAnnouncementSlot = document.getElementById('status-announcement-slot');
    const statusAnnouncementCooldown = document.getElementById('status-announcement-cooldown');
    const statusAnnouncementCooldownTimer = document.getElementById('status-announcement-cooldown-timer');
    const btnNextAnnouncement = document.getElementById('btn-next-announcement');

    const sseStatusIndicator = document.getElementById('sse-status-indicator');

    /**
     * @type {number|null} Stores the ID of the `setInterval` timer for the announcement cooldown countdown.
     * Used to clear the interval when the cooldown ends or status updates.
     */
    let cooldownIntervalId = null;

    /**
     * @constant {number} MAX_LIST_ITEMS_OPERATOR - Maximum number of history/skipped calls
     * to display in the operator's UI lists to prevent clutter.
     */
    const MAX_LIST_ITEMS_OPERATOR = 7;

    // --- Critical Dependency Check ---
    // Ensure that 'common.js' and 'api_client.js' (and their provided utilities)
    // have been loaded before this script. If not, the UI cannot function correctly.
    if (typeof apiClient === 'undefined' || typeof showFeedback === 'undefined' || typeof UI_TEXT === 'undefined' || typeof sanitizeText === 'undefined' || typeof formatDisplayTime === 'undefined') {
        console.error("OperatorUI: CRITICAL - 'common.js' or 'api_client.js' might not be loaded correctly or before 'operator_ui.js'. Some essential utilities are missing.");
        alert("Operator UI cannot initialize fully. Please check the browser console for errors related to 'common.js' or 'api_client.js' loading.");
        // Disable interactive elements to prevent errors if dependencies are missing.
        if (btnCall) btnCall.disabled = true;
        if (btnSkip) btnSkip.disabled = true;
        if (btnNextAnnouncement) btnNextAnnouncement.disabled = true;
        return; // Stop further initialization if critical dependencies are missing.
    }

    // Set the global UI language for feedback messages (defined in common.js).
    // This can be made dynamic if multiple languages are supported in the operator UI.
    window.currentGlobalLanguage = 'en';

    // --- Input Validation ---
    /**
     * Validates the input fields for call ID and location.
     * Enables or disables the 'Call Number' and 'Skip Queue' buttons based on validation status.
     * Identifier format: Starts with one uppercase letter, followed by one or more digits (e.g., A1, Z99).
     * Location format: One or more digits (e.g., 5, 10).
     */
    function validateInputs() {
        const originalId = originalIdInput.value.trim();
        const location = locationInput.value.trim();

        const idPattern = /^[A-Z]\d+$/; // Regex for Identifier validation.
        const locationPattern = /^\d+$/; // Regex for Location validation.

        const isIdValid = idPattern.test(originalId);
        const isLocationValid = locationPattern.test(location);

        // Buttons are enabled only if both ID and Location are valid.
        if (btnCall) btnCall.disabled = !(isIdValid && isLocationValid);
        if (btnSkip) btnSkip.disabled = !(isIdValid && isLocationValid);
    }

    // --- UI Update Functions ---

    /**
     * Updates the display of the current call, completed history, and skipped history
     * based on the provided `queueState` data.
     *
     * @param {object|null} queueState - The current queue state object from the backend,
     * or `null` if the state cannot be loaded.
     * @param {object} queueState.current_call - The currently active call.
     * @param {Array<object>} queueState.completed_history - An array of completed call objects.
     * @param {Array<object>} queueState.skipped_history - An array of skipped call objects.
     */
    function updateQueueStatusDisplay(queueState) {
        console.log("OperatorUI: 'updateQueueStatusDisplay' called with state:", queueState);
        const labels = UI_TEXT.en; // Use English labels for display placeholders.

        // Handle cases where queueState is null or undefined (e.g., initial fetch failed).
        if (!queueState) {
            console.warn("OperatorUI: 'queueState' is null or undefined in 'updateQueueStatusDisplay'. Displaying placeholders.");
            // Set placeholders for current call.
            if (statusCurrentCallId) statusCurrentCallId.textContent = '----';
            if (statusCurrentCallLocation) statusCurrentCallLocation.textContent = '----';
            // Set placeholders for history lists.
            if (listHistoryCalls) listHistoryCalls.innerHTML = `<li class="history-list-item italic">${labels.historyPlaceholder}</li>`;
            if (listSkippedCalls) listSkippedCalls.innerHTML = `<li class="history-list-item italic">${labels.skippedPlaceholder}</li>`;
            return;
        }

        // Update current call display.
        if (queueState.current_call) {
            if (statusCurrentCallId) statusCurrentCallId.textContent = sanitizeText(queueState.current_call.id);
            if (statusCurrentCallLocation) statusCurrentCallLocation.textContent = sanitizeText(queueState.current_call.location);
        } else {
            // No current call, display default.
            if (statusCurrentCallId) statusCurrentCallId.textContent = '----';
            if (statusCurrentCallLocation) statusCurrentCallLocation.textContent = '----';
        }

        // Update completed call history list.
        if (listHistoryCalls) {
            listHistoryCalls.innerHTML = ''; // Clear previous list items.
            if (queueState.completed_history && queueState.completed_history.length > 0) {
                // Slice to display only the maximum allowed items (most recent first).
                queueState.completed_history.slice(0, MAX_LIST_ITEMS_OPERATOR).forEach(call => {
                    const li = document.createElement('li');
                    li.className = 'history-list-item flex justify-between items-center';
                    li.innerHTML = `<span><strong class="font-semibold">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold">${sanitizeText(call.location)}</strong></span>
                                    <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                    // Insert at the beginning to show newest entries first.
                    listHistoryCalls.insertBefore(li, listHistoryCalls.firstChild);
                });
            } else {
                // Display placeholder if history is empty.
                listHistoryCalls.innerHTML = `<li class="history-list-item italic">${labels.historyPlaceholder}</li>`;
            }
        }

        // Update skipped call history list.
        if (listSkippedCalls) {
            listSkippedCalls.innerHTML = ''; // Clear previous list items.
            if (queueState.skipped_history && queueState.skipped_history.length > 0) {
                // Slice to display only the maximum allowed items (most recent first).
                queueState.skipped_history.slice(0, MAX_LIST_ITEMS_OPERATOR).forEach(call => {
                    const li = document.createElement('li');
                    li.className = 'history-list-item flex justify-between items-center';
                    // Use a different color for skipped calls for visual distinction.
                    li.innerHTML = `<span><strong class="font-semibold text-yellow-400">${sanitizeText(call.id)}</strong> &rarr; <strong class="font-semibold text-yellow-400">${sanitizeText(call.location)}</strong></span>
                                    <span class="text-xs text-gray-400">${formatDisplayTime(call.timestamp)}</span>`;
                    // Insert at the beginning to show newest entries first.
                    listSkippedCalls.insertBefore(li, listSkippedCalls.firstChild);
                });
            } else {
                // Display placeholder if skipped history is empty.
                listSkippedCalls.innerHTML = `<li class="history-list-item italic">${labels.skippedPlaceholder}</li>`;
            }
        }
    }

    /**
     * Updates the display of the current announcement slot and its cooldown status.
     * Manages a countdown timer for the manual trigger cooldown.
     *
     * @param {object|null} announcementStatus - The current announcement status object from the backend,
     * or `null` if the status cannot be loaded.
     * @param {string} announcementStatus.current_slot_id - The ID of the current announcement slot.
     * @param {boolean} announcementStatus.cooldown_active - True if manual trigger is on cooldown.
     * @param {number} announcementStatus.cooldown_remaining_seconds - Seconds remaining on cooldown.
     * @param {number} announcementStatus.cooldown_seconds - Total configured cooldown duration.
     */
    function updateAnnouncementStatusDisplay(announcementStatus) {
        console.log("OperatorUI: 'updateAnnouncementStatusDisplay' called with status:", announcementStatus);

        // Handle cases where announcementStatus is null or undefined.
        if (!announcementStatus) {
            console.warn("OperatorUI: 'announcementStatus' is null or undefined in 'updateAnnouncementStatusDisplay'. Displaying placeholders.");
            if (statusAnnouncementSlot) statusAnnouncementSlot.textContent = 'N/A';
            if (statusAnnouncementCooldown) statusAnnouncementCooldown.textContent = 'Unknown';
            if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = '';
            // Disable the 'Next Announcement' button if status is unknown.
            if (btnNextAnnouncement) {
                btnNextAnnouncement.disabled = true;
                btnNextAnnouncement.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }

        // Update current announcement slot ID display.
        if (statusAnnouncementSlot) statusAnnouncementSlot.textContent = announcementStatus.current_slot_id || 'N/A';

        // Clear any existing cooldown interval to prevent multiple timers running.
        if (cooldownIntervalId) {
            clearInterval(cooldownIntervalId);
            cooldownIntervalId = null;
        }

        // Manage cooldown display and button state.
        if (announcementStatus.cooldown_active && announcementStatus.cooldown_remaining_seconds > 0) {
            // Display "On Cooldown" and disable button.
            if (statusAnnouncementCooldown) statusAnnouncementCooldown.textContent = 'On Cooldown';
            if (btnNextAnnouncement) {
                btnNextAnnouncement.disabled = true;
                btnNextAnnouncement.classList.add('opacity-50', 'cursor-not-allowed');
                btnNextAnnouncement.textContent = 'Trigger Next Announcement'; // Reset text if it was 'Triggering...'
            }

            let remaining = announcementStatus.cooldown_remaining_seconds;
            if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = `(${remaining}s)`;

            // Start a new countdown interval.
            cooldownIntervalId = setInterval(() => {
                remaining--;
                if (remaining > 0) {
                    // Update timer display.
                    if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = `(${remaining}s)`;
                } else {
                    // Cooldown finished: clear interval, update status, and re-enable button.
                    clearInterval(cooldownIntervalId);
                    cooldownIntervalId = null;
                    if (statusAnnouncementCooldown) statusAnnouncementCooldown.textContent = 'Ready';
                    if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = '';
                    if (btnNextAnnouncement) {
                        btnNextAnnouncement.disabled = false;
                        btnNextAnnouncement.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                }
            }, 1000); // Update every second.
        } else {
            // Cooldown is not active or has expired.
            if (statusAnnouncementCooldown) statusAnnouncementCooldown.textContent = 'Ready';
            if (statusAnnouncementCooldownTimer) statusAnnouncementCooldownTimer.textContent = '';
            // Ensure button is enabled and styled correctly.
            if (btnNextAnnouncement) {
                btnNextAnnouncement.disabled = false;
                btnNextAnnouncement.classList.remove('opacity-50', 'cursor-not-allowed');
                btnNextAnnouncement.textContent = 'Trigger Next Announcement';
            }
        }
    }

    /**
     * Updates the Server-Sent Events (SSE) connection status indicator.
     *
     * @param {object} statusData - The SSE status data received from `sse_handler.js`.
     * @param {string} statusData.status - The connection status (e.g., 'connecting', 'connected', 'disconnected').
     * @param {string} statusData.message - A human-readable message for the status.
     */
    function updateSSEIndicator(statusData) {
        if (!sseStatusIndicator) return; // Exit if indicator element not found.
        console.log("OperatorUI: Updating SSE Indicator with data:", statusData);

        // Set text content for the indicator.
        sseStatusIndicator.textContent = statusData.message || statusData.status;

        // Determine background color based on status for visual feedback.
        let bgColor = sseStatusIndicator.dataset.lastBgColor || 'bg-gray-700'; // Default gray.
        switch (statusData.status) {
            case 'connecting': bgColor = 'bg-yellow-500'; break;
            case 'connected': bgColor = 'bg-green-500'; break;
            case 'disconnected': bgColor = 'bg-red-500'; break;
            default: bgColor = 'bg-gray-600'; // Fallback for unknown status.
        }
        // Apply new classes and store the last background color.
        sseStatusIndicator.className = `p-2 text-xs rounded-full text-white opacity-80 ${bgColor}`;
        sseStatusIndicator.dataset.lastBgColor = bgColor;
    }

    // --- Event Handlers ---

    /**
     * Handles the submission of the call form (for 'Call Number' action).
     * Validates inputs, makes an API call to add/update the call,
     * and provides user feedback.
     *
     * @async
     * @param {Event} event - The form submission event.
     */
    async function handleCallFormSubmit(event) {
        event.preventDefault(); // Prevent default form submission to handle via Fetch API.
        clearFeedback(); // Clear any previous feedback messages.

        const originalId = originalIdInput.value.trim();
        const location = locationInput.value.trim();

        // Re-validate inputs before API call, as button states might have been
        // manipulated or bypass (e.g., if JS disabled then re-enabled).
        const idPattern = /^[A-Z]\d+$/;
        const locationPattern = /^\d+$/;

        if (!idPattern.test(originalId)) {
            showFeedback('Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).', 'error');
            originalIdInput.focus(); // Focus on the problematic input.
            return;
        }
        if (!locationPattern.test(location)) {
            showFeedback('Location must be digits only (e.g., 5, 10).', 'error');
            locationInput.focus(); // Focus on the problematic input.
            return;
        }

        // Disable the button and change its text to indicate processing.
        if (btnCall) {
            btnCall.disabled = true;
            btnCall.textContent = 'Calling...';
        }

        // Prepare the payload for the API request.
        const callPayload = {
            original_id: originalId,
            location: location,
            // id and timestamp are technically not needed by the backend `add_call` route
            // as it generates its own canonical ID and timestamp, but included here for consistency.
            id: originalId,
            timestamp: new Date().toISOString()
        };

        console.log("OperatorUI: Submitting call:", callPayload);
        // Make the API call using the apiClient.
        const addCallResponse = await apiClient.addCall(callPayload);

        // Handle API response.
        if (addCallResponse) {
            // Use the message from the API response if available, otherwise a generic one.
            const message = (addCallResponse.message && typeof addCallResponse.message === 'string')
                ? addCallResponse.message
                : `Call request for ${sanitizeText(originalId)} processed.`;
            showFeedback(message, 'success');
            originalIdInput.value = ''; // Clear the ID input after successful submission.
            // locationInput.value = ''; // Uncomment to clear location input as well if desired.
            originalIdInput.focus(); // Set focus back to the ID input for next entry.
        } else {
            // If API call failed and no feedback was shown by apiClient itself.
            if (!document.getElementById('feedback-area')?.textContent?.includes('Error:')) {
                showFeedback(`Failed to process call for ${sanitizeText(originalId)}. Please check the console.`, 'error');
            }
        }

        // Re-enable the button and reset its text.
        if (btnCall) {
            btnCall.disabled = false;
            btnCall.textContent = 'Call Number';
        }
        validateInputs(); // Re-validate to update button states after submission (e.g., if inputs cleared).
    }

    /**
     * Handles the click event for the 'Skip Queue' button.
     * This triggers a force-skip action via the API, adding the specified call
     * directly to the skipped history.
     *
     * @async
     * @param {Event} event - The click event.
     */
    async function handleForceSkipCall(event) {
        event.preventDefault(); // Prevent default button action.
        clearFeedback(); // Clear any previous feedback.

        const originalId = originalIdInput.value.trim();
        const location = locationInput.value.trim();

        // Re-validate inputs.
        const idPattern = /^[A-Z]\d+$/;
        const locationPattern = /^\d+$/;

        if (!idPattern.test(originalId)) {
            showFeedback('Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).', 'error');
            originalIdInput.focus();
            return;
        }
        if (!locationPattern.test(location)) {
            showFeedback('Location must be digits only (e.g., 5, 10).', 'error');
            locationInput.focus();
            return;
        }

        // Disable button and update text to indicate processing.
        if (btnSkip) {
            btnSkip.disabled = true;
            btnSkip.textContent = 'Skipping...';
        }

        // Prepare payload for the force skip API call.
        const skipPayload = {
            original_id: originalId,
            location: location,
            // id and timestamp are not strictly needed by the backend force_skip route,
            // as it generates its own canonical ID and timestamp based on formatted_id.
            id: originalId,
            timestamp: new Date().toISOString()
        };

        console.log("OperatorUI: Submitting force skip for:", skipPayload);
        // Make the API call.
        const skipQueueResponse = await apiClient.forceSkipNewCall(skipPayload);

        // Handle API response.
        if (skipQueueResponse) {
            const message = (skipQueueResponse.message && typeof skipQueueResponse.message === 'string')
                ? skipQueueResponse.message
                : `Force skip request for ${sanitizeText(originalId)} processed.`;
            showFeedback(message, 'success');
            originalIdInput.value = ''; // Clear inputs after successful skip.
            // locationInput.value = '';
            originalIdInput.focus();
        } else {
            // If API call failed and apiClient didn't show specific error feedback.
            if (!document.getElementById('feedback-area')?.textContent?.includes('Error:')) {
                showFeedback(`Failed to process skip queue for ${sanitizeText(originalId)}. Please check the console.`, 'error');
            }
        }

        // Re-enable button and reset text.
        if (btnSkip) {
            btnSkip.disabled = false;
            btnSkip.textContent = 'Skip Queue';
        }
        validateInputs(); // Re-validate to update button states.
    }

    /**
     * Handles the click event for the 'Trigger Next Announcement' button.
     * Initiates a manual announcement advancement via the API.
     *
     * @async
     */
    async function handleNextAnnouncement() {
        clearFeedback(); // Clear feedback before new action.
        // Disable button and update text.
        if (btnNextAnnouncement) {
            btnNextAnnouncement.disabled = true;
            btnNextAnnouncement.textContent = 'Triggering...';
        }

        // Make API call to advance announcement.
        const response = await apiClient.nextAnnouncement();

        // Provide feedback based on API response.
        if (response) {
            showFeedback((response.message && typeof response.message === 'string') ? response.message : 'Next announcement triggered.', 'info');
        }

        // Set a timeout to re-enable the button if SSE update is delayed or doesn't arrive.
        // This acts as a safeguard to prevent the button from staying disabled indefinitely.
        setTimeout(() => {
            // Only re-enable if button is still disabled AND it's not due to active cooldown.
            if (btnNextAnnouncement && btnNextAnnouncement.disabled &&
                !(statusAnnouncementCooldown && statusAnnouncementCooldown.textContent === 'On Cooldown')) {
                btnNextAnnouncement.disabled = false;
                btnNextAnnouncement.textContent = 'Trigger Next Announcement';
                console.warn("OperatorUI: Re-enabled 'Next Announcement' button via timeout; SSE update might be delayed or an issue occurred preventing status update.");
            } else if (btnNextAnnouncement && !btnNextAnnouncement.disabled) {
                // If it was already re-enabled (e.g., by SSE update), just ensure text is correct.
                btnNextAnnouncement.textContent = 'Trigger Next Announcement';
            }
        }, 7000); // Re-enable after 7 seconds if no status update.
    }

    // --- Input Specific Event Listeners ---

    // Event listener for the 'originalIdInput' field to format and validate input in real-time.
    if (originalIdInput) {
        originalIdInput.addEventListener('input', function (e) {
            const selectionStart = this.selectionStart; // Store cursor position.
            const selectionEnd = this.selectionEnd;

            let value = e.target.value;
            let cleanedValue = '';

            if (value.length > 0) {
                // The first character should be a letter and automatically uppercase it.
                let firstChar = value.charAt(0).toUpperCase();
                if (/[A-Z]/.test(firstChar)) {
                    cleanedValue += firstChar;
                }
                // Subsequent characters should be digits only. Remove any non-digit characters.
                if (value.length > 1) {
                    cleanedValue += value.substring(1).replace(/[^0-9]/g, '');
                }
            }
            this.value = cleanedValue; // Update the input field with the cleaned value.
            // Restore cursor position.
            this.setSelectionRange(selectionStart, selectionEnd);
            validateInputs(); // Re-validate buttons after every input change.
        });
    }

    // Event listener for the 'locationInput' field to allow only digits.
    if (locationInput) {
        locationInput.addEventListener('input', function (e) {
            const selectionStart = this.selectionStart; // Store cursor position.
            const selectionEnd = this.selectionEnd;
            // Allow only digits. Remove any non-digit characters.
            this.value = e.target.value.replace(/[^0-9]/g, '');
            // Restore cursor position.
            this.setSelectionRange(selectionStart, selectionEnd);
            validateInputs(); // Re-validate buttons after every input change.
        });
    }

    // --- Page Initialization ---

    /**
     * Initializes the operator page by fetching initial queue and announcement states,
     * setting up event listeners for UI interactions and custom SSE events.
     * @async
     */
    async function initOperatorPage() {
        console.log("OperatorUI: Initializing page...");
        // Show a loading message while initial data is fetched.
        if (typeof showFeedback === 'function') showFeedback(UI_TEXT.en.loading, 'info', 0);

        // Fetch initial queue state and announcement status concurrently using Promise.allSettled.
        // `allSettled` is used so that if one fails, the other can still complete.
        const [queueStateResult, announcementStatusResult] = await Promise.allSettled([
            apiClient.getQueueState(),
            apiClient.getAnnouncementStatus()
        ]);

        // Clear the loading message after initial fetches.
        if (typeof clearFeedback === 'function') clearFeedback();

        // Process initial queue state.
        if (queueStateResult.status === 'fulfilled' && queueStateResult.value) {
            console.log("OperatorUI: Initial Queue State Received:", queueStateResult.value);
            updateQueueStatusDisplay(queueStateResult.value);
        } else {
            // Display warning if initial queue state fetch failed.
            if (typeof showFeedback === 'function') showFeedback('Failed to load initial queue state. Waiting for live updates.', 'warning', 5000);
            updateQueueStatusDisplay(null); // Pass null to reset UI to placeholders.
            console.error("OperatorUI: Initial queue state fetch failed:", queueStateResult.reason || "API error occurred.");
        }

        // Process initial announcement status.
        if (announcementStatusResult.status === 'fulfilled' && announcementStatusResult.value) {
            console.log("OperatorUI: Initial Announcement Status Received:", announcementStatusResult.value);
            updateAnnouncementStatusDisplay(announcementStatusResult.value);
        } else {
            // Display warning if initial announcement status fetch failed.
            if (typeof showFeedback === 'function') showFeedback('Failed to load initial announcement status. Waiting for live updates.', 'warning', 5000);
            updateAnnouncementStatusDisplay(null); // Pass null to reset UI to placeholders.
            console.error("OperatorUI: Initial announcement status fetch failed:", announcementStatusResult.reason || "API error occurred.");
        }

        // Attach event listeners for user interactions.
        if (callForm) callForm.addEventListener('submit', handleCallFormSubmit);
        if (btnSkip) btnSkip.addEventListener('click', handleForceSkipCall);
        if (btnNextAnnouncement) btnNextAnnouncement.addEventListener('click', handleNextAnnouncement);

        // Attach custom event listeners for SSE updates (dispatched by sse_handler.js).
        document.addEventListener('sse_queueupdate', (event) => {
            console.log("OperatorUI: Custom event 'sse_queueupdate' received. Updating queue display.", event.detail);
            updateQueueStatusDisplay(event.detail);
        });
        document.addEventListener('sse_announcementstatus', (event) => {
            console.log("OperatorUI: Custom event 'sse_announcementstatus' received. Updating announcement display.", event.detail);
            updateAnnouncementStatusDisplay(event.detail);
        });
        document.addEventListener('sse_status', (event) => {
            console.log("OperatorUI: Custom event 'sse_status' received. Updating SSE indicator.", event.detail);
            updateSSEIndicator(event.detail);
        });
        document.addEventListener('sse_ttscomplete', (event) => {
            // This event is primarily for backend debugging/logging, not direct UI update on operator page.
            console.log('OperatorUI: Notified of TTS Complete event (for backend logging/diagnostic purposes):', event.detail);
        });

        // Perform an initial validation call to set button states on page load.
        validateInputs();

        console.log("OperatorUI: Initialization complete. Event listeners attached. UI is ready.");
        // Set focus to the first input field for immediate user interaction.
        if (originalIdInput) originalIdInput.focus();
    }

    // Execute the initialization function once the DOM is fully loaded.
    initOperatorPage();
});