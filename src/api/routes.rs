// src/api/routes.rs
use regex; // Added this import
use rocket::{
    get, post, response::status, response::stream::EventStream, serde::json::Json, State,
};
use serde::Deserialize;
use std::collections::HashMap;
use tokio::sync::broadcast;
use tokio::time as TokioTime;

use crate::announcements;
use crate::queue::QueueState;
use crate::sse::manager::SSEManager;
// Removed unused `Call` import here, ensure it's not needed for other structs not shown.
// If other structs in this file DO use `crate::Call`, add it back.
use crate::{AppEvent, AppState};

// Request struct for adding/updating a call normally
#[derive(Deserialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct AddCallRequest {
    pub original_id: String,
    pub location: String,
}

#[derive(Deserialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct TriggerTTSRequest {
    id: String,
    location: String,
    lang: String,
}

// Request struct for force_skip_new_call
#[derive(Deserialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct ForceSkipRequest {
    original_id: String,
    location: String,
}

#[post("/tts/trigger", data = "<request>")]
pub async fn trigger_tts(
    state: &State<AppState>,
    request: Json<TriggerTTSRequest>,
) -> Result<status::Accepted<String>, status::BadRequest<String>> {
    tracing::info!(
        "Manual TTS trigger request for lang '{}': {:?}",
        request.lang,
        request
    );
    let tts_manager = state.tts_manager.lock().await;
    match tts_manager.trigger_tts_generation(
        request.id.clone(),
        request.location.clone(),
        request.lang.clone(),
    ) {
        Ok(_) => Ok(status::Accepted("TTS generation triggered".to_string())),
        Err(e) => Err(status::BadRequest(e)), // e is already String
    }
}

#[get("/tts/languages")]
pub async fn get_supported_languages(state: &State<AppState>) -> Json<HashMap<String, String>> {
    tracing::info!("Received request for supported languages map.");
    let tts_manager = state.tts_manager.lock().await;
    Json(tts_manager.get_supported_languages().clone())
}

#[get("/tts/ordered-languages")]
pub fn get_ordered_supported_languages(state: &State<AppState>) -> Json<Vec<String>> {
    tracing::info!("Received request for ordered supported languages.");
    Json(state.config.ordered_supported_language_codes())
}

#[get("/events")]
pub fn sse_events(state: &State<AppState>) -> EventStream![] {
    let sender = state.event_bus_sender.clone();
    let keep_alive_interval = state.config.sse_keep_alive_interval();
    tracing::info!("New SSE client connected to /api/events.");

    EventStream! {
        let mut receiver = sender.subscribe();
        let mut interval = TokioTime::interval(keep_alive_interval);
        interval.tick().await;
        interval.set_missed_tick_behavior(TokioTime::MissedTickBehavior::Skip);

        loop {
            tokio::select! {
                event_result = receiver.recv() => {
                    match event_result {
                        Ok(event) => {
                             tracing::debug!("SSE: Received AppEvent for broadcast: {:?}", event);
                             if let Some(rocket_event) = SSEManager::format_app_event(&event) {
                                 yield rocket_event;
                             } else {
                                  tracing::error!("SSE: Failed to format AppEvent for SSE client.");
                             }
                        },
                        Err(broadcast::error::RecvError::Closed) => {
                            tracing::info!("SSE: Broadcast channel closed for a client connection.");
                            break;
                        },
                        Err(broadcast::error::RecvError::Lagged(skipped)) => {
                            tracing::warn!("SSE: Client lagged, skipped {} events.", skipped);
                        }
                    }
                },
                _ = interval.tick() => {
                    yield rocket::response::stream::Event::comment("keep-alive");
                }
            }
        }
    }
}

