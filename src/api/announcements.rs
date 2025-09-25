use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use serde::Serialize;
use tracing::{debug, info, warn};

use crate::announcements::{self, ManualTriggerError};
use crate::AppState;

/// Standard error response payload for announcement endpoints.
#[derive(Serialize, Debug)]
pub struct ErrorResponse {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    remaining_seconds: Option<u64>,
}

pub async fn get_announcement_status(
    State(state): State<Arc<AppState>>,
) -> Json<announcements::manager::AnnouncementStatus> {
    info!("GET /api/announcements/status: Fetching announcement status.");
    let status = state.announcements.current_status().await;
    debug!("Returning announcement status: {:?}", status);
    Json(status)
}

pub async fn manual_advance_announcement(
    State(state): State<Arc<AppState>>,
) -> Result<(StatusCode, String), (StatusCode, Json<ErrorResponse>)> {
    info!("POST /api/announcements/next: Triggering manual announcement advancement.");
    match state.announcements.manual_advance().await {
        Ok(_) => {
            debug!("Manual announcement advancement triggered successfully.");
            Ok((
                StatusCode::ACCEPTED,
                "Announcement advancement triggered".to_string(),
            ))
        }
        Err(err) => {
            warn!("Manual announcement advancement failed: {}", err);
            Err(manual_trigger_error_to_response(&err))
        }
    }
}

pub async fn manual_trigger_specific_announcement(
    State(state): State<Arc<AppState>>,
    Path(slot_id): Path<String>,
) -> Result<(StatusCode, String), (StatusCode, Json<ErrorResponse>)> {
    info!(
        "POST /api/announcements/trigger/{}: Triggering manual announcement by slot ID.",
        slot_id
    );
    match state.announcements.manual_trigger(&slot_id).await {
        Ok(_) => {
            debug!(
                "Manual announcement trigger succeeded for slot '{}'.",
                slot_id
            );
            Ok((
                StatusCode::ACCEPTED,
                format!("Announcement '{}' triggered", slot_id),
            ))
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

fn manual_trigger_error_to_response(err: &ManualTriggerError) -> (StatusCode, Json<ErrorResponse>) {
    match err {
        ManualTriggerError::CooldownActive { remaining_seconds } => (
            StatusCode::TOO_MANY_REQUESTS,
            Json(ErrorResponse {
                error: err.to_string(),
                remaining_seconds: Some(*remaining_seconds),
            }),
        ),
        ManualTriggerError::SlotNotFound(_) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: err.to_string(),
                remaining_seconds: None,
            }),
        ),
        ManualTriggerError::NoSlotsAvailable => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ErrorResponse {
                error: err.to_string(),
                remaining_seconds: None,
            }),
        ),
    }
}
