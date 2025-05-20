// src/sse/manager.rs

//! Manages Server-Sent Events (SSE) connections for real-time updates to clients.
//!
//! This module focuses on formatting application events into a format suitable
//! for Rocket's SSE stream, enabling seamless communication of `AppEvent`s
//! to connected frontend applications.

use rocket::response::stream::Event as RocketEvent;
use serde_json;
use tracing::{debug, error, info}; // Import tracing macros

use crate::AppEvent; // AppEvent is essential for event formatting

/// `SSEManager` is responsible for preparing and handling data for Server-Sent Events.
///
/// In its current design, this manager primarily serves as a formatter for `AppEvent`s
/// into `rocket::response::stream::Event`s, which are then broadcast to connected clients
/// by other parts of the system (e.g., a dedicated SSE route).
///
/// This struct currently holds no internal state, making it lightweight and stateless.
#[derive(Debug)]
pub struct SSEManager {
    // No fields are currently needed for this stateless manager.
    // If state (e.g., active connections, connection limits) were added,
    // they would be defined here.
}

impl SSEManager {
    /// Creates a new `SSEManager` instance.
    ///
    /// Since this manager is currently stateless, its initialization is straightforward.
    ///
    /// # Returns
    /// A new `SSEManager` instance.
    pub fn new() -> Self {
        info!("Initializing SSEManager (stateless).");
        // No fields to initialize, so no `debug!` logs for field values here.
        SSEManager {}
    }

    /// Formats an `AppEvent` into a `rocket::response::stream::Event` suitable for SSE.
    ///
    /// This associated function (called statically, e.g., `SSEManager::format_app_event(...)`)
    /// serializes the `AppEvent` into a JSON payload and sets the appropriate event name
    /// for the SSE stream. This allows frontend clients to differentiate between event types.
    ///
    /// # Arguments
    /// - `event`: A reference to the `AppEvent` to be formatted.
    ///
    /// # Returns
    /// - `Some(RocketEvent)` if the `AppEvent` is successfully serialized to JSON.
    /// - `None` if serialization fails, with an error logged.
    pub fn format_app_event(event: &AppEvent) -> Option<RocketEvent> {
        // Attempt to serialize the AppEvent into a JSON string.
        match serde_json::to_string(&event) {
            Ok(json_payload) => {
                // Determine the SSE event name based on the AppEvent variant.
                let event_name = match event {
                    AppEvent::QueueUpdate(_) => "queue_update",
                    AppEvent::AnnouncementStatus(_) => "announcement_status",
                    AppEvent::TTSComplete { .. } => "tts_complete",
                };
                debug!(
                    "Formatted AppEvent of type '{}' for SSE. Payload length: {}",
                    event_name,
                    json_payload.len()
                );
                // Construct and return the RocketEvent.
                Some(RocketEvent::data(json_payload).event(event_name))
            }
            Err(e) => {
                // Log an error if JSON serialization fails.
                error!("Failed to serialize AppEvent to JSON for SSE: {}", e);
                None
            }
        }
    }
}
