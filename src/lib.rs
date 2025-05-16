// src/lib.rs
pub mod announcements;
pub mod api;
pub mod config;
pub mod queue;
pub mod sse;
pub mod state;
pub mod tts;

use announcements::manager::AnnouncementStatus;
use chrono::Utc;
use serde::{Deserialize, Serialize};

// Add PartialEq and Eq here
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Call {
    pub id: String,
    pub original_id: String,
    pub location: String,
    pub timestamp: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum AppEvent {
    QueueUpdate(crate::queue::QueueState),
    AnnouncementStatus(AnnouncementStatus),
    TTSComplete {
        id: String,
        location: String,
        lang: String,
        audio_url: String,
    },
}

pub use config::AppConfig;
pub use queue::QueueState; // Make sure this points to the correct QueueState
pub use state::AppState;

pub fn setup_logging() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    tracing::info!("Logging initialized.");
}
