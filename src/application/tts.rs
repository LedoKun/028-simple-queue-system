use std::{collections::HashMap, sync::Arc};

type BroadcastSender = tokio::sync::broadcast::Sender<crate::AppEvent>;

use crate::{config::AppConfig, tts::manager::TTSManager};

/// Service wrapper around [`TTSManager`] that exposes a narrow interface required by the API layer.
#[derive(Clone)]
pub struct TtsService {
    manager: Arc<TTSManager>,
}

impl TtsService {
    /// Initialise a new TTS service instance.
    pub fn new(config: Arc<AppConfig>, event_bus: BroadcastSender) -> Self {
        let manager = TTSManager::new(config, event_bus);
        Self {
            manager: Arc::new(manager),
        }
    }

    /// Trigger asynchronous generation of TTS audio for a given call and language.
    pub fn trigger_generation(&self, id: &str, location: &str, lang: &str) -> Result<(), String> {
        self.manager
            .trigger_tts_generation(id.to_string(), location.to_string(), lang.to_string())
    }

    /// Return the configured set of supported language codes and their display names.
    pub fn supported_languages_map(&self) -> HashMap<String, String> {
        self.manager.get_supported_languages().clone()
    }
}
