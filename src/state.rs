// src/state.rs

//! Shared application state wiring for Rocket routes.

use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{debug, info};

use crate::application::{AnnouncementService, QueueService, TtsService};
use crate::config::AppConfig;
use crate::AppEvent;

/// Shared managers and configuration exposed to request handlers.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub queue: QueueService,
    pub announcements: AnnouncementService,
    pub tts: TtsService,
    pub event_bus_sender: broadcast::Sender<AppEvent>,
}

impl AppState {
    /// Initialise application state and supporting managers.
    pub async fn new(config: AppConfig) -> Self {
        info!("Initialising application state...");

        let (event_bus_sender, _event_bus_receiver) =
            broadcast::channel::<AppEvent>(config.sse_event_buffer_size);
        debug!(
            "Created AppEvent broadcast channel with buffer size {}",
            config.sse_event_buffer_size
        );

        let config_arc = Arc::new(config);

        let tts_service = TtsService::new(Arc::clone(&config_arc), event_bus_sender.clone());
        info!("TTS service initialised.");

        let queue_service = QueueService::new(
            Arc::clone(&config_arc),
            event_bus_sender.clone(),
            tts_service.clone(),
        );
        info!(
            "Queue service initialised with history limits completed={}, skipped={}",
            config_arc.max_history_size, config_arc.max_skipped_history_size
        );

        let announcement_service =
            AnnouncementService::new(Arc::clone(&config_arc), event_bus_sender.clone()).await;
        info!("Announcement service initialised.");

        AppState {
            config: config_arc,
            queue: queue_service,
            announcements: announcement_service,
            tts: tts_service,
            event_bus_sender,
        }
    }
}
