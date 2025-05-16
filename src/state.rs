use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::sync::Mutex;

// Import the configuration struct
use crate::config::AppConfig; // Needed for AppState initialization via config

// Import the actual manager structs
use crate::announcements::manager::AnnouncementManager;
use crate::queue::manager::QueueManager;
use crate::sse::manager::SSEManager;
use crate::tts::manager::TTSManager;

// Import the AppEvent enum
use crate::AppEvent;

/// The shared application state.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub queue_manager: Arc<Mutex<QueueManager>>,
    pub announcement_manager: Arc<Mutex<AnnouncementManager>>,
    pub tts_manager: Arc<Mutex<TTSManager>>,
    pub sse_manager: Arc<Mutex<SSEManager>>,
    pub event_bus_sender: broadcast::Sender<AppEvent>,
}

impl AppState {
    /// Creates a new instance of the application state.
    pub async fn new(config: AppConfig) -> Self {
        let (event_bus_sender, _) = broadcast::channel::<AppEvent>(config.sse_event_buffer_size);
        let config_arc = Arc::new(config);

        let queue_manager_instance = QueueManager::new(
            config_arc.max_history_size,
            config_arc.max_skipped_history_size,
        );
        tracing::info!("QueueManager initialized.");

        let announcement_manager_instance =
            AnnouncementManager::new(Arc::clone(&config_arc), event_bus_sender.clone()).await;
        tracing::info!("AnnouncementManager initialized.");

        let tts_manager_instance =
            TTSManager::new(Arc::clone(&config_arc), event_bus_sender.clone());
        tracing::info!("TTSManager initialized.");

        // SSEManager::new no longer takes config, call with no arguments.
        let sse_manager_instance = SSEManager::new(); // Corrected: Argument removed
        tracing::info!("SSEManager initialized.");

        AppState {
            config: config_arc,
            queue_manager: Arc::new(Mutex::new(queue_manager_instance)),
            announcement_manager: announcement_manager_instance,
            tts_manager: Arc::new(Mutex::new(tts_manager_instance)),
            sse_manager: Arc::new(Mutex::new(sse_manager_instance)),
            event_bus_sender,
        }
    }
}
