// src/queue/manager.rs

//! Manages the state and operations of the call queue for the Queue Calling System.
//!
//! This module defines the `QueueManager` struct, which is responsible for:
//! - Storing the currently active call.
//! - Maintaining histories of completed and skipped calls, with configurable maximum sizes.
//! - Adding new calls to the queue, handling existing calls (recalling/updating).
//! - Moving calls between the current slot, completed history, and skipped history.
//! - Formatting call identifiers consistently.

use super::QueueState;
use crate::Call;
use chrono::{DateTime, Utc};
use std::collections::VecDeque;
use std::time::SystemTime;
use tracing::{debug, info, trace, warn}; // Import tracing macros

/// `QueueManager` is responsible for managing the state of calls in the queue.
///
/// It maintains:
/// - `current_call`: The call currently being processed or announced.
/// - `completed_history`: A deque of calls that have been marked as completed.
/// - `skipped_history`: A deque of calls that have been explicitly skipped.
///
/// Both histories are bounded by `max_history_size` and `max_skipped_history_size`
/// respectively, ensuring memory usage is controlled.
#[derive(Debug)]
pub struct QueueManager {
    /// The call that is currently active or being processed. `None` if no call is active.
    current_call: Option<Call>,
    /// A double-ended queue storing calls that have been completed.
    /// New completed calls are pushed to the back, and oldest are popped from the front.
    completed_history: VecDeque<Call>,
    /// A double-ended queue storing calls that have been explicitly skipped.
    /// New skipped calls are pushed to the back, and oldest are popped from the front.
    skipped_history: VecDeque<Call>,
    /// The maximum number of calls to retain in the `completed_history`.
    max_history_size: usize,
    /// The maximum number of calls to retain in the `skipped_history`.
    max_skipped_history_size: usize,
}

impl QueueManager {
    /// Creates a new `QueueManager` instance.
    ///
    /// Initializes an empty current call slot and empty histories with specified capacities.
    ///
    /// # Arguments
    /// - `max_history_size`: The maximum number of calls to keep in the completed history.
    /// - `max_skipped_history_size`: The maximum number of calls to keep in the skipped history.
    ///
    /// # Returns
    /// A new `QueueManager` instance.
    pub fn new(max_history_size: usize, max_skipped_history_size: usize) -> Self {
        info!(
            "Initializing QueueManager with max_history_size={} and max_skipped_history_size={}",
            max_history_size, max_skipped_history_size
        );
        QueueManager {
            current_call: None,
            // Pre-allocate capacity to reduce reallocations.
            completed_history: VecDeque::with_capacity(max_history_size),
            skipped_history: VecDeque::with_capacity(max_skipped_history_size),
            max_history_size,
            max_skipped_history_size,
        }
    }

    /// Formats a raw call identifier string into a standardized format.
    ///
    /// This function assumes the `original_id` starts with a letter followed by digits.
    /// It converts the first character to uppercase and pads single-digit numbers
    /// with a leading zero (e.g., "A1" becomes "A01", "B10" remains "B10").
    ///
    /// # Arguments
    /// - `original_id`: The raw call identifier string (e.g., "a1", "B10").
    ///
    /// # Returns
    /// A `String` representing the formatted identifier. Returns an empty string
    /// if `original_id` is empty.
    fn format_identifier(original_id: &str) -> String {
        debug!(
            "QueueManager::format_identifier: Formatting '{}'",
            original_id
        );
        if original_id.is_empty() {
            trace!("QueueManager::format_identifier: Input is empty, returning empty string.");
            return String::new();
        }

        let mut chars = original_id.chars();
        // Assuming the first character is always a letter due to external validation.
        let first_char = chars
            .next()
            .expect("Original ID should not be empty at this point after check")
            .to_ascii_uppercase();
        // The rest of the string is assumed to be the digit part.
        let digit_part_str: String = chars.collect();

        // This logic remains to pad single-digit numbers if necessary (e.g., A1 -> A01).
        if digit_part_str.len() == 1 {
            match digit_part_str.parse::<u32>() {
                Ok(num) => {
                    let formatted = format!("{}{:02}", first_char, num);
                    trace!(
                        "QueueManager::format_identifier: Padded single digit: '{}' -> '{}'",
                        original_id,
                        formatted
                    );
                    formatted
                }
                Err(_) => {
                    // This case should ideally not be hit if route validation strictly passes digits.
                    // Log a warning if it does occur, indicating a potential upstream validation issue.
                    warn!("QueueManager::format_identifier: Could not parse supposed single digit '{}' from id '{}', using as string without padding.", digit_part_str, original_id);
                    format!("{}{}", first_char, digit_part_str)
                }
            }
        } else {
            // For multi-digit numbers or other cases (which should be handled by route validation now).
            let formatted = format!("{}{}", first_char, digit_part_str);
            trace!(
                "QueueManager::format_identifier: No padding needed: '{}' -> '{}'",
                original_id,
                formatted
            );
            formatted
        }
    }

