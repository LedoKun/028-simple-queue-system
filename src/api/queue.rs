use std::sync::{Arc, OnceLock};

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use regex::Regex;
use serde::Deserialize;
use tracing::{debug, error, info, warn};

use crate::{AppState, QueueState};

/// Request data structure for adding or updating a call in the queue.
#[derive(Deserialize, Debug)]
pub struct AddCallRequest {
    /// Human readable identifier (e.g. "A1", "B123").
    pub original_id: String,
    /// Location associated with the call (digits only).
    pub location: String,
}

/// Request data structure for forcing a call into the skipped history.
#[derive(Deserialize, Debug)]
pub struct ForceSkipRequest {
    pub original_id: String,
    pub location: String,
}

const IDENTIFIER_FORMAT_MESSAGE: &str =
    "Invalid Identifier format. Must be an uppercase letter followed by digits (e.g., A1, Z99).";
const LOCATION_FORMAT_MESSAGE: &str = "Invalid Location format. Must be digits only (e.g., 5, 10).";

fn identifier_pattern() -> &'static Regex {
    static PATTERN: OnceLock<Regex> = OnceLock::new();
    PATTERN.get_or_init(|| Regex::new(r"^[A-Z][0-9]+$").expect("identifier regex must compile"))
}

fn location_pattern() -> &'static Regex {
    static PATTERN: OnceLock<Regex> = OnceLock::new();
    PATTERN.get_or_init(|| Regex::new(r"^[0-9]+$").expect("location regex must compile"))
}

fn validate_identifier(original_id: &str) -> Result<(), String> {
    if identifier_pattern().is_match(original_id) {
        Ok(())
    } else {
        Err(format!(
            "{} Received: {}",
            IDENTIFIER_FORMAT_MESSAGE, original_id
        ))
    }
}

fn validate_location(location: &str) -> Result<(), String> {
    if location_pattern().is_match(location) {
        Ok(())
    } else {
        Err(format!(
            "{} Received: {}",
            LOCATION_FORMAT_MESSAGE, location
        ))
    }
}

pub async fn queue_call(
    State(state): State<Arc<AppState>>,
    Json(call_info): Json<AddCallRequest>,
) -> Result<(StatusCode, String), (StatusCode, String)> {
    info!(
        "/api/queue/add: Received call data: original_id='{}', location='{}'",
        call_info.original_id, call_info.location
    );

    if let Err(message) = validate_identifier(&call_info.original_id) {
        warn!(
            "Invalid original_id format received: '{}'. {}",
            call_info.original_id, IDENTIFIER_FORMAT_MESSAGE
        );
        return Err((StatusCode::BAD_REQUEST, message));
    }

    if let Err(message) = validate_location(&call_info.location) {
        warn!(
            "Invalid location format received: '{}'. {}",
            call_info.location, LOCATION_FORMAT_MESSAGE
        );
        return Err((StatusCode::BAD_REQUEST, message));
    }

    match state
        .queue
        .add_call(&call_info.original_id, &call_info.location)
        .await
    {
        Ok(current_call) => {
            info!(
                "/api/queue/add: Call '{}' (Original: '{}', Location: '{}') is now current.",
                current_call.id, current_call.original_id, current_call.location
            );
            Ok((
                StatusCode::ACCEPTED,
                format!(
                    "Call {} with location {} is now current. TTS initiated.",
                    current_call.original_id, current_call.location
                ),
            ))
        }
        Err(err) => {
            error!(
                "/api/queue/add: Queue service failed for original_id='{}': {}",
                call_info.original_id, err
            );
            Err((
                StatusCode::BAD_REQUEST,
                "Failed to process the call. An unexpected server error occurred.".to_string(),
            ))
        }
    }
}

/// Axum route for skipping the `current_call`.
pub async fn skip_call(State(state): State<Arc<AppState>>) -> (StatusCode, String) {
    info!("/api/queue/skip: Attempting to skip current call.");
    let message = if let Some(skipped_call) = state.queue.skip_current_call().await {
        info!("/api/queue/skip: Call '{}' was skipped.", skipped_call.id);
        format!(
            "Call {} (Location {}) skipped successfully.",
            skipped_call.original_id, skipped_call.location
        )
    } else {
        warn!("/api/queue/skip: No current call to skip. Request had no effect.");
        "No current call to skip.".to_string()
    };

    (StatusCode::ACCEPTED, message)
}

/// Axum route for marking the `current_call` as completed.
pub async fn complete_call(State(state): State<Arc<AppState>>) -> (StatusCode, String) {
    info!("/api/queue/complete: Attempting to complete current call.");
    let message = if let Some(completed_call) = state.queue.complete_current_call().await {
        info!(
            "/api/queue/complete: Call '{}' was completed.",
            completed_call.id
        );
        format!(
            "Call {} (Location {}) completed successfully.",
            completed_call.original_id, completed_call.location
        )
    } else {
        warn!("/api/queue/complete: No current call to complete. Request had no effect.");
        "No current call to complete.".to_string()
    };

    (StatusCode::ACCEPTED, message)
}

/// Axum route for adding a new call directly to the skipped history.
pub async fn force_skip_new_call(
    State(state): State<Arc<AppState>>,
    Json(call_info): Json<ForceSkipRequest>,
) -> Result<(StatusCode, String), (StatusCode, String)> {
    info!(
        "/api/queue/force_skip: Received data for direct skip: original_id='{}', location='{}'",
        call_info.original_id, call_info.location
    );

    if let Err(message) = validate_identifier(&call_info.original_id) {
        warn!(
            "Invalid original_id format received for force_skip: '{}'. {}",
            call_info.original_id, IDENTIFIER_FORMAT_MESSAGE
        );
        return Err((StatusCode::BAD_REQUEST, message));
    }

    if let Err(message) = validate_location(&call_info.location) {
        warn!(
            "Invalid location format received for force_skip: '{}'. {}",
            call_info.location, LOCATION_FORMAT_MESSAGE
        );
        return Err((StatusCode::BAD_REQUEST, message));
    }

    match state
        .queue
        .force_skip_call(&call_info.original_id, &call_info.location)
        .await
    {
        Ok(skipped_call) => {
            info!(
                "/api/queue/force_skip: Call '{}' added to skipped history.",
                skipped_call.id
            );
            Ok((
                StatusCode::ACCEPTED,
                format!(
                    "Call {} with location {} added directly to skipped list.",
                    skipped_call.original_id, skipped_call.location
                ),
            ))
        }
        Err(err) => {
            error!(
                "/api/queue/force_skip: queue service failed for original_id='{}': {}",
                call_info.original_id, err
            );
            Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Failed to add call {} to skipped list. An unexpected server error occurred.",
                    call_info.original_id
                ),
            ))
        }
    }
}

/// Axum route for retrieving the current state of the call queue.
pub async fn get_queue_state(State(state): State<Arc<AppState>>) -> Json<QueueState> {
    debug!("GET /api/queue/state: Fetching current queue state.");
    let q_state = state.queue.snapshot().await;
    debug!("GET /api/queue/state: Returning state: {:?}", q_state);
    Json(q_state)
}
