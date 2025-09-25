use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;
use tracing::{debug, error, info};

use crate::AppState;

/// Request data structure for manually triggering Text-to-Speech generation.
#[derive(Deserialize, Debug)]
pub struct TriggerTTSRequest {
    id: String,
    location: String,
    lang: String,
}

pub async fn trigger_tts(
    State(state): State<Arc<AppState>>,
    Json(request): Json<TriggerTTSRequest>,
) -> Result<(StatusCode, String), (StatusCode, String)> {
    info!(
        "Manual TTS trigger request received for ID: {}, Location: {}, Lang: {}",
        request.id, request.location, request.lang
    );

    let TriggerTTSRequest { id, location, lang } = request;

    match state.tts.trigger_generation(&id, &location, &lang) {
        Ok(_) => {
            debug!(
                "TTS generation successfully triggered for ID: {}, Lang: {}",
                id, lang
            );
            Ok((StatusCode::ACCEPTED, "TTS generation triggered".to_string()))
        }
        Err(e) => {
            error!(
                "Failed to trigger TTS generation for ID: {}, Lang: {}: {}",
                id, lang, e
            );
            Err((StatusCode::BAD_REQUEST, e))
        }
    }
}

pub async fn get_supported_languages(
    State(state): State<Arc<AppState>>,
) -> Json<HashMap<String, String>> {
    info!("Received request for supported languages map.");
    let languages = state.tts.supported_languages_map();
    debug!("Returning supported languages: {:?}", languages);
    Json(languages)
}

pub async fn get_ordered_supported_languages(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<String>> {
    info!("Received request for ordered supported languages.");
    let ordered_langs = state.config.ordered_supported_language_codes();
    debug!("Returning ordered supported languages: {:?}", ordered_langs);
    Json(ordered_langs)
}
