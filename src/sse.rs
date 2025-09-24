//! Server-Sent Events helpers.

use rocket::response::stream::Event as RocketEvent;
use serde_json::to_string;
use tracing::error;

use crate::AppEvent;

/// Convert an [`AppEvent`] into a Rocket SSE event.
/// Returns `None` when serialization fails, which signals the caller to drop the event.
pub fn format_app_event(event: &AppEvent) -> Option<RocketEvent> {
    match to_string(event) {
        Ok(json_payload) => {
            let event_name = match event {
                AppEvent::QueueUpdate(_) => "queue_update",
                AppEvent::AnnouncementStatus(_) => "announcement_status",
                AppEvent::TTSComplete { .. } => "tts_complete",
            };
            Some(RocketEvent::data(json_payload).event(event_name))
        }
        Err(err) => {
            error!("Failed to serialise AppEvent for SSE: {}", err);
            None
        }
    }
}
