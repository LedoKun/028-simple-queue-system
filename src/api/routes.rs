// src/api/routes.rs

//! Defines the HTTP API routes for the Queue Calling System.
//!
//! This module uses Rocket to expose various endpoints for:
//! - Triggering Text-to-Speech (TTS) generation.
//! - Retrieving supported TTS languages.
//! - Managing the call queue (adding, skipping, completing calls).
//! - Force-skipping new calls.
//! - Providing real-time updates via Server-Sent Events (SSE).
//! - Checking announcement status and triggering manual advancements.
//!
//! Each route is associated with a specific HTTP method and path, handling
//! request parsing, interaction with the application state (`AppState`),
//! and sending appropriate responses.

use regex; // Import the regex crate for input validation
use rocket::{
    get, http::Status, post, response::status, response::stream::EventStream, serde::json::Json,
    State,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::broadcast;
use tokio::time as TokioTime;
use tracing::{debug, error, info, trace, warn}; // Import tracing macros

use crate::announcements::{self, ManualTriggerError};
use crate::queue::QueueState;
use crate::sse::manager::SSEManager;
use crate::{AppEvent, AppState}; // Ensure AppEvent and AppState are imported

/// Request data structure for adding or updating a call in the queue.
///
/// Expected to be sent as JSON in the request body.
#[derive(Deserialize, Debug)]
#[serde(crate = "rocket::serde")] // Required for Rocket's serde integration
pub struct AddCallRequest {
    /// The original, human-readable identifier for the call (e.g., "A1", "B123").
    /// Validation enforces an uppercase letter followed by digits.
    pub original_id: String,
    /// The location associated with the call (e.g., "5", "Counter 10").
    /// Validation enforces digits only.
    pub location: String,
}

/// Request data structure for manually triggering Text-to-Speech generation.
///
/// Expected to be sent as JSON in the request body.
#[derive(Deserialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct TriggerTTSRequest {
    /// The unique ID of the call to generate TTS for (e.g., "A01", "B100").
    id: String,
    /// The location associated with the call (e.g., "5").
    location: String,
    /// The language code for TTS generation (e.g., "th", "en-uk").
    lang: String,
}

/// Request data structure for forcing a call to be directly added to the skipped list.
///
/// Expected to be sent as JSON in the request body.
#[derive(Deserialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct ForceSkipRequest {
    /// The original, human-readable identifier for the call to be skipped (e.g., "A1", "Z99").
    /// Validation enforces an uppercase letter followed by digits.
    original_id: String,
    /// The location associated with the skipped call (e.g., "5", "10").
    /// Validation enforces digits only.
    location: String,
}

/// Standard error response payload for API endpoints.
#[derive(Serialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct ErrorResponse {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    remaining_seconds: Option<u64>,
}

/// Rocket route for manually triggering Text-to-Speech generation for a given call.
///
/// Expects a JSON payload with `id`, `location`, and `lang`.
/// This can be used to re-announce a specific call in a specific language.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
/// - `request`: A JSON payload deserialized into `TriggerTTSRequest`.
///
/// # Returns
/// - `status::Accepted` (202) with a success message if TTS generation is triggered.
/// - `status::BadRequest` (400) with an error message if the language is unsupported or
///   another issue prevents triggering.
#[post("/tts/trigger", data = "<request>")]
pub async fn trigger_tts(
    state: &State<AppState>,
    request: Json<TriggerTTSRequest>,
) -> Result<status::Accepted<String>, status::BadRequest<String>> {
    info!(
        "Manual TTS trigger request received for ID: {}, Location: {}, Lang: {}",
        request.id, request.location, request.lang
    );
    // Lock the TTS manager to perform the operation.
    let tts_manager = state.tts_manager.lock().await;
    match tts_manager.trigger_tts_generation(
        request.id.clone(),
        request.location.clone(),
        request.lang.clone(),
    ) {
        Ok(_) => {
            debug!(
                "TTS generation successfully triggered for ID: {}, Lang: {}",
                request.id, request.lang
            );
            Ok(status::Accepted("TTS generation triggered".to_string()))
        }
        Err(e) => {
            error!(
                "Failed to trigger TTS generation for ID: {}, Lang: {}: {}",
                request.id, request.lang, e
            );
            Err(status::BadRequest(e)) // `e` is already a String
        }
    }
}

