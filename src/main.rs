// src/main.rs
use queue_calling_system::api::routes;
use queue_calling_system::config::AppConfig;
use queue_calling_system::setup_logging;
use queue_calling_system::state::AppState;
use rocket::{fs::FileServer, Build, Rocket}; // Ensure Rocket, Build are imported
use std::fs; // Import the 'fs' module for filesystem operations

#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
    setup_logging();
    tracing::info!("Starting Queue Calling System backend...");

    let config = AppConfig::load();
    tracing::info!("Configuration loaded: {:?}", config);

    // --- Create directories if they don't exist ---
    tracing::info!("Ensuring required directories exist...");

    // 1. gtts_cache_base_path
    let gtts_cache_path = &config.gtts_cache_base_path;
    if let Err(e) = fs::create_dir_all(gtts_cache_path) {
        tracing::error!(
            "Failed to ensure gtts_cache directory exist at {:?}: {}",
            gtts_cache_path,
            e
        );
        // Depending on the criticality, you might want to panic here or handle the error appropriately
        panic!("Failed to ensure essential gtts_cache directory exist. Shutting down.");
    } else {
        tracing::info!(
            "Successfully ensured gtts_cache directory exist exists at {:?}",
            gtts_cache_path
        );
    }

    // 2. serve_dir_path + announcements_sub_path
    //    Note: The AppConfig already has a helper for this: config.announcement_base_path()
    let announcements_path = config.announcement_base_path();
    if let Err(e) = fs::create_dir_all(&announcements_path) {
        tracing::error!(
            "Failed to ensure announcements directory exist at {:?}: {}",
            announcements_path,
            e
        );
        // Depending on the criticality, you might want to panic here
        panic!("Failed to ensure essential announcements directory exist. Shutting down.");
    } else {
        tracing::info!(
            "Successfully ensured announcements directory exist exists at {:?}",
            announcements_path
        );
    }
    tracing::info!("Directory setup complete.");
    // --- End of directory creation ---

    let app_state = AppState::new(config.clone()).await;
    tracing::info!("Application state initialized.");

    let tts_cache_base_path_for_fileserver = config.gtts_cache_base_path.clone(); // Use a clone for FileServer if original is consumed
    let mut tts_cache_web_mount_point = config.tts_cache_web_path.clone();
    if !tts_cache_web_mount_point.is_empty() && !tts_cache_web_mount_point.starts_with('/') {
        tts_cache_web_mount_point.insert(0, '/');
    }

    let tts_fileserver = FileServer::from(&tts_cache_base_path_for_fileserver).rank(5);
    let public_fileserver = FileServer::from(&config.serve_dir_path).rank(10);

    let rocket_build = rocket::build()
        .mount(
            "/api",
            rocket::routes![
                routes::sse_events,
                routes::trigger_tts,
                routes::get_supported_languages,
                routes::get_ordered_supported_languages,
                routes::queue_call,
                routes::skip_call,
                routes::complete_call,
                routes::force_skip_new_call,
                routes::get_queue_state,
                routes::get_announcement_status,
                routes::manual_advance_announcement,
            ],
        )
        .mount(&tts_cache_web_mount_point, tts_fileserver)
        .mount("/", public_fileserver)
        .manage(app_state);

    tracing::info!("Launching Rocket server...");
    let server_address = config.server_socket_addr();
    tracing::info!("Server binding to {}", server_address);

    let rocket_instance: Rocket<Build> = rocket_build;

    rocket_instance
        .configure(rocket::Config {
            address: server_address.ip(),
            port: server_address.port(),
            ..rocket::Config::default()
        })
        .launch()
        .await
        .map(|_rocket_ignited_instance| ())
}
