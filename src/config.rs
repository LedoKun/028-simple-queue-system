// src/config.rs

//! Defines the application configuration structure (`AppConfig`) and provides
//! utilities for loading configuration from environment variables.
//!
//! This module leverages the `envconfig` crate to automatically map environment
//! variables to struct fields, simplifying configuration management. It also
//! includes helper methods for deriving specific paths or durations from the
//! loaded configuration.

use envconfig::Envconfig;
use std::env;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::time::Duration;
use tracing::{debug, error, info};

/// `AppConfig` represents the complete configuration for the Queue Calling System application.
///
/// This struct uses `envconfig` to load settings from environment variables,
/// providing default values where specified.
///
/// It is designed to be `Debug` (for logging), `Clone` (for easy sharing, especially via `Arc`),
/// and `Envconfig` (for automatic environment variable parsing).
#[derive(Envconfig, Debug, Clone)]
pub struct AppConfig {
    /// The IP address on which the HTTP server will bind.
    ///
    /// Corresponds to the `SERVER_ADDRESS` environment variable.
    /// Default: `0.0.0.0` (binds to all available network interfaces).
    #[envconfig(from = "SERVER_ADDRESS", default = "0.0.0.0")]
    pub server_address: IpAddr,

    /// The port on which the HTTP server will listen.
    ///
    /// Corresponds to the `SERVER_PORT` environment variable.
    /// Default: `3000`.
    #[envconfig(from = "SERVER_PORT", default = "3000")]
    pub server_port: u16,

    /// The maximum number of completed or skipped calls to retain in the queue's history.
    ///
    /// Corresponds to the `MAX_HISTORY_SIZE` environment variable.
    /// Default: `5`.
    #[envconfig(from = "MAX_HISTORY_SIZE", default = "5")]
    pub max_history_size: usize,

    /// The maximum number of explicitly skipped calls to retain in a separate history.
    ///
    /// Corresponds to the `MAX_SKIPPED_HISTORY_SIZE` environment variable.
    /// Default: `5`.
    #[envconfig(from = "MAX_SKIPPED_HISTORY_SIZE", default = "5")]
    pub max_skipped_history_size: usize,

    /// The base directory from which static files (e.g., frontend assets, custom announcements)
    /// will be served by the HTTP layer.
    ///
    /// Corresponds to the `SERVE_DIR_PATH` environment variable.
    /// Default: `./public`.
    #[envconfig(from = "SERVE_DIR_PATH", default = "./public")]
    pub serve_dir_path: PathBuf,

    /// The sub-path within `SERVE_DIR_PATH` where custom announcement audio files are stored.
    /// This path will be joined with `serve_dir_path` to form the full path.
    ///
    /// Corresponds to the `ANNOUNCEMENTS_AUDIO_SUB_PATH` environment variable.
    /// Default: `media/announcements`.
    #[envconfig(from = "ANNOUNCEMENTS_AUDIO_SUB_PATH", default = "media/announcements")]
    pub announcements_audio_sub_path: PathBuf,

    /// The sub-path within `SERVE_DIR_PATH` where banner media files are stored.
    /// Banners are now decoupled from announcement audio to allow separate rotation timings.
    ///
    /// Corresponds to the `BANNERS_SUB_PATH` environment variable.
    /// Default: `media/banners`.
    #[envconfig(from = "BANNERS_SUB_PATH", default = "media/banners")]
    pub banners_sub_path: PathBuf,

    /// The interval in seconds after which the announcement system will automatically cycle
    /// to the next announcement, if configured to do so.
    ///
    /// Corresponds to the `ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS` environment variable.
    /// Default: `1200` (20 minutes).
    #[envconfig(from = "ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS", default = "1200")]
    pub announcement_auto_cycle_interval_seconds: u64,

    /// The cooldown period in seconds after a manual announcement trigger, during which
    /// another manual trigger will be ignored.
    ///
    /// Corresponds to the `ANNOUNCEMENT_MANUAL_TRIGGER_COOLDOWN_SECONDS` environment variable.
    /// Default: `5` seconds.
    #[envconfig(from = "ANNOUNCEMENT_MANUAL_TRIGGER_COOLDOWN_SECONDS", default = "5")]
    pub announcement_manual_trigger_cooldown_seconds: u64,