    /// Removes a call with the given ID from all possible queue locations:
    /// `current_call`, `completed_history`, and `skipped_history`.
    ///
    /// This ensures that a call exists in only one place (or nowhere) at a given time.
    ///
    /// # Arguments
    /// - `call_id`: The ID of the call to remove.
    ///
    /// # Returns
    /// An `Option<Call>`:
    /// - `Some(Call)` if the call was found and removed from any location.
    /// - `None` if the call was not found in any queue.
    fn remove_call_from_all_queues(&mut self, call_id: &str) -> Option<Call> {
        debug!("QueueManager::remove_call_from_all_queues: Attempting to remove call with ID '{}' from all queues.", call_id);
        let mut found_call: Option<Call> = None;

        // Check and remove from `current_call`
        if let Some(current) = &self.current_call {
            if current.id == call_id {
                debug!("QueueManager::remove_call_from_all_queues: ID '{}' found in current_call. Removing.", call_id);
                found_call = self.current_call.take(); // Use .take() to remove and get the value.
            }
        }

        // Check and remove from `completed_history`
        // `position` returns the index of the first matching element.
        if let Some(pos) = self.completed_history.iter().position(|c| c.id == call_id) {
            debug!("QueueManager::remove_call_from_all_queues: ID '{}' found in completed_history. Removing.", call_id);
            let removed_from_history = self
                .completed_history
                .remove(pos)
                .expect("Call should exist at found position"); // Safe to unwrap because position was found.
            if found_call.is_none() {
                // Only set `found_call` if it hasn't been set yet (i.e., if it wasn't in `current_call`).
                found_call = Some(removed_from_history);
            }
        }

        // Check and remove from `skipped_history`
        if let Some(pos) = self.skipped_history.iter().position(|c| c.id == call_id) {
            debug!("QueueManager::remove_call_from_all_queues: ID '{}' found in skipped_history. Removing.", call_id);
            let removed_from_skipped = self
                .skipped_history
                .remove(pos)
                .expect("Call should exist at found position"); // Safe to unwrap because position was found.
            if found_call.is_none() {
                // Only set `found_call` if it hasn't been set yet.
                found_call = Some(removed_from_skipped);
            }
        }

        if found_call.is_some() {
            info!("QueueManager::remove_call_from_all_queues: ID '{}' was present in one or more queues and has been removed.", call_id);
        } else {
            debug!("QueueManager::remove_call_from_all_queues: ID '{}' was not found in any active queue location.", call_id);
        }
        found_call
    }

