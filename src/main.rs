// src/main.rs

//! The main entry point for the Queue Calling System backend application.
//!
//! This module initializes the logging system, loads application configuration,
//! ensures necessary directories for caching and announcements exist,
//! sets up the Rocket web framework with API routes and file servers,
//! and launches the Rocket server.

use queue_calling_system::api;
use queue_calling_system::config::AppConfig;
use queue_calling_system::setup_logging;
use queue_calling_system::state::AppState;
use rocket::{fs::FileServer, Build, Rocket};
use std::fs;

/// The asynchronous main function that bootstraps and runs the Rocket web server.
///
/// This function performs the following steps:
/// 1. Initializes the `tracing` logging system.
/// 2. Loads the application configuration from environment variables or a configuration file.
/// 3. Ensures the necessary directories for GTTS cache and custom announcements exist,
///    creating them if they don't. The application will panic if these directories
///    cannot be created as they are essential for operation.
/// 4. Initializes the shared application state (`AppState`), which holds common resources
///    like the queue management system.
/// 5. Configures Rocket to serve API routes, the GTTS cache files, and static public files.
/// 6. Launches the Rocket server, binding to the configured address and port.
///
/// # Returns
/// - `Ok(())` if the server starts and runs successfully.
/// - `Err(rocket::Error)` if there's an error during Rocket's launch process.
#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
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
    // This state will be managed by Rocket and made available to route handlers.
    let app_state = AppState::new(config.clone()).await;
    tracing::info!("Application state initialized.");
    tracing::debug!("AppState created with config: {:?}", config); // Log AppState details if needed

    // Prepare paths for FileServers.
    // Rocket's `FileServer` serves static files from a specified directory.

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

    // Configure FileServer for GTTS cache.
    // `rank(5)` gives it a higher precedence than the public fileserver for overlapping paths.
    let tts_fileserver = FileServer::from(&tts_cache_base_path_for_fileserver).rank(5);
    tracing::info!(
        "Configured TTS cache FileServer from {:?} at mount point '{}'",
        tts_cache_base_path_for_fileserver,
        tts_cache_web_mount_point
    );

    // Configure FileServer for general public static files (e.g., frontend assets, announcements).
    // `rank(10)` gives it lower precedence than the TTS fileserver.
    let public_fileserver = FileServer::from(&config.serve_dir_path).rank(10);
    tracing::info!(
        "Configured Public FileServer from {:?} at mount point '/'",
        config.serve_dir_path
    );

    // Build the Rocket instance with all routes, file servers, and managed state.
    let rocket_build = rocket::build()
        .mount(
            "/api", // Mount all API routes under the "/api" base path.
            rocket::routes![
                api::sse_events,                      // Server-Sent Events for real-time updates.
                api::trigger_tts,                     // Endpoint to trigger TTS generation.
                api::get_supported_languages,         // Get list of supported TTS languages.
                api::get_ordered_supported_languages, // Get ordered list of supported TTS languages.
                api::queue_call,                      // Add a new call to the queue.
                api::skip_call,                       // Skip the current call without completing.
                api::complete_call,                   // Mark the current call as complete.
                api::force_skip_new_call,             // Force-skip the next incoming call.
                api::get_queue_state,                 // Get the current state of the call queue.
                api::get_announcement_status,         // Get status of ongoing announcements.
                api::manual_advance_announcement,     // Manually advance announcement playback.
                api::manual_trigger_specific_announcement, // Trigger a specific announcement slot.
            ],
        )
        // Mount the TTS cache FileServer at its configured web path.
        .mount(&tts_cache_web_mount_point, tts_fileserver)
        // Mount the public FileServer to serve static assets from the root.
        .mount("/", public_fileserver)
        // Make the AppState available to all request handlers.
        .manage(app_state);

    tracing::info!("Launching Rocket server...");
    let server_address = config.server_socket_addr();
    tracing::info!("Server binding to {}", server_address);

    // Final Rocket instance for launch.
    let rocket_instance: Rocket<Build> = rocket_build;

    // Configure and launch the Rocket server.
    // The `configure` method is used to apply runtime configuration like address and port.
    rocket_instance
        .configure(rocket::Config {
            address: server_address.ip(), // Set the binding IP address.
            port: server_address.port(),  // Set the binding port.
            ..rocket::Config::default()   // Use default values for other configuration options.
        })
        .launch() // Asynchronously launch the server.
        .await
        // Map the result to `()` as we only care about success or an error.
        .map(|_rocket_ignited_instance| ())
}