    /// The interval in seconds between banner rotations on the signage display.
    ///
    /// Corresponds to the `BANNER_ROTATION_INTERVAL_SECONDS` environment variable.
    /// Default: `10` seconds.
    #[envconfig(from = "BANNER_ROTATION_INTERVAL_SECONDS", default = "10")]
    pub banner_rotation_interval_seconds: u64,

    /// The base directory used for caching generated Text-to-Speech (TTS) audio files.
    /// This directory must be writable by the application.
    ///
    /// Corresponds to the `GTTS_CACHE_BASE_PATH` environment variable.
    /// Default: `/tmp/gtts_audio_cache`.
    #[envconfig(from = "GTTS_CACHE_BASE_PATH", default = "/tmp/gtts_audio_cache")]
    pub gtts_cache_base_path: PathBuf,

    /// The maximum number of files to keep in the TTS audio cache.
    /// Oldest files will be removed when this limit is exceeded.
    ///
    /// Corresponds to the `TTS_CACHE_MAXIMUM_FILES` environment variable.
    /// Default: `500`.
    #[envconfig(from = "TTS_CACHE_MAXIMUM_FILES", default = "500")]
    pub tts_cache_maximum_files: usize,

    /// The timeout in seconds for requests made to external Text-to-Speech (TTS) services.
    ///
    /// Corresponds to the `TTS_EXTERNAL_SERVICE_TIMEOUT_SECONDS` environment variable.
    /// Default: `5`.
    #[envconfig(from = "TTS_EXTERNAL_SERVICE_TIMEOUT_SECONDS", default = "30")]
    pub tts_external_service_timeout_seconds: u64,

    /// A comma-separated string of supported TTS languages, optionally with a display name.
    /// Format: "code1:DisplayName1,code2:DisplayName2,...".
    /// Example: "th:Thai,en-GB:British English".
    ///
    /// Corresponds to the `TTS_SUPPORTED_LANGUAGES` environment variable.
    /// Default: `"th:Thai,en-GB:British English"`.
    #[envconfig(
        from = "TTS_SUPPORTED_LANGUAGES",
        default = "th:Thai,en-GB:British English"
    )]
    pub tts_supported_languages: String,

    /// The interval in seconds for sending keep-alive messages to Server-Sent Events (SSE) clients.
    /// This helps prevent connection timeouts.
    ///
    /// Corresponds to the `SSE_KEEP_ALIVE_INTERVAL_SECONDS` environment variable.
    /// Default: `15`.
    #[envconfig(from = "SSE_KEEP_ALIVE_INTERVAL_SECONDS", default = "15")]
    pub sse_keep_alive_interval_seconds: u64,

    /// The buffer size for the Server-Sent Events (SSE) broadcast channel.
    /// This determines how many past events a new subscriber can receive.
    ///
    /// Corresponds to the `SSE_EVENT_BUFFER_SIZE` environment variable.
    /// Default: `200`.
    #[envconfig(from = "SSE_EVENT_BUFFER_SIZE", default = "200")]
    pub sse_event_buffer_size: usize,

    /// The web-accessible path for serving cached TTS audio files.
    /// This path is mounted by the static file service.
    ///
    /// Corresponds to the `TTS_CACHE_WEB_PATH` environment variable.
    /// Default: `/tts_cache`.
    #[envconfig(from = "TTS_CACHE_WEB_PATH", default = "/tts_cache")]
    pub tts_cache_web_path: String,
}

impl AppConfig {
    /// Loads the application configuration from environment variables.
    ///
    /// This function first attempts to load `.env` file for local development,
    /// then uses `envconfig` to read and parse environment variables into the
    /// `AppConfig` struct. If any required variables are missing and no default
    /// is provided, or if parsing fails, the application will panic.
    ///
    /// # Returns
    /// A `Self` (AppConfig) instance populated with values from the environment
    /// or their defaults.
    ///
    /// # Panics
    /// If there is a critical error loading or parsing the environment variables,
    /// indicating a misconfiguration that prevents the application from starting.
    pub fn load() -> Self {
        // Attempt to load environment variables from a .env file.
        // This is primarily for local development environments and will fail gracefully
        // if no .env file is found or cannot be read.
        dotenv::dotenv().ok();
        info!("Attempting to load application configuration from environment variables...");

        // Initialize AppConfig from environment variables.
        // The `Envconfig` derive macro handles parsing and defaults.
        match Self::init_from_env() {
            Ok(mut config) => {
                // Canonicalize serve_dir_path so that downstream path operations (e.g., strip_prefix)
                // operate on consistent absolute paths. If canonicalization fails (e.g., path does not yet
                // exist), fall back to joining with the current working directory to obtain an absolute path.
                config.serve_dir_path = match config.serve_dir_path.canonicalize() {
                    Ok(canonical) => canonical,
                    Err(_) => env::current_dir()
                        .map(|cwd| cwd.join(&config.serve_dir_path))
                        .unwrap_or_else(|_| config.serve_dir_path.clone()),
                };
                info!("Application configuration loaded successfully.");
                debug!("Loaded configuration: {:#?}", config); // Use debug for detailed config dump
                config
            }
            Err(e) => {
                // If configuration loading fails, it's a critical error.
                // Log the error and then panic to prevent the application from
                // running with an incomplete or incorrect configuration.
                error!("CRITICAL: Failed to load application configuration: {}", e);
                panic!("Failed to load application configuration. Ensure all required environment variables are set or have valid defaults.");
            }
        }
    }