    /// Adds a new call to the queue, setting it as the `current_call`.
    ///
    /// If there was a previous `current_call`, it is moved to the `completed_history`.
    /// If a call with the same formatted ID already exists in any queue (current, completed, or skipped),
    /// it will be removed and its data updated (location, timestamp) before being set as the new current call.
    /// This handles "recalling" or "updating" a call.
    ///
    /// # Arguments
    /// - `original_id_param`: The original, unformatted ID of the call (e.g., "a1").
    /// - `location_param`: The location associated with the call (e.g., "Counter 3").
    ///
    /// # Returns
    /// An `Option<&Call>` reference to the newly set `current_call`.
    pub fn add_call(&mut self, original_id_param: String, location_param: String) -> Option<&Call> {
        let formatted_id = Self::format_identifier(&original_id_param);
        let now: DateTime<Utc> = SystemTime::now().into();

        info!(
            "QueueManager::add_call: Attempting to add original_id='{}' (formatted_id='{}'), location='{}'. Previous current_call: {:?}",
            original_id_param,
            formatted_id,
            location_param,
            self.current_call.as_ref().map(|c| &c.id) // Log previous current_call ID
        );

        // First, try to remove an existing call with the same formatted ID.
        // If found, it means we're recalling/updating an existing call.
        // If not found, create a brand new Call instance.
        let call_to_add = self.remove_call_from_all_queues(&formatted_id)
            .map_or_else(
                // Case 1: Call not found in any queue, create a new one.
                || Call {
                    id: formatted_id.clone(), // Use formatted ID as the canonical ID
                    original_id: original_id_param.clone(),
                    location: location_param.clone(),
                    timestamp: now,
                },
                // Case 2: Existing call found, update its details and timestamp.
                |mut existing_call| {
                    info!("QueueManager::add_call: Recalling/updating existing call data for ID '{}'. Original_id: '{}' -> '{}', Location: '{}' -> '{}'.",
                        formatted_id, existing_call.original_id, original_id_param, existing_call.location, location_param
                    );
                    existing_call.original_id = original_id_param.clone(); // Update original_id
                    existing_call.location = location_param.clone();     // Update location
                    existing_call.timestamp = now; // Update timestamp to now
                    existing_call
                }
            );

        // If there was a `current_call` previously, move it to `completed_history`
        // unless it's the exact same call being re-added (already handled by remove_call_from_all_queues).
        if let Some(previous_current_call) = self.current_call.take() {
            // Only move to history if the previous current call is different from the one being added.
            if previous_current_call.id != call_to_add.id {
                info!(
                    "QueueManager::add_call: Moving previous current_call '{}' to completed_history.",
                    previous_current_call.id
                );
                self.completed_history.push_back(previous_current_call);
                self.enforce_max_completed_history_size(); // Enforce history size limit
            } else {
                debug!("QueueManager::add_call: Previous current call was same as call being added ('{}'), already handled by uniqueness logic.", call_to_add.id);
            }
        } else {
            debug!("QueueManager::add_call: No previous current_call to move to history, or it was the same call and has been handled.");
        }

        // Set the new `current_call`.
        info!("QueueManager::add_call: Setting new current_call to: id='{}', original_id='{}', location='{}'.", call_to_add.id, call_to_add.original_id, call_to_add.location);
        self.current_call = Some(call_to_add);

        // Return a reference to the newly set current call.
        self.current_call.as_ref()
    }

    /// Moves the `current_call` to the `skipped_history`.
    ///
    /// If there is no `current_call`, nothing happens. The timestamp of the skipped
    /// call is updated to the current time. The `skipped_history` size limit is enforced.
    ///
    /// # Returns
    /// An `Option<Call>`:
    /// - `Some(Call)` containing the `Call` that was skipped.
    /// - `None` if there was no `current_call` to skip.
    pub fn skip_current_call(&mut self) -> Option<Call> {
        info!(
            "QueueManager::skip_current_call: Attempting. Current: {:?}",
            self.current_call.as_ref().map(|c| &c.id)
        );
        if let Some(mut call_to_skip) = self.current_call.take() {
            info!(
                "QueueManager::skip_current_call: Skipping call '{}'.",
                call_to_skip.id
            );
            // Ensure the call is fully removed from any other queue location before moving to skipped.
            self.remove_call_from_all_queues(&call_to_skip.id);

            call_to_skip.timestamp = SystemTime::now().into(); // Update timestamp to when it was skipped.
            self.skipped_history.push_back(call_to_skip.clone()); // Push a clone to history.
            self.enforce_max_skipped_history_size(); // Enforce history size limit.
            info!("QueueManager::skip_current_call: '{}' moved to skipped_history. Current call is now None.", call_to_skip.id);
            Some(call_to_skip)
        } else {
            warn!("QueueManager::skip_current_call: No current call to skip.");
            None
        }
    }

