use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

use crate::application::translator::{TranslatorCallError, TranslatorStatus};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CallTranslatorRequest {
    pub location: String,
}

#[derive(Debug, Serialize)]
pub struct TranslatorSuccessResponse {
    pub message: String,
    pub status: TranslatorStatus,
}

#[derive(Debug, Serialize)]
pub struct TranslatorErrorResponse {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remaining_seconds: Option<u64>,
}

pub async fn get_translator_status(State(state): State<Arc<AppState>>) -> Json<TranslatorStatus> {
    info!("GET /api/translator/status: Fetching translator status");
    let status = state.translator.current_status().await;
    debug!("Translator status response: {:?}", status);
    Json(status)
}

pub async fn call_translator(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CallTranslatorRequest>,
) -> Result<
    (StatusCode, Json<TranslatorSuccessResponse>),
    (StatusCode, Json<TranslatorErrorResponse>),
> {
    info!(
        "POST /api/translator/call: Translator request received for location '{}'.",
        payload.location
    );

    match state.translator.trigger_call(&payload.location).await {
        Ok(outcome) => {
            let message = format!("Translator requested at counter {}.", outcome.location);
            info!(
                "Translator call accepted for location '{}'. Cooldown {}s initiated.",
                outcome.location, outcome.status.cooldown_seconds
            );
            Ok((
                StatusCode::ACCEPTED,
                Json(TranslatorSuccessResponse {
                    message,
                    status: outcome.status,
                }),
            ))
        }
        Err(TranslatorCallError::CooldownActive { remaining_seconds }) => {
            warn!(
                "Translator call rejected due to active cooldown ({}s remaining).",
                remaining_seconds
            );
            Err((
                StatusCode::TOO_MANY_REQUESTS,
                Json(TranslatorErrorResponse {
                    error: format!(
                        "Translator call is on cooldown. Please wait {} seconds.",
                        remaining_seconds
                    ),
                    remaining_seconds: Some(remaining_seconds),
                }),
            ))
        }
        Err(TranslatorCallError::MissingLocation) => {
            warn!("Translator call rejected: missing location value");
            Err((
                StatusCode::BAD_REQUEST,
                Json(TranslatorErrorResponse {
                    error: "Translator call requires a numeric counter location.".to_string(),
                    remaining_seconds: None,
                }),
            ))
        }
        Err(TranslatorCallError::InvalidLocation(invalid)) => {
            warn!(
                "Translator call rejected: invalid location '{}'. Digits only are supported.",
                invalid
            );
            Err((
                StatusCode::BAD_REQUEST,
                Json(TranslatorErrorResponse {
                    error: "Location must contain digits only (e.g., 5, 12).".to_string(),
                    remaining_seconds: None,
                }),
            ))
        }
    }
}