/// Rocket route for retrieving a map of supported TTS languages.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
///
/// # Returns
/// A JSON object where keys are language codes (e.g., "th", "en-uk") and values are
/// their display names (e.g., "Thai", "British English").
#[get("/tts/languages")]
pub async fn get_supported_languages(state: &State<AppState>) -> Json<HashMap<String, String>> {
    info!("Received request for supported languages map.");
    // Lock the TTS manager to access its supported languages.
    let tts_manager = state.tts_manager.lock().await;
    let languages = tts_manager.get_supported_languages().clone();
    debug!("Returning supported languages: {:?}", languages);
    Json(languages)
}

/// Rocket route for retrieving an ordered list of supported TTS language codes.
///
/// The order is as defined in the application configuration.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
///
/// # Returns
/// A JSON array of language codes (e.g., `["th", "en-uk"]`).
#[get("/tts/ordered-languages")]
pub fn get_ordered_supported_languages(state: &State<AppState>) -> Json<Vec<String>> {
    info!("Received request for ordered supported languages.");
    let ordered_langs = state.config.ordered_supported_language_codes();
    debug!("Returning ordered supported languages: {:?}", ordered_langs);
    Json(ordered_langs)
}

/// Rocket route for establishing a Server-Sent Events (SSE) connection.
///
/// Clients connecting to this endpoint will receive real-time updates about
/// queue changes (`QueueUpdate`), announcement status (`AnnouncementStatus`),
/// and TTS completion (`TTSComplete`).
/// It also sends periodic "keep-alive" comments to prevent connection timeouts.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`
///   (specifically, the `event_bus_sender` and `sse_keep_alive_interval`).
///
/// # Returns
/// An `EventStream` that continuously yields `rocket::response::stream::Event`s.
#[get("/events")]
pub fn sse_events(state: &State<AppState>) -> EventStream![] {
    let sender = state.event_bus_sender.clone();
    let keep_alive_interval = state.config.sse_keep_alive_interval();
    info!("New SSE client connected to /api/events.");

    // Rocket's `EventStream!` macro creates an asynchronous stream.
    EventStream! {
        // Subscribe to the global event broadcast channel.
        let mut receiver = sender.subscribe();
        // Set up a Tokio interval for sending keep-alive comments.
        let mut interval = TokioTime::interval(keep_alive_interval);
        interval.tick().await; // Initial tick to make the first interval immediate
        // If the interval misses ticks (e.g., due to heavy load), it should skip them.
        interval.set_missed_tick_behavior(TokioTime::MissedTickBehavior::Skip);

        // Main loop for the SSE stream.
        loop {
            tokio::select! {
                // Branch 1: Receive a new application event from the broadcast channel.
                event_result = receiver.recv() => {
                    match event_result {
                        Ok(event) => {
                             debug!("SSE: Received AppEvent for broadcast: {:?}", event);
                             // Format the AppEvent into a RocketEvent for the SSE stream.
                             if let Some(rocket_event) = SSEManager::format_app_event(&event) {
                                 yield rocket_event; // Yield the formatted event to the client.
                             } else {
                                  error!("SSE: Failed to format AppEvent for SSE client (event was: {:?}).", event);
                             }
                        },
                        Err(broadcast::error::RecvError::Closed) => {
                            // The sender side of the broadcast channel has been dropped,
                            // indicating application shutdown or severe error.
                            info!("SSE: Broadcast channel closed for a client connection, disconnecting.");
                            break; // Exit the loop, closing the SSE connection.
                        },
                        Err(broadcast::error::RecvError::Lagged(skipped)) => {
                            // The client's receiver buffer overflowed, meaning it missed events.
                            warn!("SSE: Client lagged, skipped {} events. Consider increasing SSE_EVENT_BUFFER_SIZE or client processing speed.", skipped);
                        }
                    }
                },
                // Branch 2: Interval tick for sending keep-alive messages.
                _ = interval.tick() => {
                    // Send a comment event, which is ignored by clients but keeps the connection alive.
                    debug!("SSE: Sending keep-alive comment.");
                    yield rocket::response::stream::Event::comment("keep-alive");
                }
            }
        }
    }
}

