use std::sync::Arc;
use std::time::{Duration, Instant};

type BroadcastSender = tokio::sync::broadcast::Sender<crate::AppEvent>;

use serde::Serialize;
use tokio::sync::Mutex;
use tracing::{debug, info};

use crate::config::AppConfig;
use crate::AppEvent;

/// Snapshot of the current translator call cooldown status.
#[derive(Debug, Clone, Serialize)]
pub struct TranslatorStatus {
    /// Configured cooldown duration in seconds.
    pub cooldown_seconds: u64,
    /// Remaining cooldown duration in seconds.
    pub cooldown_remaining_seconds: u64,
    /// Indicates whether the cooldown is currently active.
    pub cooldown_active: bool,
}

/// Successful translator call invocation result.
#[derive(Debug, Clone)]
pub struct TranslatorCallOutcome {
    /// Sanitised counter location used for audio playback and messaging.
    pub location: String,
    /// Updated cooldown status after triggering the translator call.
    pub status: TranslatorStatus,
}

/// Errors that can occur while triggering a translator call.
#[derive(Debug)]
pub enum TranslatorCallError {
    /// The translator call is still on cooldown.
    CooldownActive { remaining_seconds: u64 },
    /// The provided location is missing or empty.
    MissingLocation,
    /// The provided location contains unsupported characters.
    InvalidLocation(String),
}

impl std::fmt::Display for TranslatorCallError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TranslatorCallError::CooldownActive { remaining_seconds } => write!(
                f,
                "Translator call is on cooldown ({} seconds remaining).",
                remaining_seconds
            ),
            TranslatorCallError::MissingLocation => {
                write!(f, "Translator call requires a valid counter location.")
            }
            TranslatorCallError::InvalidLocation(value) => write!(
                f,
                "Translator call location must be digits only. Received: {}",
                value
            ),
        }
    }
}

impl std::error::Error for TranslatorCallError {}

/// Coordinates translator call triggers, enforcing cooldowns and broadcasting SSE events.
#[derive(Clone)]
pub struct TranslatorService {
    config: Arc<AppConfig>,
    event_bus: BroadcastSender,
    last_trigger: Arc<Mutex<Option<Instant>>>,
}

impl TranslatorService {
    pub fn new(config: Arc<AppConfig>, event_bus: BroadcastSender) -> Self {
        Self {
            config,
            event_bus,
            last_trigger: Arc::new(Mutex::new(None)),
        }
    }

    /// Returns the current translator cooldown status.
    pub async fn current_status(&self) -> TranslatorStatus {
        let cooldown_seconds = self.config.announcement_manual_trigger_cooldown_seconds;
        let remaining = self.cooldown_remaining_seconds().await;
        TranslatorStatus {
            cooldown_seconds,
            cooldown_remaining_seconds: remaining,
            cooldown_active: remaining > 0,
        }
    }

    /// Attempts to trigger a translator call for the given counter location.
    pub async fn trigger_call(
        &self,
        location: &str,
    ) -> Result<TranslatorCallOutcome, TranslatorCallError> {
        let sanitized_location = Self::sanitize_location(location)?;

        let cooldown_seconds = self.config.announcement_manual_trigger_cooldown_seconds;
        let cooldown_duration = Duration::from_secs(cooldown_seconds);

        {
            let mut last_trigger = self.last_trigger.lock().await;
            if cooldown_seconds > 0 {
                if let Some(previous_instant) = *last_trigger {
                    let remaining = Self::remaining_seconds(previous_instant, cooldown_duration);
                    if remaining > 0 {
                        return Err(TranslatorCallError::CooldownActive {
                            remaining_seconds: remaining,
                        });
                    }
                }
            }

            *last_trigger = Some(Instant::now());
        }

        let playlist = Self::build_audio_playlist(&sanitized_location);
        info!(
            "TranslatorService: Triggering translator call for location '{}'. Playlist length: {}",
            sanitized_location,
            playlist.len()
        );

        let event = AppEvent::TranslatorCall {
            location: sanitized_location.clone(),
            audio_urls: playlist,
            cooldown_seconds,
            cooldown_remaining_seconds: cooldown_seconds,
        };

        if let Err(err) = self.event_bus.send(event) {
            debug!(
                "TranslatorService: Failed to broadcast translator call event (no active listeners?): {}",
                err
            );
        }

        let status = TranslatorStatus {
            cooldown_seconds,
            cooldown_remaining_seconds: cooldown_seconds,
            cooldown_active: cooldown_seconds > 0,
        };

        Ok(TranslatorCallOutcome {
            location: sanitized_location,
            status,
        })
    }

    async fn cooldown_remaining_seconds(&self) -> u64 {
        let cooldown_seconds = self.config.announcement_manual_trigger_cooldown_seconds;
        if cooldown_seconds == 0 {
            return 0;
        }

        let cooldown_duration = Duration::from_secs(cooldown_seconds);
        let last_trigger = self.last_trigger.lock().await;
        last_trigger.map_or(0, |previous| {
            Self::remaining_seconds(previous, cooldown_duration)
        })
    }

    fn remaining_seconds(previous: Instant, cooldown: Duration) -> u64 {
        let remaining = cooldown.saturating_sub(previous.elapsed());
        remaining.as_secs() + u64::from(remaining.subsec_nanos() > 0)
    }

    fn sanitize_location(raw: &str) -> Result<String, TranslatorCallError> {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return Err(TranslatorCallError::MissingLocation);
        }
        if !trimmed.chars().all(|c| c.is_ascii_digit()) {
            return Err(TranslatorCallError::InvalidLocation(trimmed.to_string()));
        }
        Ok(trimmed.to_string())
    }

    fn build_audio_playlist(location: &str) -> Vec<String> {
        const BASE_PATH: &str = "/media/audio_stems/th";
        let mut playlist = vec![format!("{}/call_translator_at.mp3", BASE_PATH)];
        for ch in location.chars() {
            let digit = ch.to_digit(10).unwrap_or(0);
            playlist.push(format!("{}/number_{:03}.mp3", BASE_PATH, digit));
        }
        playlist
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use envconfig::Envconfig;

    #[tokio::test]
    async fn cooldown_rounds_up_and_invalid_calls_do_not_start_it() {
        let config = AppConfig {
            announcement_manual_trigger_cooldown_seconds: 5,
            ..AppConfig::init_from_env().unwrap()
        };
        let service =
            TranslatorService::new(Arc::new(config), tokio::sync::broadcast::channel(8).0);
        assert!(service.trigger_call("not a counter").await.is_err());
        assert!(!service.current_status().await.cooldown_active);
        service.trigger_call("1").await.unwrap();
        assert_eq!(service.current_status().await.cooldown_remaining_seconds, 5);
        assert!(matches!(
            service.trigger_call("1").await,
            Err(TranslatorCallError::CooldownActive {
                remaining_seconds: 5
            })
        ));
    }
}