    /// Moves the `current_call` to the `completed_history`.
    ///
    /// If there is no `current_call`, nothing happens. The timestamp of the completed
    /// call is updated to the current time. The `completed_history` size limit is enforced.
    ///
    /// # Returns
    /// An `Option<Call>`:
    /// - `Some(Call)` containing the `Call` that was completed.
    /// - `None` if there was no `current_call` to complete.
    pub fn complete_current_call(&mut self) -> Option<Call> {
        info!(
            "QueueManager::complete_current_call: Attempting. Current: {:?}",
            self.current_call.as_ref().map(|c| &c.id)
        );
        if let Some(mut call_to_complete) = self.current_call.take() {
            info!(
                "QueueManager::complete_current_call: Completing call '{}'.",
                call_to_complete.id
            );
            // Ensure the call is fully removed from any other queue location before moving to completed.
            self.remove_call_from_all_queues(&call_to_complete.id);

            call_to_complete.timestamp = SystemTime::now().into(); // Update timestamp to when it was completed.
            self.completed_history.push_back(call_to_complete.clone()); // Push a clone to history.
            self.enforce_max_completed_history_size(); // Enforce history size limit.
            info!("QueueManager::complete_current_call: '{}' moved to completed_history. Current call is now None.", call_to_complete.id);
            Some(call_to_complete)
        } else {
            warn!("QueueManager::complete_current_call: No current call to complete.");
            None
        }
    }

    /// Adds a new call directly to the `skipped_history`.
    ///
    /// This is useful for cases where a call needs to be logged as skipped without it
    /// necessarily having been the `current_call`. If a call with the same formatted ID
    /// already exists in any queue, it will be removed and its data updated (location, timestamp)
    /// before being added to skipped history.
    ///
    /// # Arguments
    /// - `original_id_param`: The original, unformatted ID of the call.
    /// - `location_param`: The location associated with the call.
    ///
    /// # Returns
    /// An `Option<Call>` containing the `Call` that was added to skipped history.
    pub fn add_to_skipped_directly(
        &mut self,
        original_id_param: String,
        location_param: String,
    ) -> Option<Call> {
        let formatted_id = Self::format_identifier(&original_id_param);
        let now: DateTime<Utc> = SystemTime::now().into();
        info!("QueueManager::add_to_skipped_directly: Attempting for original_id='{}' (formatted_id='{}'), location='{}'.", original_id_param, formatted_id, location_param);

        // Remove any existing instance of this call from all queues first.
        let call_data = self.remove_call_from_all_queues(&formatted_id)
            .map_or_else(
                // Case 1: Call not found, create a new one.
                || Call {
                    id: formatted_id.clone(),
                    original_id: original_id_param.clone(),
                    location: location_param.clone(),
                    timestamp: now,
                },
                // Case 2: Existing call found, update its details and timestamp.
                |mut existing_call| {
                    info!("QueueManager::add_to_skipped_directly: Existing call data found for ID '{}'. Updating original_id: '{}' -> '{}', location: '{}' -> '{}'.",
                        formatted_id, existing_call.original_id, original_id_param, existing_call.location, location_param
                    );
                    existing_call.original_id = original_id_param.clone();
                    existing_call.location = location_param.clone();
                    existing_call.timestamp = now;
                    existing_call
                }
            );

        info!("QueueManager::add_to_skipped_directly: Adding call id='{}' directly to skipped_history.", call_data.id);
        self.skipped_history.push_back(call_data.clone()); // Add the call to the skipped history.
        self.enforce_max_skipped_history_size(); // Enforce history size limit.

        Some(call_data)
    }

    /// Returns a reference to the `current_call`.
    ///
    /// # Returns
    /// An `Option<&Call>`: `Some` if a call is currently active, `None` otherwise.
    pub fn get_current_call(&self) -> Option<&Call> {
        debug!(
            "QueueManager::get_current_call: Returning current_call: {:?}",
            self.current_call.as_ref().map(|c| &c.id)
        );
        self.current_call.as_ref()
    }

    /// Returns a reference to the `completed_history` deque.
    ///
    /// # Returns
    /// A `&VecDeque<Call>` containing the history of completed calls.
    pub fn get_completed_history(&self) -> &VecDeque<Call> {
        debug!(
            "QueueManager::get_completed_history: Returning completed_history ({} calls).",
            self.completed_history.len()
        );
        &self.completed_history
    }

    /// Returns a reference to the `skipped_history` deque.
    ///
    /// # Returns
    /// A `&VecDeque<Call>` containing the history of skipped calls.
    pub fn get_skipped_history(&self) -> &VecDeque<Call> {
        debug!(
            "QueueManager::get_skipped_history: Returning skipped_history ({} calls).",
            self.skipped_history.len()
        );
        &self.skipped_history
    }