/// Rocket route for adding a new call or recalling/updating an existing one.
///
/// Expects a JSON payload with `original_id` and `location`.
/// Performs validation on the input format.
/// Updates the queue state, broadcasts a `QueueUpdate` event, and triggers TTS generation.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
/// - `call_request_data`: A JSON payload deserialized into `AddCallRequest`.
///
/// # Returns
/// - `status::Accepted` (202) with a confirmation message if the call is added/updated and TTS initiated.
/// - `status::BadRequest` (400) with an error message if input validation fails or
///   there's an unexpected issue with queue processing.
#[post("/queue/add", data = "<call_request_data>")]
pub async fn queue_call(
    state: &State<AppState>,
    call_request_data: Json<AddCallRequest>,
) -> Result<status::Accepted<String>, status::BadRequest<String>> {
    let call_info = call_request_data.into_inner();
    info!(
        "/api/queue/add: Received call data: original_id='{}', location='{}'",
        call_info.original_id, call_info.location
    );

    // --- Input Validation ---
    // Stricter Validation for Identifier (e.g., A1, Z99)
    // Must be an uppercase letter followed by one or more digits.
    let identifier_pattern = regex::Regex::new(r"^[A-Z][0-9]+$")
        .expect("Failed to compile identifier regex pattern. This is a critical internal error.");
    if !identifier_pattern.is_match(&call_info.original_id) {
        warn!(
            "Invalid original_id format received: '{}'. Expected uppercase letter followed by digits.",
            call_info.original_id
        );
        return Err(status::BadRequest(format!("Invalid Identifier format. Must be an uppercase letter followed by digits (e.g., A1, Z99). Received: {}", call_info.original_id)));
    }

    // Stricter Validation for Location (e.g., 5, 10, 101)
    // Must be digits only.
    let location_pattern = regex::Regex::new(r"^[0-9]+$")
        .expect("Failed to compile location regex pattern. This is a critical internal error.");
    if !location_pattern.is_match(&call_info.location) {
        warn!(
            "Invalid location format received: '{}'. Expected digits only.",
            call_info.location
        );
        return Err(status::BadRequest(format!(
            "Invalid Location format. Must be digits only (e.g., 5, 10). Received: {}",
            call_info.location
        )));
    }
    // --- End Input Validation ---

    // Lock the queue manager to modify its state.
    let mut queue_manager = state.queue_manager.lock().await;
    // Add the call, which handles moving the previous current call to history.
    if let Some(current_call_ref) =
        queue_manager.add_call(call_info.original_id.clone(), call_info.location.clone())
    {
        // Clone the current call for broadcasting and TTS triggering,
        // as the manager holds the canonical reference.
        let current_call_owned = current_call_ref.clone();
        info!(
            "/api/queue/add: Call '{}' (Original: '{}', Location: '{}') is now current.",
            current_call_owned.id, current_call_owned.original_id, current_call_owned.location
        );

        // Create a snapshot of the current queue state.
        let current_q_state = QueueState {
            current_call: Some(current_call_owned.clone()),
            completed_history: queue_manager.get_completed_history().clone(),
            skipped_history: queue_manager.get_skipped_history().clone(),
        };
        // Release the queue_manager lock as soon as the state is captured.
        drop(queue_manager);

        info!(
            "/api/queue/add: Broadcasting QueueUpdate: {:?}",
            current_q_state
        );
        // Broadcast the updated queue state to all SSE clients.
        if let Err(e) = state
            .event_bus_sender
            .send(AppEvent::QueueUpdate(current_q_state))
        {
            // Log as debug if send fails, as it might just mean no active listeners.
            debug!("Could not broadcast QueueUpdate after add action (error: {}). No active listeners?", e);
        }

        // Trigger TTS generation for the new current call.
        // Lock the TTS manager.
        let tts_manager_guard = state.tts_manager.lock().await;
        let ordered_langs = state.config.ordered_supported_language_codes();
        if !ordered_langs.is_empty() {
            info!(
                "Call {} is current. Triggering TTS for languages: {:?}",
                current_call_owned.id, ordered_langs
            );
            // Iterate through supported languages and trigger TTS for each.
            for lang_code in ordered_langs {
                if let Err(e) = tts_manager_guard.trigger_tts_generation(
                    current_call_owned.id.clone(),
                    current_call_owned.location.clone(),
                    lang_code.clone(),
                ) {
                    // Log errors but don't fail the entire request if one TTS fails.
                    error!(
                        "Failed to trigger TTS generation task for lang '{}' (call ID {}): {}",
                        lang_code, current_call_owned.id, e
                    );
                }
            }
        } else {
            warn!(
                "No supported languages configured for TTS for call ID: {}. No TTS will be generated.",
                current_call_owned.id
            );
        }
        // Release the TTS manager lock.
        drop(tts_manager_guard);

        Ok(status::Accepted(format!(
            "Call {} with location {} is now current. TTS initiated.",
            current_call_owned.original_id, current_call_owned.location
        )))
    } else {
        // This case should ideally not happen if `add_call` always returns `Some` on success.
        error!("/api/queue/add: queue_manager.add_call unexpectedly returned None for original_id '{}'. This indicates a logical flaw in QueueManager.", call_info.original_id);
        Err(status::BadRequest(
            "Failed to process the call. An unexpected server error occurred.".to_string(),
        ))
    }
}

