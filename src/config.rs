use envconfig::Envconfig;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::time::Duration;

#[derive(Envconfig, Debug, Clone)]
pub struct AppConfig {
    #[envconfig(from = "SERVER_ADDRESS", default = "0.0.0.0")]
    pub server_address: IpAddr,

    #[envconfig(from = "SERVER_PORT", default = "3000")]
    pub server_port: u16,

    #[envconfig(from = "MAX_HISTORY_SIZE", default = "5")]
    pub max_history_size: usize,

    #[envconfig(from = "MAX_SKIPPED_HISTORY_SIZE", default = "5")]
    pub max_skipped_history_size: usize,

    #[envconfig(from = "SERVE_DIR_PATH", default = "./public")]
    pub serve_dir_path: PathBuf,

    #[envconfig(from = "ANNOUNCEMENTS_SUB_PATH", default = "media/audios_and_banners")]
    pub announcements_sub_path: PathBuf,

    #[envconfig(from = "ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS", default = "1200")]
    pub announcement_auto_cycle_interval_seconds: u64,

    #[envconfig(from = "ANNOUNCEMENT_MANUAL_TRIGGER_COOLDOWN_SECONDS", default = "60")]
    pub announcement_manual_trigger_cooldown_seconds: u64,

    #[envconfig(from = "GTTS_CACHE_BASE_PATH", default = "/tmp/gtts_audio_cache")]
    pub gtts_cache_base_path: PathBuf,

    #[envconfig(from = "TTS_CACHE_MAXIMUM_FILES", default = "500")]
    pub tts_cache_maximum_files: usize,

    #[envconfig(from = "TTS_EXTERNAL_SERVICE_TIMEOUT_SECONDS", default = "5")]
    pub tts_external_service_timeout_seconds: u64,

    #[envconfig(
        from = "TTS_SUPPORTED_LANGUAGES",
        default = "th:Thai,en-uk:British English"
    )]
    pub tts_supported_languages: String,

    #[envconfig(from = "SSE_KEEP_ALIVE_INTERVAL_SECONDS", default = "15")]
    pub sse_keep_alive_interval_seconds: u64,

    #[envconfig(from = "SSE_EVENT_BUFFER_SIZE", default = "200")]
    pub sse_event_buffer_size: usize,

    #[envconfig(from = "TTS_CACHE_WEB_PATH", default = "/tts_cache")]
    pub tts_cache_web_path: String,
}

impl AppConfig {
    pub fn load() -> Self {
        dotenv::dotenv().ok();
        match Self::init_from_env() {
            // Assuming envconfig 0.10+
            Ok(config) => config,
            Err(e) => {
                eprintln!("Error loading configuration: {}", e);
                panic!("Failed to load application configuration. Ensure all required environment variables are set or have defaults.");
            }
        }
    }

    pub fn announcement_base_path(&self) -> PathBuf {
        self.serve_dir_path.join(&self.announcements_sub_path)
    }

    pub fn server_socket_addr(&self) -> SocketAddr {
        SocketAddr::new(self.server_address, self.server_port)
    }

    pub fn tts_external_service_timeout(&self) -> Duration {
        Duration::from_secs(self.tts_external_service_timeout_seconds)
    }

    pub fn sse_keep_alive_interval(&self) -> Duration {
        Duration::from_secs(self.sse_keep_alive_interval_seconds)
    }

    /// Parses TTS_SUPPORTED_LANGUAGES and returns a Vec of language codes
    /// in their defined order. E.g., "th:Thai,en-uk:British English" -> vec!["th", "en-uk"]
    pub fn ordered_supported_language_codes(&self) -> Vec<String> {
        if self.tts_supported_languages.is_empty() {
            return Vec::new();
        }
        self.tts_supported_languages
            .split(',')
            .filter_map(|s_pair| {
                let lang_part = s_pair.trim();
                if lang_part.is_empty() {
                    None
                } else {
                    // Take only the code part (before potential ':')
                    lang_part.split(':').next().map(str::to_string)
                }
            })
            .filter(|s_code| !s_code.is_empty()) // Ensure the code itself isn't empty
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    // fn set_env(key: &str, value: &str) {
    //     env::set_var(key, value);
    // }

    fn unset_env(key: &str) {
        env::remove_var(key);
    }

    #[test]
    fn test_default_config_loading_for_ordered_langs() {
        // Ensure TTS_SUPPORTED_LANGUAGES is unset to test its default
        unset_env("TTS_SUPPORTED_LANGUAGES");
        let config = AppConfig::load(); // Loads with defaults
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["th", "en-uk"]
        );
    }

    #[test]
    fn test_ordered_supported_language_codes() {
        let mut config = AppConfig {
            // Fill with dummy values for other fields or load defaults if easily testable
            server_address: "0.0.0.0".parse().unwrap(),
            server_port: 3000,
            max_history_size: 5,
            max_skipped_history_size: 5,
            serve_dir_path: PathBuf::from("./public"),
            announcements_sub_path: PathBuf::from("media"),
            announcement_auto_cycle_interval_seconds: 1200,
            announcement_manual_trigger_cooldown_seconds: 60,
            gtts_cache_base_path: PathBuf::from("/tmp/cache"),
            tts_cache_maximum_files: 100,
            tts_external_service_timeout_seconds: 15,
            tts_supported_languages: String::new(), // To be set per test case
            sse_keep_alive_interval_seconds: 15,
            sse_event_buffer_size: 200,
            tts_cache_web_path: String::from("/tts_cache"),
        };

        config.tts_supported_languages = "th:Thai,en-uk:British English,fr:French".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["th".to_string(), "en-uk".to_string(), "fr".to_string()]
        );

        config.tts_supported_languages = "es,pt:Portuguese".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["es".to_string(), "pt".to_string()]
        );

        config.tts_supported_languages = "de".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["de".to_string()]
        );

        config.tts_supported_languages = "".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            Vec::<String>::new()
        );

        config.tts_supported_languages = " ,, ja:Japanese, ".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["ja".to_string()]
        );

        config.tts_supported_languages = "fr-CA:French (Canada)".to_string();
        assert_eq!(
            config.ordered_supported_language_codes(),
            vec!["fr-CA".to_string()]
        );
    }
}