#[post("/queue/add", data = "<call_request_data>")]
pub async fn queue_call(
    state: &State<AppState>,
    call_request_data: Json<AddCallRequest>,
) -> Result<status::Accepted<String>, status::BadRequest<String>> {
    let call_info = call_request_data.into_inner();
    tracing::info!(
        "/api/queue/add: Received call data: original_id='{}', location='{}'",
        call_info.original_id,
        call_info.location
    );

    // Stricter Validation: Identifier (e.g., A1, Z99)
    let identifier_pattern = regex::Regex::new(r"^[A-Z][0-9]+$").unwrap();
    if !identifier_pattern.is_match(&call_info.original_id) {
        return Err(status::BadRequest(format!("Invalid Identifier format. Must be an uppercase letter followed by digits (e.g., A1, Z99). Received: {}", call_info.original_id)));
    }

    // Stricter Validation: Location (e.g., 5, 10)
    let location_pattern = regex::Regex::new(r"^[0-9]+$").unwrap();
    if !location_pattern.is_match(&call_info.location) {
        return Err(status::BadRequest(format!(
            "Invalid Location format. Must be digits only (e.g., 5, 10). Received: {}",
            call_info.location
        )));
    }

    let mut queue_manager = state.queue_manager.lock().await;
    if let Some(current_call_ref) =
        queue_manager.add_call(call_info.original_id.clone(), call_info.location.clone())
    {
        let current_call_owned = current_call_ref.clone();
        tracing::info!(
            "/api/queue/add: Call '{}' is now current.",
            current_call_owned.id
        );

        let current_q_state = QueueState {
            current_call: Some(current_call_owned.clone()),
            completed_history: queue_manager.get_completed_history().clone(),
            skipped_history: queue_manager.get_skipped_history().clone(),
        };
        tracing::info!(
            "/api/queue/add: Broadcasting QueueUpdate: {:?}",
            current_q_state
        );
        if let Err(e) = state
            .event_bus_sender
            .send(AppEvent::QueueUpdate(current_q_state))
        {
            tracing::debug!("Could not broadcast QueueUpdate after add: {}", e);
        }

        let tts_manager_guard = state.tts_manager.lock().await;
        let ordered_langs = state.config.ordered_supported_language_codes();
        if !ordered_langs.is_empty() {
            tracing::info!(
                "Call {} is current. Triggering TTS for languages: {:?}",
                current_call_owned.id,
                ordered_langs
            );
            for lang_code in ordered_langs {
                if let Err(e) = tts_manager_guard.trigger_tts_generation(
                    current_call_owned.id.clone(),
                    current_call_owned.location.clone(),
                    lang_code.clone(),
                ) {
                    tracing::error!(
                        "Failed to trigger TTS generation task for lang '{}': {}",
                        lang_code,
                        e
                    );
                }
            }
        } else {
            tracing::warn!(
                "No supported languages configured for TTS for call ID: {}",
                current_call_owned.id
            );
        }
        drop(tts_manager_guard);

        Ok(status::Accepted(format!(
            "Call {} with location {} is now current. TTS initiated.",
            current_call_owned.original_id, current_call_owned.location
        )))
    } else {
        tracing::error!("/api/queue/add: queue_manager.add_call unexpectedly returned None for original_id '{}'. This indicates an issue.", call_info.original_id);
        Err(status::BadRequest(
            "Failed to process the call. Please check server logs.".to_string(),
        ))
    }
}

#[post("/queue/skip")]
pub async fn skip_call(state: &State<AppState>) -> status::Accepted<String> {
    let mut queue_manager = state.queue_manager.lock().await;
    tracing::info!("/api/queue/skip: Attempting to skip current call.");
    let message: String;
    if let Some(skipped_call) = queue_manager.skip_current_call() {
        tracing::info!("/api/queue/skip: Call '{}' was skipped.", skipped_call.id);
        message = format!(
            "Call {} (Location {}) skipped successfully.",
            skipped_call.original_id, skipped_call.location
        );
    } else {
        tracing::warn!("/api/queue/skip: No current call to skip.");
        message = "No current call to skip.".to_string();
    }

    let current_q_state = QueueState {
        current_call: queue_manager.get_current_call().cloned(),
        completed_history: queue_manager.get_completed_history().clone(),
        skipped_history: queue_manager.get_skipped_history().clone(),
    };
    tracing::info!(
        "/api/queue/skip: Broadcasting QueueUpdate after skip action: {:?}",
        current_q_state
    );
    if let Err(e) = state
        .event_bus_sender
        .send(AppEvent::QueueUpdate(current_q_state))
    {
        tracing::debug!("Could not broadcast QueueUpdate after skip action: {}", e);
    }
    status::Accepted(message) // message is String
}