/// Rocket route for skipping the `current_call`.
///
/// Moves the current call to the `skipped_history`.
/// Updates the queue state and broadcasts a `QueueUpdate` event.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
///
/// # Returns
/// - `status::Accepted` (202) with a message confirming the skip or indicating no call was current.
#[post("/queue/skip")]
pub async fn skip_call(state: &State<AppState>) -> status::Accepted<String> {
    let mut queue_manager = state.queue_manager.lock().await;
    info!("/api/queue/skip: Attempting to skip current call.");
    let message: String;
    // Attempt to skip the current call.
    if let Some(skipped_call) = queue_manager.skip_current_call() {
        info!("/api/queue/skip: Call '{}' was skipped.", skipped_call.id);
        message = format!(
            "Call {} (Location {}) skipped successfully.",
            skipped_call.original_id, skipped_call.location
        );
    } else {
        warn!("/api/queue/skip: No current call to skip. Request had no effect.");
        message = "No current call to skip.".to_string();
    }

    // Create a snapshot of the current queue state.
    let current_q_state = QueueState {
        current_call: queue_manager.get_current_call().cloned(), // Clone `Option<Call>`
        completed_history: queue_manager.get_completed_history().clone(),
        skipped_history: queue_manager.get_skipped_history().clone(),
    };
    // Release the queue_manager lock.
    drop(queue_manager);

    info!(
        "/api/queue/skip: Broadcasting QueueUpdate after skip action: {:?}",
        current_q_state
    );
    // Broadcast the updated queue state.
    if let Err(e) = state
        .event_bus_sender
        .send(AppEvent::QueueUpdate(current_q_state))
    {
        debug!(
            "Could not broadcast QueueUpdate after skip action (error: {}). No active listeners?",
            e
        );
    }
    status::Accepted(message)
}

/// Rocket route for marking the `current_call` as completed.
///
/// Moves the current call to the `completed_history`.
/// Updates the queue state and broadcasts a `QueueUpdate` event.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
///
/// # Returns
/// - `status::Accepted` (202) with a message confirming completion or indicating no call was current.
#[post("/queue/complete")]
pub async fn complete_call(state: &State<AppState>) -> status::Accepted<String> {
    let mut queue_manager = state.queue_manager.lock().await;
    info!("/api/queue/complete: Attempting to complete current call.");
    let message: String;
    // Attempt to complete the current call.
    if let Some(completed_call) = queue_manager.complete_current_call() {
        info!(
            "/api/queue/complete: Call '{}' was completed.",
            completed_call.id
        );
        message = format!(
            "Call {} (Location {}) completed successfully.",
            completed_call.original_id, completed_call.location
        );
    } else {
        warn!("/api/queue/complete: No current call to complete. Request had no effect.");
        message = "No current call to complete.".to_string();
    }

    // Create a snapshot of the current queue state.
    let current_q_state = QueueState {
        current_call: queue_manager.get_current_call().cloned(),
        completed_history: queue_manager.get_completed_history().clone(),
        skipped_history: queue_manager.get_skipped_history().clone(),
    };
    // Release the queue_manager lock.
    drop(queue_manager);

    info!(
        "/api/queue/complete: Broadcasting QueueUpdate after complete action: {:?}",
        current_q_state
    );
    // Broadcast the updated queue state.
    if let Err(e) = state
        .event_bus_sender
        .send(AppEvent::QueueUpdate(current_q_state))
    {
        debug!("Could not broadcast QueueUpdate after complete action (error: {}). No active listeners?", e);
    }
    status::Accepted(message)
}

