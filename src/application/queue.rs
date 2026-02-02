use std::sync::Arc;

type BroadcastSender = tokio::sync::broadcast::Sender<crate::AppEvent>;

use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};

use crate::{
    application::tts::TtsService,
    config::AppConfig,
    queue::{manager::QueueManager, QueueState},
    Call,
};

/// Errors that can occur while orchestrating queue operations.
#[derive(Debug)]
pub enum QueueError {
    /// The underlying queue manager returned an unexpected empty result,
    /// indicating a potential logic bug or state corruption.
    InconsistentState(&'static str),
}

impl std::fmt::Display for QueueError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QueueError::InconsistentState(operation) => {
                write!(
                    f,
                    "Queue state became inconsistent while performing '{}'.",
                    operation
                )
            }
        }
    }
}

impl std::error::Error for QueueError {}

/// High-level service that wraps [`QueueManager`] and coordinates side effects
/// such as event broadcasting and TTS fan-out.
#[derive(Clone)]
pub struct QueueService {
    config: Arc<AppConfig>,
    manager: Arc<Mutex<QueueManager>>,
    event_bus: BroadcastSender,
    tts: TtsService,
}

impl QueueService {
    /// Construct a new queue service using configuration limits and shared dependencies.
    pub fn new(config: Arc<AppConfig>, event_bus: BroadcastSender, tts: TtsService) -> Self {
        let queue_manager =
            QueueManager::new(config.max_history_size, config.max_skipped_history_size);
        Self {
            config,
            manager: Arc::new(Mutex::new(queue_manager)),
            event_bus,
            tts,
        }
    }

    /// Add or recall a call and mark it as the current call.
    pub async fn add_call(&self, original_id: &str, location: &str) -> Result<Call, QueueError> {
        info!(
            "QueueService::add_call -> original_id='{}', location='{}'",
            original_id, location
        );

        let mut manager = self.manager.lock().await;
        let call_ref = manager
            .add_call(original_id.to_string(), location.to_string())
            .ok_or(QueueError::InconsistentState("add_call"))?;
        let current_call = call_ref.clone();
        let queue_state = manager.snapshot();
        drop(manager);

        self.broadcast_queue_update(queue_state);
        self.trigger_tts_for_call(&current_call);

        Ok(current_call)
    }

    /// Skip the current call, pushing it into the skipped history if present.
    pub async fn skip_current_call(&self) -> Option<Call> {
        info!("QueueService::skip_current_call");

        let mut manager = self.manager.lock().await;
        let skipped_call = manager.skip_current_call();
        let queue_state = manager.snapshot();
        drop(manager);

        self.broadcast_queue_update(queue_state);
        skipped_call
    }

    /// Complete the current call, pushing it into the completed history if present.
    pub async fn complete_current_call(&self) -> Option<Call> {
        info!("QueueService::complete_current_call");

        let mut manager = self.manager.lock().await;
        let completed_call = manager.complete_current_call();
        let queue_state = manager.snapshot();
        drop(manager);

        self.broadcast_queue_update(queue_state);
        completed_call
    }

    /// Force a call into the skipped history without making it the current call.
    pub async fn force_skip_call(
        &self,
        original_id: &str,
        location: &str,
    ) -> Result<Call, QueueError> {
        info!(
            "QueueService::force_skip_call -> original_id='{}', location='{}'",
            original_id, location
        );

        let mut manager = self.manager.lock().await;
        let skipped_call = manager
            .add_to_skipped_directly(original_id.to_string(), location.to_string())
            .ok_or(QueueError::InconsistentState("force_skip_call"))?;
        let queue_state = manager.snapshot();
        drop(manager);

        self.broadcast_queue_update(queue_state);
        Ok(skipped_call)
    }

    /// Return a snapshot of the queue for read-only consumers.
    pub async fn snapshot(&self) -> QueueState {
        let manager = self.manager.lock().await;
        let snapshot = manager.snapshot();
        drop(manager);
        snapshot
    }

    fn broadcast_queue_update(&self, queue_state: QueueState) {
        debug!("QueueService::broadcast_queue_update -> {:?}", queue_state);
        if let Err(err) = self
            .event_bus
            .send(crate::AppEvent::QueueUpdate(queue_state))
        {
            debug!(
                "QueueService: failed to broadcast queue update ({}). no active listeners?",
                err
            );
        }
    }

    fn trigger_tts_for_call(&self, call: &Call) {
        let ordered_languages = self.config.ordered_supported_language_codes();
        let Some(primary_lang) = ordered_languages.first() else {
            warn!(
                "QueueService: no supported languages configured; skipping TTS trigger for call '{}'.",
                call.id
            );
            return;
        };

        info!(
            "QueueService: triggering multi-language TTS for call '{}' (primary lang '{}', ordered languages {:?}).",
            call.id, primary_lang, ordered_languages
        );

        if let Err(err) = self
            .tts
            .trigger_generation(&call.id, &call.location, primary_lang)
        {
            error!(
                "QueueService: failed to trigger TTS for call '{}' (lang '{}'): {}",
                call.id, primary_lang, err
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AppEvent;
    use tokio::sync::broadcast;

    fn test_services() -> (QueueService, broadcast::Receiver<AppEvent>) {
        let config = Arc::new(AppConfig {
            server_address: "127.0.0.1".parse().unwrap(),
            server_port: 3000,
            max_history_size: 5,
            max_skipped_history_size: 5,
            serve_dir_path: Default::default(),
            announcements_audio_sub_path: Default::default(),
            banners_sub_path: Default::default(),
            banner_rotation_interval_seconds: 1,
            announcement_auto_cycle_interval_seconds: 1,
            announcement_manual_trigger_cooldown_seconds: 1,
            gtts_cache_base_path: Default::default(),
            tts_cache_maximum_files: 10,
            tts_external_service_timeout_seconds: 5,
            tts_supported_languages: "th:Thai,en-GB:British English".to_string(),
            sse_keep_alive_interval_seconds: 15,
            sse_event_buffer_size: 10,
            tts_cache_web_path: "/tts".to_string(),
        });

        let (sender, receiver) = broadcast::channel(8);
        let tts = TtsService::new(Arc::clone(&config), sender.clone());
        let queue_service = QueueService::new(config, sender, tts);
        (queue_service, receiver)
    }

    #[tokio::test]
    async fn add_call_broadcasts_event() {
        let (service, mut receiver) = test_services();
        let _ = service.add_call("A1", "1").await.unwrap();
        // First send should be the queue update
        let event = receiver.recv().await.unwrap();
        match event {
            AppEvent::QueueUpdate(state) => {
                assert_eq!(state.current_call.unwrap().original_id, "A1");
            }
            other => panic!("unexpected event: {:?}", other),
        }
    }
}
