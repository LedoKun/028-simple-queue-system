use std::collections::HashMap;

use rocket::{get, post, response::status, serde::json::Json, State};
use serde::Deserialize;
use tracing::{debug, error, info};

use crate::AppState;

/// Request data structure for manually triggering Text-to-Speech generation.
#[derive(Deserialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct TriggerTTSRequest {
    id: String,
    location: String,
    lang: String,
}

#[post("/tts/trigger", data = "<request>")]
pub async fn trigger_tts(
    state: &State<AppState>,
    request: Json<TriggerTTSRequest>,
) -> Result<status::Accepted<String>, status::BadRequest<String>> {
    let request = request.into_inner();
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
            Ok(status::Accepted("TTS generation triggered".to_string()))
        }
        Err(e) => {
            error!(
                "Failed to trigger TTS generation for ID: {}, Lang: {}: {}",
                id, lang, e
            );
            Err(status::BadRequest(e))
        }
    }
}

#[get("/tts/languages")]
pub async fn get_supported_languages(state: &State<AppState>) -> Json<HashMap<String, String>> {
    info!("Received request for supported languages map.");
    let languages = state.tts.supported_languages_map();
    debug!("Returning supported languages: {:?}", languages);
    Json(languages)
}

#[get("/tts/ordered-languages")]
pub fn get_ordered_supported_languages(state: &State<AppState>) -> Json<Vec<String>> {
    info!("Received request for ordered supported languages.");
    let ordered_langs = state.config.ordered_supported_language_codes();
    debug!("Returning ordered supported languages: {:?}", ordered_langs);
    Json(ordered_langs)
}
