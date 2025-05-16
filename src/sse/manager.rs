use rocket::response::stream::Event as RocketEvent;
// Removed: use std::sync::Arc; // No longer needed here if config is removed
use serde_json;

// Removed: use crate::{config::AppConfig, AppEvent};
use crate::AppEvent; // AppEvent is still needed for format_app_event

/// Manages Server-Sent Events connections and broadcasting.
#[derive(Debug)]
pub struct SSEManager {
    // Removed: config: Arc<AppConfig>, // Field was not used
}

impl SSEManager {
    /// Creates a new `SSEManager`.
    pub fn new(/* Removed: config: Arc<AppConfig> */) -> Self {
        // Config parameter removed
        tracing::info!("Initializing SSEManager...");
        SSEManager { /* No fields to initialize */ }
    }

    /// Formats an `AppEvent` into a `rocket::response::stream::Event`.
    pub fn format_app_event(event: &AppEvent) -> Option<RocketEvent> {
        // This is an associated function (static)
        match serde_json::to_string(&event) {
            Ok(json_payload) => {
                let event_name = match event {
                    AppEvent::QueueUpdate(_) => "queue_update",
                    AppEvent::AnnouncementStatus(_) => "announcement_status",
                    AppEvent::TTSComplete { .. } => "tts_complete",
                };
                Some(RocketEvent::data(json_payload).event(event_name))
            }
            Err(e) => {
                tracing::error!("Failed to serialize AppEvent to JSON for SSE: {}", e);
                None
            }
        }
    }
}
