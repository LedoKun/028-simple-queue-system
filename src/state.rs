// src/state.rs

//! Shared application state wiring for Rocket routes.

use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};
use tracing::{debug, info};

use crate::announcements::manager::AnnouncementManager;
use crate::config::AppConfig;
use crate::queue::manager::QueueManager;
use crate::tts::manager::TTSManager;
use crate::AppEvent;

/// Shared managers and configuration exposed to request handlers.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub queue_manager: Arc<Mutex<QueueManager>>,
    pub announcement_manager: Arc<Mutex<AnnouncementManager>>,
    pub tts_manager: Arc<Mutex<TTSManager>>,
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

        let queue_manager_instance = QueueManager::new(
            config_arc.max_history_size,
            config_arc.max_skipped_history_size,
        );
        info!("QueueManager initialised.");
        debug!(
            "QueueManager configured with history limits: completed={}, skipped={}",
            config_arc.max_history_size, config_arc.max_skipped_history_size
        );

        let announcement_manager_instance =
            AnnouncementManager::new(Arc::clone(&config_arc), event_bus_sender.clone()).await;
        info!("AnnouncementManager initialised.");

        let tts_manager_instance =
            TTSManager::new(Arc::clone(&config_arc), event_bus_sender.clone());
        info!("TTSManager initialised.");

        AppState {
            config: config_arc,
            queue_manager: Arc::new(Mutex::new(queue_manager_instance)),
            announcement_manager: announcement_manager_instance,
            tts_manager: Arc::new(Mutex::new(tts_manager_instance)),
            event_bus_sender,
        }
    }
}
