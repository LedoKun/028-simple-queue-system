use rocket::{get, http::Status, post, response::status, serde::json::Json, State};
use serde::Serialize;
use tracing::{debug, info, warn};

use crate::announcements::{self, ManualTriggerError};
use crate::AppState;

/// Standard error response payload for announcement endpoints.
#[derive(Serialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct ErrorResponse {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    remaining_seconds: Option<u64>,
}

#[get("/announcements/status")]
pub async fn get_announcement_status(
    state: &State<AppState>,
) -> Json<announcements::manager::AnnouncementStatus> {
    info!("GET /api/announcements/status: Fetching announcement status.");
    let status = state.announcements.current_status().await;
    debug!("Returning announcement status: {:?}", status);
    Json(status)
}

#[post("/announcements/next")]
pub async fn manual_advance_announcement(
    state: &State<AppState>,
) -> Result<status::Accepted<String>, status::Custom<Json<ErrorResponse>>> {
    info!("POST /api/announcements/next: Triggering manual announcement advancement.");
    match state.announcements.manual_advance().await {
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

#[post("/announcements/trigger/<slot_id>")]
pub async fn manual_trigger_specific_announcement(
    state: &State<AppState>,
    slot_id: &str,
) -> Result<status::Accepted<String>, status::Custom<Json<ErrorResponse>>> {
    info!(
        "POST /api/announcements/trigger/{}: Triggering manual announcement by slot ID.",
        slot_id
    );
    match state.announcements.manual_trigger(slot_id).await {
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
