// src/lib.rs

//! The `queue_calling_system` crate provides a backend solution for managing
//! and announcing calls in a queueing system.
//!
//! It integrates with various components including:
//! - **API Endpoints:** For interacting with the queue (calling, skipping, completing, etc.).
//! - **Text-to-Speech (TTS):** For generating audio announcements of call numbers/details.
//! - **Announcements Playback:** Managing the playback of generated or custom audio files.
//! - **Server-Sent Events (SSE):** For real-time updates to connected frontend clients.
//! - **Configuration Management:** Loading and managing application settings.
//!
//! This crate defines core data structures like `Call` and `AppEvent`, and
//! provides the main application state (`AppState`) and a logging setup function.

// Declare public modules, making their contents accessible to users of this crate.
pub mod announcements;
pub mod api;
pub mod application;
pub mod config;
pub mod queue;
pub mod sse;
pub mod state;
pub mod tts;

use announcements::manager::AnnouncementStatus;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tracing::info; // Import the info macro from tracing

/// Represents a single call in the queueing system.
///
/// This struct holds all necessary information for a call, including its
/// unique identifier, location, and the time it was generated.
///
/// It implements `Debug`, `Clone`, `Serialize`, `Deserialize`, `PartialEq`, and `Eq`
/// to facilitate debugging, copying, serialization to/from various formats (like JSON),
/// and comparison.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Call {
    /// A unique identifier for this specific call instance within the system.
    pub id: String,
    /// The original identifier provided for the call, which might be duplicated
    /// if a call is re-queued.
    pub original_id: String,
    /// The physical or logical location associated with the call (e.g., "Counter 1", "Department B").
    pub location: String,
    /// The timestamp when this call was created or added to the queue, in UTC.
    pub timestamp: chrono::DateTime<Utc>,
}

/// Defines the types of events that can be broadcast throughout the application
/// via the event bus and sent to SSE clients.
///
/// Events are tagged with a `type` field and their data is in a `content` field
/// when serialized to JSON, providing a clear structure for frontend clients.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum AppEvent {
    /// An event indicating that the state of the call queue has been updated.
    /// Contains the current `QueueState`.
    QueueUpdate(crate::queue::QueueState),
    /// An event indicating a change in the status of the announcement system.
    /// Contains the current `AnnouncementStatus`.
    AnnouncementStatus(AnnouncementStatus),
    /// An event signaling that a Text-to-Speech audio generation is complete.
    /// Includes details about the generated audio file(s).
    TTSComplete {
        /// The unique ID of the TTS request or associated call.
        id: String,
        /// The location associated with the TTS audio.
        location: String,
        /// The language of the generated TTS audio (e.g., "en-US", "th-TH").
        lang: String,
        /// The URLs where the generated audio files can be accessed.
        /// For online TTS, this will contain a single URL.
        /// For stem audio fallback, this will contain multiple URLs in playback order.
        audio_urls: Vec<String>,
    },
}

// Re-export key structs for easier access when using the crate.
// This allows users to import `AppConfig` directly from `queue_calling_system`
// instead of `queue_calling_system::config::AppConfig`.
pub use application::{AnnouncementService, QueueService, TtsService};
pub use config::AppConfig;
pub use queue::QueueState;
pub use state::AppState;

/// Initializes the `tracing` logging subscriber for the application.
///
/// This function sets up a formatter for log messages and configures the
/// filtering of messages based on the `RUST_LOG` environment variable.
/// It should be called once at the very beginning of the application's
/// execution (e.g., in `main.rs`).
pub fn setup_logging() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    info!("Logging initialized."); // Use tracing::info for logging confirmation
}
