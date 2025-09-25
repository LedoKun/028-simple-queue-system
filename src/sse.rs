//! Server-Sent Events helpers.

use axum::response::sse::Event;
use serde_json::to_string;
use tracing::error;

use crate::AppEvent;

/// Convert an [`AppEvent`] into an Axum SSE event.
/// Returns `None` when serialization fails, which signals the caller to drop the event.
pub fn format_app_event(event: &AppEvent) -> Option<Event> {
    match to_string(event) {
        Ok(json_payload) => {
            let event_name = match event {
                AppEvent::QueueUpdate(_) => "queue_update",
                AppEvent::AnnouncementStatus(_) => "announcement_status",
                AppEvent::TTSComplete { .. } => "tts_complete",
            };

            Some(Event::default().event(event_name).data(json_payload))
        }
        Err(err) => {
            error!("Failed to serialise AppEvent for SSE: {}", err);
            None
        }
    }
}