    /// Create a clone of the current queue state for external consumers.
    pub fn snapshot(&self) -> QueueState {
        QueueState {
            current_call: self.current_call.clone(),
            completed_history: self.completed_history.clone(),
            skipped_history: self.skipped_history.clone(),
        }
    }

    /// Enforces the `max_history_size` for the `completed_history`.
    ///
    /// If the `completed_history` exceeds its maximum allowed size, the oldest
    /// calls are removed from the front of the deque until the size limit is met.
    fn enforce_max_completed_history_size(&mut self) {
        debug!(
            "QueueManager: Enforcing max_completed_history_size (current: {}, max: {})",
            self.completed_history.len(),
            self.max_history_size
        );
        while self.completed_history.len() > self.max_history_size {
            if let Some(removed) = self.completed_history.pop_front() {
                trace!("QueueManager: Enforcing max_history_size. Removed oldest from completed_history: {}", removed.id);
            }
        }
    }

    /// Enforces the `max_skipped_history_size` for the `skipped_history`.
    ///
    /// If the `skipped_history` exceeds its maximum allowed size, the oldest
    /// calls are removed from the front of the deque until the size limit is met.
    fn enforce_max_skipped_history_size(&mut self) {
        debug!(
            "QueueManager: Enforcing max_skipped_history_size (current: {}, max: {})",
            self.skipped_history.len(),
            self.max_skipped_history_size
        );
        while self.skipped_history.len() > self.max_skipped_history_size {
            if let Some(removed) = self.skipped_history.pop_front() {
                trace!("QueueManager: Enforcing max_skipped_history_size. Removed oldest from skipped_history: {}", removed.id);
            }
        }
    }
}

// Module for unit tests
#[cfg(test)]
mod tests {
    use super::*;
    use tracing_test::traced_test; // For capturing logs in tests

    // Initialize a tracing subscriber for tests if it's not already initialized.
    // This allows `traced_test` to capture logs.
    // #[once_cell::sync::Lazy]
    // static INIT: () = {
    //     tracing_subscriber::fmt::init();
    // };

    /// Test case for the `format_identifier` logic.
    #[test]
    #[traced_test] // Enables tracing for this test function
    fn test_format_identifier_logic() {
        assert_eq!(
            QueueManager::format_identifier("A1"),
            "A01",
            "Should pad single digit 'A1' to 'A01'"
        );
        assert_eq!(
            QueueManager::format_identifier("a1"),
            "A01",
            "Should uppercase and pad 'a1' to 'A01'"
        );
        assert_eq!(
            QueueManager::format_identifier("B10"),
            "B10",
            "Should not pad multi-digit 'B10'"
        );
        assert_eq!(
            QueueManager::format_identifier(""),
            "",
            "Should return empty string for empty input"
        );
        // Additional tests for robustness:
        assert_eq!(
            QueueManager::format_identifier("Z9"),
            "Z09",
            "Should pad single digit 'Z9' to 'Z09'"
        );
        assert_eq!(
            QueueManager::format_identifier("c123"),
            "C123",
            "Should uppercase and not pad 'c123'"
        );
        info!("test_format_identifier_logic passed successfully.");
    }

