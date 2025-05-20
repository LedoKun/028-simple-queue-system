// src/state.rs

//! Defines the shared application state (`AppState`) for the Queue Calling System.
//!
//! This module encapsulates all the essential managers and configuration that need
//! to be shared across various parts of the application, particularly Rocket's
//! request handlers. It uses `Arc` for shared ownership and `tokio::sync::Mutex`
//! for safe concurrent access to mutable state.

use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::sync::Mutex;
use tracing::{debug, info}; // Import tracing macros

// Import the configuration struct
use crate::config::AppConfig;

// Import the actual manager structs that AppState will hold
use crate::announcements::manager::AnnouncementManager;
use crate::queue::manager::QueueManager;
use crate::sse::manager::SSEManager;
use crate::tts::manager::TTSManager;

// Import the AppEvent enum which defines the types of events broadcast across the system
use crate::AppEvent;

/// `AppState` holds all the shared, globally accessible resources and managers
/// for the Queue Calling System.
///
/// This struct is cloned and managed by Rocket, allowing its contents to be
/// injected into route handlers as a request guard.
///
/// **Fields:**
/// - `config`: Application configuration, wrapped in `Arc` for shared, immutable access.
/// - `queue_manager`: Manages the queue of calls, wrapped in `Arc<Mutex>` for thread-safe
///   mutable access.
/// - `announcement_manager`: Handles the playback and scheduling of audio announcements,
///   wrapped in `Arc<Mutex>` for thread-safe mutable access.
/// - `tts_manager`: Manages Text-to-Speech operations, wrapped in `Arc<Mutex>` for
///   thread-safe mutable access.
/// - `sse_manager`: Manages Server-Sent Events connections, allowing real-time updates
///   to connected clients, wrapped in `Arc<Mutex>` for thread-safe mutable access.
/// - `event_bus_sender`: A broadcast sender for the `AppEvent` enum, used to dispatch
///   events to various parts of the application and SSE clients.
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
    /// Creates a new instance of the application state, initializing all its managers.
    ///
    /// This is an asynchronous function because the `AnnouncementManager` might perform
    /// asynchronous operations during its initialization (e.g., loading initial data or
    /// setting up background tasks).
    ///
    /// # Arguments
    /// - `config`: The `AppConfig` instance containing application-wide settings.
    ///
    /// # Returns
    /// A new `AppState` instance with all its components initialized and ready for use.
    pub async fn new(config: AppConfig) -> Self {
        info!("Initializing application state components...");

        // Create a broadcast channel for application-wide events.
        // The buffer size is configurable via `config.sse_event_buffer_size`.
        let (event_bus_sender, _event_bus_receiver) =
            broadcast::channel::<AppEvent>(config.sse_event_buffer_size);
        debug!(
            "AppEvent broadcast channel created with buffer size: {}",
            config.sse_event_buffer_size
        );

        // Wrap the configuration in an `Arc` for shared, immutable access by managers.
        let config_arc = Arc::new(config);

        // Initialize QueueManager: Handles the core logic of managing call queues.
        let queue_manager_instance = QueueManager::new(
            config_arc.max_history_size, // Max number of past calls to keep in history.
            config_arc.max_skipped_history_size, // Max number of skipped calls to keep.
        );
        info!("QueueManager initialized.");
        debug!(
            "QueueManager created with max_history_size: {} and max_skipped_history_size: {}",
            config_arc.max_history_size, config_arc.max_skipped_history_size
        );

        // Initialize AnnouncementManager: Manages audio announcements playback and scheduling.
        // It requires access to the shared configuration and the event bus sender.
        let announcement_manager_instance = AnnouncementManager::new(
            Arc::clone(&config_arc),  // Clone Arc for immutable config access.
            event_bus_sender.clone(), // Clone sender for event dispatch.
        )
        .await; // Await because AnnouncementManager::new is async.
        info!("AnnouncementManager initialized.");

        // Initialize TTSManager: Handles Text-to-Speech conversions and caching.
        // It also needs the shared configuration and can dispatch events.
        let tts_manager_instance =
            TTSManager::new(Arc::clone(&config_arc), event_bus_sender.clone());
        info!("TTSManager initialized.");

        // Initialize SSEManager: Manages Server-Sent Events connections to clients.
        // It's responsible for sending real-time updates.
        let sse_manager_instance = SSEManager::new();
        info!("SSEManager initialized.");

        // Construct the AppState struct with all initialized components.
        // Managers are wrapped in `Arc<Mutex>` to allow safe concurrent mutation
        // from different request handlers and background tasks.
        AppState {
            config: config_arc,
            queue_manager: Arc::new(Mutex::new(queue_manager_instance)),
            announcement_manager: announcement_manager_instance, // Already Arc<Mutex> from its `new` fn
            tts_manager: Arc::new(Mutex::new(tts_manager_instance)),
            sse_manager: Arc::new(Mutex::new(sse_manager_instance)),
            event_bus_sender,
        }
    }
}
