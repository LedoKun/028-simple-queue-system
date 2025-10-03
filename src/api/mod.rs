//! Public-facing HTTP API routes grouped by domain.

use std::sync::Arc;

use axum::routing::{get, post};
use axum::Router;

pub mod announcements;
pub mod events;
pub mod queue;
pub mod translator;
pub mod tts;

use announcements::{
    get_announcement_status, manual_advance_announcement, manual_trigger_specific_announcement,
};
use events::sse_events;
use queue::{complete_call, force_skip_new_call, get_queue_state, queue_call, skip_call};
use translator::{call_translator, get_translator_status};
use tts::{get_ordered_supported_languages, get_supported_languages, trigger_tts};

use crate::AppState;

/// Build the Axum router exposing all API routes under the `/api` prefix.
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/events", get(sse_events))
        .route("/tts/trigger", post(trigger_tts))
        .route("/tts/languages", get(get_supported_languages))
        .route(
            "/tts/ordered-languages",
            get(get_ordered_supported_languages),
        )
        .route("/queue/add", post(queue_call))
        .route("/queue/skip", post(skip_call))
        .route("/queue/complete", post(complete_call))
        .route("/queue/force_skip", post(force_skip_new_call))
        .route("/queue/state", get(get_queue_state))
        .route("/announcements/status", get(get_announcement_status))
        .route("/announcements/next", post(manual_advance_announcement))
        .route(
            "/announcements/trigger/:slot_id",
            post(manual_trigger_specific_announcement),
        )
        .route("/translator/status", get(get_translator_status))
        .route("/translator/call", post(call_translator))
}