    /// Test comprehensive `add_call` behavior, including history management and uniqueness.
    #[test]
    #[traced_test]
    fn test_add_call_sequence_t1_to_t4_behavior_and_uniqueness() {
        let mut manager = QueueManager::new(2, 2); // Small history sizes for easier testing

        info!("Starting T1: Initial state check.");
        // T1: Initial state check
        assert!(
            manager.get_current_call().is_none(),
            "Initially, current_call should be None"
        );
        assert!(
            manager.get_completed_history().is_empty(),
            "Initially, completed_history should be empty"
        );
        assert!(
            manager.get_skipped_history().is_empty(),
            "Initially, skipped_history should be empty"
        );

        info!("Starting T2: Call A100, 4.");
        // T2: Add Call A100, 4
        manager.add_call("A100".to_string(), "4".to_string());
        let current = manager
            .get_current_call()
            .expect("A100 should be current call");
        assert_eq!(
            current.original_id, "A100",
            "Current call original ID should be A100"
        );
        assert!(
            manager.get_completed_history().is_empty(),
            "Completed history should be empty after first call"
        );
        assert!(
            manager.get_skipped_history().is_empty(),
            "Skipped history should be empty"
        );

        info!("Starting T3: Call A101, 4.");
        // T3: Add Call A101, 4 (A100 should move to completed)
        manager.add_call("A101".to_string(), "4".to_string());
        let current = manager
            .get_current_call()
            .expect("A101 should be current call");
        assert_eq!(
            current.original_id, "A101",
            "Current call original ID should be A101"
        );
        let completed = manager.get_completed_history();
        assert_eq!(completed.len(), 1, "Completed history should have 1 call");
        assert_eq!(
            completed[0].original_id, "A100",
            "The first completed call should be A100"
        );
        assert!(
            manager.get_skipped_history().is_empty(),
            "Skipped history should still be empty"
        );

        info!("Starting T4: Call A102, 4.");
        // T4: Add Call A102, 4 (A101 should move to completed, A100 stays)
        manager.add_call("A102".to_string(), "4".to_string());
        let current = manager
            .get_current_call()
            .expect("A102 should be current call");
        assert_eq!(
            current.original_id, "A102",
            "Current call original ID should be A102"
        );
        let completed = manager.get_completed_history();
        assert_eq!(completed.len(), 2, "Completed history should have 2 calls");
        assert_eq!(
            completed[0].original_id, "A100",
            "First completed call should remain A100"
        );
        assert_eq!(
            completed[1].original_id, "A101",
            "Second completed call should be A101"
        );
        assert!(
            manager.get_skipped_history().is_empty(),
            "Skipped history should still be empty"
        );

        info!("Starting T5: Re-adding A100 with new location (should become current, removing from completed).");
        // T5: Re-add A100 with new location (A100 should be removed from completed and become current)
        manager.add_call("A100".to_string(), "new_loc_for_A100".to_string());
        let current = manager
            .get_current_call()
            .expect("A100 should now be the current call");
        assert_eq!(
            current.original_id, "A100",
            "Current call original ID should be A100 after re-add"
        );
        assert_eq!(
            current.location, "new_loc_for_A100",
            "Location for A100 should be updated"
        );
        let completed = manager.get_completed_history(); // Expected: A102 (prev current) -> A101
        assert_eq!(
            completed.len(),
            2,
            "Completed history should still have 2 calls"
        ); // A102 and A101 are there
        assert!(
            completed
                .iter()
                .find(|c| c.original_id == "A100")
                .is_none(),
            "A100 should no longer be in completed history"
        );
        assert_eq!(
            completed
                .iter()
                .find(|c| c.original_id == "A102")
                .expect("A102 should be in completed history")
                .original_id,
            "A102"
        );
        assert_eq!(
            completed
                .iter()
                .find(|c| c.original_id == "A101")
                .expect("A101 should be in completed history")
                .original_id,
            "A101"
        );

        assert!(
            manager.get_skipped_history().is_empty(),
            "Skipped history should remain empty"
        );
        info!("test_add_call_sequence_t1_to_t4_behavior_and_uniqueness passed successfully.");
    }

    /// Test `skip_current_call` functionality and history management.
    #[test]
    #[traced_test]
    fn test_skip_current_call_uniqueness() {
        let mut manager = QueueManager::new(1, 1); // Small histories for easier testing

        info!("Setting up initial calls for skip test.");
        manager.add_call("S1".to_string(), "1".to_string()); // S1 becomes current
        manager.add_call("S2".to_string(), "2".to_string()); // S2 becomes current, S1 to completed

        assert_eq!(
            manager
                .get_current_call()
                .expect("S2 should be current")
                .original_id,
            "S2"
        );
        assert_eq!(
            manager
                .get_completed_history()
                .front()
                .expect("S1 should be in completed")
                .original_id,
            "S1"
        );
        assert!(
            manager.get_skipped_history().is_empty(),
            "Skipped history should be empty initially"
        );

        info!("Skipping current call (S2).");
        manager.skip_current_call(); // S2 should move to skipped history
        assert!(
            manager.get_current_call().is_none(),
            "Current call should be None after skipping"
        );
        assert_eq!(
            manager
                .get_skipped_history()
                .front()
                .expect("S2 should be in skipped history")
                .original_id,
            "S2"
        );
        assert_eq!(
            manager
                .get_completed_history()
                .front()
                .expect("S1 should still be in completed history")
                .original_id,
            "S1"
        ); // S1 remains
        info!("test_skip_current_call_uniqueness passed successfully.");
    }