/// Rocket route for adding a new call directly to the skipped history, bypassing the current call slot.
///
/// Expects a JSON payload with `original_id` and `location`.
/// Performs validation on the input format.
/// Updates the queue state and broadcasts a `QueueUpdate` event.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
/// - `request_data`: A JSON payload deserialized into `ForceSkipRequest`.
///
/// # Returns
/// - `status::Accepted` (202) with a confirmation message if the call was added to skipped history.
/// - `status::BadRequest` (400) with an error message if input validation fails or
///   there's an unexpected issue with queue processing.
#[post("/queue/force_skip", data = "<request_data>")]
pub async fn force_skip_new_call(
    state: &State<AppState>,
    request_data: Json<ForceSkipRequest>,
) -> Result<status::Accepted<String>, status::BadRequest<String>> {
    let call_info = request_data.into_inner();
    info!(
        "/api/queue/force_skip: Received data for direct skip: original_id='{}', location='{}'",
        call_info.original_id, call_info.location
    );

    // --- Input Validation ---
    // Stricter Validation for Identifier (e.g., A1, Z99)
    let identifier_pattern = regex::Regex::new(r"^[A-Z][0-9]+$")
        .expect("Failed to compile identifier regex pattern. This is a critical internal error.");
    if !identifier_pattern.is_match(&call_info.original_id) {
        warn!(
            "Invalid original_id format received for force_skip: '{}'. Expected uppercase letter followed by digits.",
            call_info.original_id
        );
        return Err(status::BadRequest(format!("Invalid Identifier format. Must be an uppercase letter followed by digits (e.g., A1, Z99). Received: {}", call_info.original_id)));
    }

    // Stricter Validation for Location (e.g., 5, 10)
    let location_pattern = regex::Regex::new(r"^[0-9]+$")
        .expect("Failed to compile location regex pattern. This is a critical internal error.");
    if !location_pattern.is_match(&call_info.location) {
        warn!(
            "Invalid location format received for force_skip: '{}'. Expected digits only.",
            call_info.location
        );
        return Err(status::BadRequest(format!(
            "Invalid Location format. Must be digits only (e.g., 5, 10). Received: {}",
            call_info.location
        )));
    }
    // --- End Input Validation ---

    let mut queue_manager = state.queue_manager.lock().await;
    // Add the call directly to the skipped history.
    if let Some(skipped_call_data) = queue_manager
        .add_to_skipped_directly(call_info.original_id.clone(), call_info.location.clone())
    {
        // Create a snapshot of the current queue state.
        let current_q_state = QueueState {
            current_call: queue_manager.get_current_call().cloned(),
            completed_history: queue_manager.get_completed_history().clone(),
            skipped_history: queue_manager.get_skipped_history().clone(),
        };
        // Release the queue_manager lock.
        drop(queue_manager);

        info!(
            "/api/queue/force_skip: Broadcasting QueueUpdate: {:?}",
            current_q_state
        );
        // Broadcast the updated queue state.
        if let Err(e) = state
            .event_bus_sender
            .send(AppEvent::QueueUpdate(current_q_state))
        {
            debug!("Could not broadcast QueueUpdate after force_skip action (error: {}). No active listeners?", e);
        }
        Ok(status::Accepted(format!(
            "Call {} with location {} added directly to skipped list.",
            skipped_call_data.original_id, skipped_call_data.location
        )))
    } else {
        // This indicates a problem within `add_to_skipped_directly` if it returns `None` unexpectedly.
        error!(
            "/api/queue/force_skip: add_to_skipped_directly failed for original_id '{}'. This indicates a logical flaw in QueueManager.",
            call_info.original_id
        );
        Err(status::BadRequest(format!(
            "Failed to add call {} to skipped list. An unexpected server error occurred.",
            call_info.original_id
        )))
    }
}