    /// Constructs the full, absolute path to the base directory for custom announcement audio.
    ///
    /// This path is formed by joining `serve_dir_path` with `announcements_audio_sub_path`.
    ///
    /// # Returns
    /// A `PathBuf` representing the combined base path for announcement audio.
    pub fn announcement_audio_base_path(&self) -> PathBuf {
        let full_path = self.serve_dir_path.join(&self.announcements_audio_sub_path);
        debug!("Calculated announcement_audio_base_path: {:?}", full_path);
        full_path
    }

    /// Constructs the full, absolute path to the base directory for banner media.
    ///
    /// # Returns
    /// A `PathBuf` representing the combined base path for banners.
    pub fn banner_base_path(&self) -> PathBuf {
        let full_path = self.serve_dir_path.join(&self.banners_sub_path);
        debug!("Calculated banner_base_path: {:?}", full_path);
        full_path
    }

    /// Combines the `server_address` and `server_port` into a `SocketAddr`.
    ///
    /// # Returns
    /// A `SocketAddr` suitable for binding a server.
    pub fn server_socket_addr(&self) -> SocketAddr {
        let socket_addr = SocketAddr::new(self.server_address, self.server_port);
        debug!("Calculated server_socket_addr: {}", socket_addr);
        socket_addr
    }

    /// Converts the `tts_external_service_timeout_seconds` into a `Duration`.
    ///
    /// # Returns
    /// A `Duration` representing the TTS external service timeout.
    pub fn tts_external_service_timeout(&self) -> Duration {
        let duration = Duration::from_secs(self.tts_external_service_timeout_seconds);
        debug!("TTS external service timeout duration: {:?}", duration);
        duration
    }

    /// Converts the `sse_keep_alive_interval_seconds` into a `Duration`.
    ///
    /// # Returns
    /// A `Duration` for SSE keep-alive intervals.
    pub fn sse_keep_alive_interval(&self) -> Duration {
        let duration = Duration::from_secs(self.sse_keep_alive_interval_seconds);
        debug!("SSE keep-alive interval duration: {:?}", duration);
        duration
    }

    /// Parses the `tts_supported_languages` string and returns a `Vec` of language codes
    /// in their defined order.
    ///
    /// This function handles the format "code:DisplayName,code2:DisplayName2".
    /// It extracts only the language code part (before the colon, if present).
    ///
    /// # Example
    /// If `tts_supported_languages` is `"th:Thai,en-GB:British English,fr:French"`,
    /// this method returns `vec!["th", "en-uk", "fr"]`.
    ///
    /// # Returns
    /// A `Vec<String>` containing the ordered language codes. Returns an empty vector
    /// if the `tts_supported_languages` string is empty or contains only whitespace/empty entries.
    pub fn ordered_supported_language_codes(&self) -> Vec<String> {
        if self.tts_supported_languages.is_empty() {
            debug!("tts_supported_languages is empty, returning empty Vec.");
            return Vec::new();
        }

        let codes: Vec<String> = self
            .tts_supported_languages
            .split(',') // Split by comma to get individual language pairs
            .filter_map(|s_pair| {
                let lang_part = s_pair.trim(); // Trim whitespace from each pair
                if lang_part.is_empty() {
                    debug!("Skipping empty language pair part: '{}'", s_pair);
                    None // Skip empty parts (e.g., from "a,,b")
                } else {
                    // Take only the code part (before the first ':')
                    let code = lang_part.split(':').next().map(normalize_language_code);
                    debug!(
                        "Parsed language code '{}' from '{}'",
                        code.as_ref().unwrap_or(&"N/A".to_string()),
                        lang_part
                    );
                    code
                }
            })
            .filter(|s_code| {
                let is_not_empty = !s_code.is_empty();
                if !is_not_empty {
                    debug!("Filtering out empty language code after parsing.");
                }
                is_not_empty
            }) // Ensure the extracted code itself isn't empty
            .collect();

        debug!("Extracted ordered language codes: {:?}", codes);
        codes
    }
}