    /// Test `add_to_skipped_directly` functionality, including update/uniqueness behavior.
    #[test]
    #[traced_test]
    fn test_add_to_skipped_directly_t5_and_uniqueness() {
        let mut manager = QueueManager::new(2, 2); // Small history sizes for easier testing

        info!("Setting up initial calls for add_to_skipped_directly test.");
        manager.add_call("A100".to_string(), "4".to_string()); // A100
        manager.add_call("A101".to_string(), "4".to_string()); // A101 current, A100 completed
        manager.add_call("A102".to_string(), "4".to_string()); // A102 current, A101 completed, A100 still completed

        assert_eq!(
            manager
                .get_current_call()
                .unwrap()
                .original_id,
            "A102"
        );
        assert_eq!(manager.get_completed_history().len(), 2); // A100, A101 (oldest to newest)
        assert_eq!(
            manager
                .get_completed_history()
                .front()
                .unwrap()
                .original_id,
            "A100"
        );
        assert_eq!(
            manager
                .get_completed_history()
                .back()
                .unwrap()
                .original_id,
            "A101"
        );
        assert!(manager.get_skipped_history().is_empty());

        info!("Adding A104 directly to skipped history (should not affect current or completed).");
        manager.add_to_skipped_directly("A104".to_string(), "4".to_string());
        assert_eq!(
            manager
                .get_current_call()
                .unwrap()
                .original_id,
            "A102",
            "Current call should remain A102"
        );
        assert_eq!(
            manager.get_completed_history().len(),
            2,
            "Completed history should remain 2"
        ); // A100, A101
        let skipped = manager.get_skipped_history();
        assert_eq!(skipped.len(), 1, "Skipped history should have 1 call");
        assert_eq!(
            skipped[0].original_id,
            "A104",
            "The skipped call should be A104"
        );

        info!("Adding A102 directly to skipped history (should remove from current).");
        manager.add_to_skipped_directly("A102".to_string(), "new_loc_A102".to_string());
        assert!(
            manager.get_current_call().is_none(),
            "Current call should be None after A102 moved to skipped"
        );
        let skipped = manager.get_skipped_history();
        assert_eq!(skipped.len(), 2, "Skipped history should now have 2 calls");
        assert!(
            skipped
                .iter()
                .any(|c| c.original_id == "A102" && c.location == "new_loc_A102"),
            "A102 should be in skipped with updated location"
        );
        assert!(
            skipped.iter().any(|c| c.original_id == "A104"),
            "A104 should still be in skipped"
        );
        // A102 was the current call, so it's removed from current and added to skipped.
        // History (A100, A101) remains unchanged.

        info!("Adding C1 as current, then adding A100 directly to skipped history (should remove from completed).");
        manager.add_call("C1".to_string(), "1".to_string()); // C1 becomes current, A102 (from current, if it was still there) moves to completed (or A101 gets pruned).
                                                             // Given `manager.get_current_call().is_none()` from previous step, C1 just becomes current.
                                                             // completed_history still has A100, A101.
        manager.add_to_skipped_directly("A100".to_string(), "new_loc_A100".to_string());
        // A100 should be removed from completed history and added to skipped history.
        assert_eq!(
            manager
                .get_completed_history()
                .iter()
                .find(|c| c.original_id == "A100"),
            None,
            "A100 should no longer be in completed history"
        );
        let skipped = manager.get_skipped_history();
        assert!(
            skipped
                .iter()
                .any(|c| c.original_id == "A100" && c.location == "new_loc_A100"),
            "A100 should be in skipped with updated location"
        );
        assert_eq!(
            skipped.len(),
            2,
            "Skipped history should respect the configured max size"
        );
        assert!(
            skipped
                .iter()
                .any(|c| c.original_id == "A102"),
            "A102 should remain in skipped history"
        );
        assert!(
            skipped
                .iter()
                .any(|c| c.original_id == "A100"),
            "A100 should be in skipped history after direct add"
        );
        assert!(
            skipped.iter().all(|c| c.original_id != "A104"),
            "A104 should have been pruned once the max size was exceeded"
        );

        info!("test_add_to_skipped_directly_t5_and_uniqueness passed successfully.");
    }
}
