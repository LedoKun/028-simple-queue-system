// src/main.rs

//! The main entry point for the Queue Calling System backend application.
//!
//! This module initializes the logging system, loads application configuration,
//! ensures necessary directories for caching and announcements exist,
//! sets up the Axum web framework with API routes and file servers,
//! and launches the Axum server.

use axum::{serve, Router};
use queue_calling_system::api;
use queue_calling_system::config::AppConfig;
use queue_calling_system::setup_logging;
use queue_calling_system::state::AppState;
use std::fs;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::services::ServeDir;

type AppResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

/// The asynchronous main function that bootstraps and runs the Axum web server.
///
/// This function performs the following steps:
/// 1. Initializes the `tracing` logging system.
/// 2. Loads the application configuration from environment variables or a configuration file.
/// 3. Ensures the necessary directories for GTTS cache and custom announcements exist,
///    creating them if they don't. The application will panic if these directories
///    cannot be created as they are essential for operation.
/// 4. Initializes the shared application state (`AppState`), which holds common resources
///    like the queue management system.
/// 5. Configures Axum to serve API routes, the GTTS cache files, and static public files.
/// 6. Launches the Axum server, binding to the configured address and port.
///
/// # Returns
/// - `Ok(())` if the server starts and runs successfully.
/// - `Err` if there's an error while starting the Axum server.
#[tokio::main]
async fn main() -> AppResult<()> {
    // Initialize the tracing subscriber. This should be done as early as possible.
    setup_logging();
    tracing::info!("Starting Queue Calling System backend...");

    // Load application configuration from environment variables or a configuration file.
    let config = AppConfig::load();
    tracing::info!("Configuration loaded: {:?}", config);
    tracing::debug!("Loaded config details: {:?}", config); // Use debug for detailed config output

    // --- Ensure required directories exist ---
    // These directories are crucial for the application's operation,
    // so a failure to create them will result in a panic.
    tracing::info!("Ensuring required directories exist for caching and announcements...");

    // 1. gtts_cache_base_path: Directory for storing cached Google Text-to-Speech audio files.
    let gtts_cache_path = &config.gtts_cache_base_path;
    tracing::debug!(
        "Checking/creating GTTS cache directory at: {:?}",
        gtts_cache_path
    );
    if let Err(e) = fs::create_dir_all(gtts_cache_path) {
        // Log an error and panic if the directory cannot be created.
        // This is a critical failure as TTS playback relies on this path.
        tracing::error!(
            "CRITICAL: Failed to ensure gtts_cache directory exists at {:?}: {}",
            gtts_cache_path,
            e
        );
        panic!("Failed to ensure essential gtts_cache directory exists. Shutting down.");
    } else {
        tracing::info!(
            "Successfully ensured gtts_cache directory exists at {:?}",
            gtts_cache_path
        );
    }

    // 2. announcements_base_path: Directory for storing custom announcement audio files.
    // This path is derived from `serve_dir_path` and `announcements_audio_sub_path`.
    let announcements_path = config.announcement_audio_base_path();
    tracing::debug!(
        "Checking/creating announcements directory at: {:?}",
        announcements_path
    );
    if let Err(e) = fs::create_dir_all(&announcements_path) {
        // Log an error and panic if the directory cannot be created.
        // This is also a critical failure as custom announcements rely on this path.
        tracing::error!(
            "CRITICAL: Failed to ensure announcements directory exists at {:?}: {}",
            announcements_path,
            e
        );
        panic!("Failed to ensure essential announcements directory exists. Shutting down.");
    } else {
        tracing::info!(
            "Successfully ensured announcements directory exists at {:?}",
            announcements_path
        );
    }

    // 3. banner_base_path: Directory for storing banner assets used by signage clients.
    let banner_path = config.banner_base_path();
    tracing::debug!("Checking/creating banner directory at: {:?}", banner_path);
    if let Err(e) = fs::create_dir_all(&banner_path) {
        tracing::error!(
            "CRITICAL: Failed to ensure banner directory exists at {:?}: {}",
            banner_path,
            e
        );
        panic!("Failed to ensure essential banner directory exists. Shutting down.");
    } else {
        tracing::info!(
            "Successfully ensured banner directory exists at {:?}",
            banner_path
        );
    }
    tracing::info!("Directory setup complete.");
    // --- End of directory creation ---

    // Initialize the shared application state.
    // This state will be managed by Axum and made available to route handlers.
    let app_state = Arc::new(AppState::new(config.clone()).await);
    tracing::info!("Application state initialized.");
    tracing::debug!("AppState created with config: {:?}", config);

    // Prepare static services served by Axum.

    // Path for serving cached TTS audio files.
    let tts_cache_base_path_for_fileserver = config.gtts_cache_base_path.clone();
    // Web mount point for TTS cache. Ensure it starts with a '/' for correct URL handling.
    let mut tts_cache_web_mount_point = config.tts_cache_web_path.clone();
    if !tts_cache_web_mount_point.is_empty() && !tts_cache_web_mount_point.starts_with('/') {
        tts_cache_web_mount_point.insert(0, '/');
        tracing::debug!(
            "Adjusted TTS cache web mount point to: {}",
            tts_cache_web_mount_point
        );
    }
    if tts_cache_web_mount_point.is_empty() {
        tracing::warn!("TTS cache web mount point was empty; defaulting to '/tts_cache'.");
        tts_cache_web_mount_point = "/tts_cache".to_string();
    }

    let tts_cache_service = ServeDir::new(tts_cache_base_path_for_fileserver.clone());
    tracing::info!(
        "Configured TTS cache static service from {:?} at mount point '{}'",
        tts_cache_base_path_for_fileserver,
        tts_cache_web_mount_point
    );

    let public_files_service = ServeDir::new(&config.serve_dir_path);
    tracing::info!(
        "Configured public static service from {:?} at mount point '/'",
        config.serve_dir_path
    );

    let server_address = config.server_socket_addr();
    tracing::info!("Server binding to {}", server_address);

    let api_router = api::router().with_state(app_state.clone());

    let app = Router::new()
        .nest("/api", api_router)
        .nest_service(tts_cache_web_mount_point.as_str(), tts_cache_service)
        .nest_service("/", public_files_service);

    tracing::info!("Launching Axum server...");
    let listener = TcpListener::bind(server_address).await?;
    serve(listener, app.into_make_service()).await?;
    Ok(())
}