fn normalize_language_code(raw: &str) -> String {
    if raw.eq_ignore_ascii_case("en-GB") {
        "en-uk".to_string()
    } else {
        raw.to_string()
    }
}

// Module for unit tests related to AppConfig
#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    /// Helper function to unset an environment variable for a test.
    fn unset_env(key: &str) {
        env::remove_var(key);
        // Optional: Add a tracing debug log for test setup
        debug!("Unset environment variable: {}", key);
    }

    /// Test case to ensure default TTS_SUPPORTED_LANGUAGES are loaded correctly
    /// when the environment variable is not set.
    #[test]
    fn test_default_config_loading_for_ordered_langs() {
        // Unset the environment variable to ensure the default value is used.
        unset_env("TTS_SUPPORTED_LANGUAGES");
        // Load the configuration. This will use the default for TTS_SUPPORTED_LANGUAGES.
        let config = AppConfig::load();
        // Assert that the parsed ordered language codes match the default.
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["th", "en-uk"]
        );
        info!("test_default_config_loading_for_ordered_langs passed.");
    }

    /// Comprehensive test suite for the `ordered_supported_language_codes` method,
    /// covering various input scenarios.
    #[test]
    fn test_ordered_supported_language_codes() {
        // Initialize a mutable AppConfig instance for testing.
        // Other fields are filled with dummy but valid values as they are not
        // under test for this specific function.
        let mut config = AppConfig {
            server_address: "0.0.0.0".parse().unwrap(),
            server_port: 3000,
            max_history_size: 5,
            max_skipped_history_size: 5,
            serve_dir_path: PathBuf::from("./public"),
            announcements_audio_sub_path: PathBuf::from("media"),
            banners_sub_path: PathBuf::from("media"),
            banner_rotation_interval_seconds: 10,
            announcement_auto_cycle_interval_seconds: 1200,
            announcement_manual_trigger_cooldown_seconds: 60,
            gtts_cache_base_path: PathBuf::from("/tmp/cache"),
            tts_cache_maximum_files: 100,
            tts_external_service_timeout_seconds: 15,
            tts_supported_languages: String::new(), // This will be set for each test case
            sse_keep_alive_interval_seconds: 15,
            sse_event_buffer_size: 200,
            tts_cache_web_path: String::from("/tts_cache"),
        };

        // Test case 1: Multiple languages with display names.
        config.tts_supported_languages = "th:Thai,en-GB:British English,fr:French".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["th".to_string(), "en-uk".to_string(), "fr".to_string()],
            "Test Case 1 failed: Multiple languages with display names"
        );
        debug!("Test Case 1 passed.");

        // Test case 2: Mixed (some with display names, some without).
        config.tts_supported_languages = "es,pt:Portuguese".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["es".to_string(), "pt".to_string()],
            "Test Case 2 failed: Mixed language definitions"
        );
        debug!("Test Case 2 passed.");

        // Test case 3: Single language code.
        config.tts_supported_languages = "de".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["de".to_string()],
            "Test Case 3 failed: Single language code"
        );
        debug!("Test Case 3 passed.");

        // Test case 4: Empty string.
        config.tts_supported_languages = "".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            Vec::<String>::new(),
            "Test Case 4 failed: Empty string input"
        );
        debug!("Test Case 4 passed.");

        // Test case 5: String with leading/trailing commas and spaces.
        config.tts_supported_languages = " ,, ja:Japanese, ".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["ja".to_string()],
            "Test Case 5 failed: String with extra commas and spaces"
        );
        debug!("Test Case 5 passed.");

        // Test case 6: Language code with a hyphen (e.g., locale code).
        config.tts_supported_languages = "fr-CA:French (Canada)".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["fr-CA".to_string()],
            "Test Case 6 failed: Language code with hyphen"
        );
        debug!("Test Case 6 passed.");

        info!("All `test_ordered_supported_language_codes` test cases passed.");
    }
}