/// Rocket route for retrieving the current state of the call queue.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
///
/// # Returns
/// A JSON object representing the `QueueState`, including the current call and histories.
#[get("/queue/state")]
pub async fn get_queue_state(state: &State<AppState>) -> Json<QueueState> {
    debug!("GET /api/queue/state: Fetching current queue state.");
    let queue_manager = state.queue_manager.lock().await;
    // Construct the QueueState snapshot.
    let q_state = QueueState {
        current_call: queue_manager.get_current_call().cloned(), // Clone `Option<Call>`
        completed_history: queue_manager.get_completed_history().clone(),
        skipped_history: queue_manager.get_skipped_history().clone(),
    };
    // Release the queue_manager lock.
    drop(queue_manager);
    trace!("GET /api/queue/state: Returning state: {:?}", q_state);
    Json(q_state)
}

/// Rocket route for retrieving the current status of the announcement system.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
///
/// # Returns
/// A JSON object representing the `AnnouncementStatus`.
#[get("/announcements/status")]
pub async fn get_announcement_status(
    state: &State<AppState>,
) -> Json<announcements::manager::AnnouncementStatus> {
    info!("GET /api/announcements/status: Fetching announcement status.");
    let announcement_manager = state.announcement_manager.lock().await;
    let status = announcement_manager.get_current_status().await;
    debug!("Returning announcement status: {:?}", status);
    Json(status)
}

/// Rocket route for manually advancing the announcement slot.
///
/// This can be used to skip the current announcement or force the next one.
///
/// # Arguments
/// - `state`: A Rocket `State` managed by the application, providing access to `AppState`.
///
/// # Returns
/// `status::Accepted` (202) with a confirmation message.
#[post("/announcements/next")]
pub async fn manual_advance_announcement(
    state: &State<AppState>,
) -> Result<status::Accepted<String>, status::Custom<Json<ErrorResponse>>> {
    info!("POST /api/announcements/next: Triggering manual announcement advancement.");
    let mut announcement_manager = state.announcement_manager.lock().await;
    let manual_result = announcement_manager.manual_advance_slot().await;
    drop(announcement_manager);

    match manual_result {
        Ok(_) => {
            debug!("Manual announcement advancement triggered successfully.");
            Ok(status::Accepted(
                "Announcement advancement triggered".to_string(),
            ))
        }
        Err(err) => {
            warn!("Manual announcement advancement failed: {}", err);
            Err(manual_trigger_error_to_response(&err))
        }
    }
}

/// Rocket route for manually triggering a specific announcement slot by ID.
#[post("/announcements/trigger/<slot_id>")]
pub async fn manual_trigger_specific_announcement(
    state: &State<AppState>,
    slot_id: &str,
) -> Result<status::Accepted<String>, status::Custom<Json<ErrorResponse>>> {
    info!(
        "POST /api/announcements/trigger/{}: Triggering manual announcement by slot ID.",
        slot_id
    );
    let mut announcement_manager = state.announcement_manager.lock().await;
    let manual_result = announcement_manager.manual_trigger_slot(slot_id).await;
    drop(announcement_manager);

    match manual_result {
        Ok(_) => {
            debug!(
                "Manual announcement trigger succeeded for slot '{}'.",
                slot_id
            );
            Ok(status::Accepted(format!(
                "Announcement '{}' triggered",
                slot_id
            )))
        }
        Err(err) => {
            warn!(
                "Manual announcement trigger for slot '{}' failed: {}",
                slot_id, err
            );
            Err(manual_trigger_error_to_response(&err))
        }
    }
}

fn manual_trigger_error_to_response(
    err: &ManualTriggerError,
) -> status::Custom<Json<ErrorResponse>> {
    match err {
        ManualTriggerError::CooldownActive { remaining_seconds } => status::Custom(
            Status::TooManyRequests,
            Json(ErrorResponse {
                error: err.to_string(),
                remaining_seconds: Some(*remaining_seconds),
            }),
        ),
        ManualTriggerError::SlotNotFound(_) => status::Custom(
            Status::NotFound,
            Json(ErrorResponse {
                error: err.to_string(),
                remaining_seconds: None,
            }),
        ),
        ManualTriggerError::NoSlotsAvailable => status::Custom(
            Status::ServiceUnavailable,
            Json(ErrorResponse {
                error: err.to_string(),
                remaining_seconds: None,
            }),
        ),
    }
}