#[post("/queue/complete")]
pub async fn complete_call(state: &State<AppState>) -> status::Accepted<String> {
    let mut queue_manager = state.queue_manager.lock().await;
    tracing::info!("/api/queue/complete: Attempting to complete current call.");
    let message: String;
    if let Some(completed_call) = queue_manager.complete_current_call() {
        tracing::info!(
            "/api/queue/complete: Call '{}' was completed.",
            completed_call.id
        );
        message = format!(
            "Call {} (Location {}) completed successfully.",
            completed_call.original_id, completed_call.location
        );
    } else {
        tracing::warn!("/api/queue/complete: No current call to complete.");
        message = "No current call to complete.".to_string();
    }

    let current_q_state = QueueState {
        current_call: queue_manager.get_current_call().cloned(),
        completed_history: queue_manager.get_completed_history().clone(),
        skipped_history: queue_manager.get_skipped_history().clone(),
    };
    tracing::info!(
        "/api/queue/complete: Broadcasting QueueUpdate after complete action: {:?}",
        current_q_state
    );
    if let Err(e) = state
        .event_bus_sender
        .send(AppEvent::QueueUpdate(current_q_state))
    {
        tracing::debug!(
            "Could not broadcast QueueUpdate after complete action: {}",
            e
        );
    }
    status::Accepted(message) // message is String
}

#[post("/queue/force_skip", data = "<request_data>")]
pub async fn force_skip_new_call(
    state: &State<AppState>,
    request_data: Json<ForceSkipRequest>,
) -> Result<status::Accepted<String>, status::BadRequest<String>> {
    // Changed return type to BadRequest
    let call_info = request_data.into_inner();
    tracing::info!(
        "/api/queue/force_skip: Received data: original_id='{}', location='{}'",
        call_info.original_id,
        call_info.location
    );

    // Stricter Validation: Identifier (e.g., A1, Z99)
    let identifier_pattern = regex::Regex::new(r"^[A-Z][0-9]+$").unwrap();
    if !identifier_pattern.is_match(&call_info.original_id) {
        return Err(status::BadRequest(format!("Invalid Identifier format. Must be an uppercase letter followed by digits (e.g., A1, Z99). Received: {}", call_info.original_id)));
    }

    // Stricter Validation: Location (e.g., 5, 10)
    let location_pattern = regex::Regex::new(r"^[0-9]+$").unwrap();
    if !location_pattern.is_match(&call_info.location) {
        return Err(status::BadRequest(format!(
            "Invalid Location format. Must be digits only (e.g., 5, 10). Received: {}",
            call_info.location
        )));
    }

    let mut queue_manager = state.queue_manager.lock().await;
    // add_to_skipped_directly now returns Option<Call>
    if let Some(skipped_call_data) = queue_manager
        .add_to_skipped_directly(call_info.original_id.clone(), call_info.location.clone())
    {
        let current_q_state = QueueState {
            current_call: queue_manager.get_current_call().cloned(),
            completed_history: queue_manager.get_completed_history().clone(),
            skipped_history: queue_manager.get_skipped_history().clone(),
        };
        tracing::info!(
            "/api/queue/force_skip: Broadcasting QueueUpdate: {:?}",
            current_q_state
        );
        if let Err(e) = state
            .event_bus_sender
            .send(AppEvent::QueueUpdate(current_q_state))
        {
            tracing::debug!("Could not broadcast QueueUpdate after force_skip: {}", e);
        }
        Ok(status::Accepted(format!(
            "Call {} with location {} added directly to skipped list.",
            skipped_call_data.original_id,
            skipped_call_data.location // Use data from returned call
        )))
    } else {
        tracing::error!(
            "/api/queue/force_skip: add_to_skipped_directly failed for original_id '{}'.",
            call_info.original_id
        );
        Err(status::BadRequest(format!("Failed to add call {} to skipped list, it might already exist or another issue occurred.", call_info.original_id)))
    }
}

#[get("/queue/state")]
pub async fn get_queue_state(state: &State<AppState>) -> Json<QueueState> {
    tracing::debug!("GET /api/queue/state: Fetching current queue state.");
    let queue_manager = state.queue_manager.lock().await;
    let q_state = QueueState {
        current_call: queue_manager.get_current_call().cloned(),
        completed_history: queue_manager.get_completed_history().clone(),
        skipped_history: queue_manager.get_skipped_history().clone(),
    };
    tracing::trace!("GET /api/queue/state: Returning state: {:?}", q_state);
    Json(q_state)
}

#[get("/announcements/status")]
pub async fn get_announcement_status(
    state: &State<AppState>,
) -> Json<announcements::manager::AnnouncementStatus> {
    let announcement_manager = state.announcement_manager.lock().await;
    Json(announcement_manager.get_current_status().await)
}

#[post("/announcements/next")]
pub async fn manual_advance_announcement(state: &State<AppState>) -> status::Accepted<String> {
    let mut announcement_manager = state.announcement_manager.lock().await;
    announcement_manager.manual_advance_slot().await;
    status::Accepted("Announcement advancement triggered".to_string()) // Directly pass String
}
