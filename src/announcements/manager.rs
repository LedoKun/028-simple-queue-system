//! Discovery, scheduling and playback of prerecorded announcements.

use chrono::{Datelike, Timelike, Utc, Weekday};
use serde::Serialize;
use std::{
    fmt,
    path::{Path, PathBuf},
    sync::{Arc, Weak},
    time::{Duration, Instant},
};
use tokio::{
    fs,
    sync::{broadcast, Mutex, Notify},
    time::sleep,
};
use tracing::{debug, error, info, trace, warn};

use crate::{config::AppConfig, AppEvent};

#[derive(Debug, Clone, Serialize)]
pub struct AnnouncementSlot {
    pub id: String,
    pub audio_files: Vec<PathBuf>,
    pub weekdays: Vec<Weekday>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnnouncementSlotSummary {
    pub id: String,
    pub audio_playlist: Vec<String>,
    pub available_today: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnnouncementStatus {
    pub enabled: bool,
    pub current_slot_id: Option<String>,
    pub current_audio_playlist: Vec<String>,
    pub current_banner_playlist: Vec<String>,
    pub banner_cycle_interval_seconds: u64,
    pub cooldown_seconds: u64,
    pub cooldown_remaining_seconds: u64,
    pub cooldown_active: bool,
    /// All discovered slots, with their availability on the current day.
    pub available_slots: Vec<AnnouncementSlotSummary>,
}

#[derive(Debug)]
pub enum ManualTriggerError {
    Disabled,
    CooldownActive { remaining_seconds: u64 },
    SlotNotFound(String),
    SlotUnavailable(String),
    NoSlotsAvailable,
}

impl fmt::Display for ManualTriggerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Disabled => write!(f, "Announcements are disabled"),
            Self::CooldownActive { remaining_seconds } => write!(
                f,
                "Manual trigger is on cooldown ({} seconds remaining)",
                remaining_seconds
            ),
            Self::SlotNotFound(id) => write!(f, "Announcement slot '{}' was not found", id),
            Self::SlotUnavailable(id) => {
                write!(f, "Announcement '{}' is not scheduled for today", id)
            }
            Self::NoSlotsAvailable => write!(f, "No announcement slots are available today"),
        }
    }
}

impl std::error::Error for ManualTriggerError {}

fn schedule_env_key(slot_id: &str) -> String {
    let name: String = slot_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c.to_ascii_uppercase()
            } else {
                '_'
            }
        })
        .collect();
    format!("ANNOUNCEMENT_{}_DAYS", name)
}

fn parse_weekdays(value: &str) -> Result<Vec<Weekday>, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "all" => Ok(vec![
            Weekday::Mon,
            Weekday::Tue,
            Weekday::Wed,
            Weekday::Thu,
            Weekday::Fri,
            Weekday::Sat,
            Weekday::Sun,
        ]),
        "off" => Ok(Vec::new()),
        _ => value
            .split(',')
            .map(|day| {
                day.trim()
                    .parse::<Weekday>()
                    .map_err(|_| format!("Invalid weekday '{}'", day))
            })
            .collect(),
    }
}

fn announcement_days(slot_id: &str) -> Result<Vec<Weekday>, String> {
    let key = schedule_env_key(slot_id);
    let value = match std::env::var(&key) {
        Ok(value) => value,
        Err(std::env::VarError::NotPresent) => if slot_id == "03-lab-done" {
            "tue,wed,thu"
        } else {
            "all"
        }
        .to_string(),
        Err(error) => return Err(format!("{}: {}", key, error)),
    };
    parse_weekdays(&value).map_err(|error| format!("{}: {}", key, error))
}

#[derive(Debug)]
pub struct AnnouncementManager {
    config: Arc<AppConfig>,
    slots: Vec<AnnouncementSlot>,
    banner_files: Vec<PathBuf>,
    enabled: bool,
    current_slot_index: Option<usize>,
    last_manual_trigger: Option<Instant>,
    last_auto_cycle_reset: Instant,
    event_bus_sender: broadcast::Sender<AppEvent>,
    timer_changed: Arc<Notify>,
}

impl AnnouncementManager {
    pub async fn new(
        config: Arc<AppConfig>,
        event_bus_sender: broadcast::Sender<AppEvent>,
    ) -> Arc<Mutex<Self>> {
        let mut slots = Self::scan_announcement_slots(&config.announcement_audio_base_path()).await;
        slots.sort_by(|a, b| a.id.cmp(&b.id));
        let banner_files = Self::scan_banner_files(&config.banner_base_path()).await;
        let manager = Arc::new(Mutex::new(Self {
            enabled: config.announcements_enabled,
            config,
            slots,
            banner_files,
            current_slot_index: None,
            last_manual_trigger: None,
            last_auto_cycle_reset: Instant::now(),
            event_bus_sender,
            timer_changed: Arc::new(Notify::new()),
        }));
        // A weak reference lets the background task end when the service is dropped.
        tokio::spawn(Self::run_auto_cycle_task(Arc::downgrade(&manager)));
        manager
    }

    async fn scan_announcement_slots(audio_base_path: &Path) -> Vec<AnnouncementSlot> {
        info!("Scanning for announcement slots in {:?}.", audio_base_path);
        let mut slots = Vec::new();

        if !audio_base_path.exists() || !audio_base_path.is_dir() {
            error!(
                "Announcement audio base path does not exist or is not a directory: {:?}",
                audio_base_path
            );
            return slots;
        }

        let mut dir_entries = match fs::read_dir(audio_base_path).await {
            Ok(entries) => entries,
            Err(e) => {
                error!(
                    "Failed to read announcement audio base directory {:?}: {}",
                    audio_base_path, e
                );
                return slots;
            }
        };

        while let Some(entry_result) = dir_entries.next_entry().await.transpose() {
            match entry_result {
                Ok(entry) => {
                    let path = entry.path();
                    if path.is_dir() {
                        let slot_id = path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .into_owned();
                        debug!("Found potential slot directory: {}", slot_id);

                        let schedule = match announcement_days(&slot_id) {
                            Ok(days) => days,
                            Err(error) => {
                                error!("Skipping announcement '{}': {}", slot_id, error);
                                continue;
                            }
                        };
                        let mut audio_files = Vec::new();

                        let mut slot_dir_entries = match fs::read_dir(&path).await {
                            Ok(entries) => entries,
                            Err(e) => {
                                warn!("Could not read audio slot directory {:?}: {}", path, e);
                                continue;
                            }
                        };

                        while let Some(file_entry_result) =
                            slot_dir_entries.next_entry().await.transpose()
                        {
                            match file_entry_result {
                                Ok(file_entry) => {
                                    let file_path = file_entry.path();
                                    if file_path.is_file() {
                                        if let Some(extension) =
                                            file_path.extension().and_then(|s| s.to_str())
                                        {
                                            match extension.to_lowercase().as_str() {
                                                "mp3" | "wav" | "ogg" => {
                                                    audio_files.push(file_path.clone())
                                                }
                                                other_ext => {
                                                    trace!(
                                                        "Skipping unsupported audio file type '{}' in slot {}: {:?}",
                                                        other_ext,
                                                        slot_id,
                                                        file_path
                                                    );
                                                }
                                            }
                                        }
                                    } else {
                                        trace!(
                                            "Skipping non-file entry in audio slot dir: {:?}",
                                            file_path
                                        );
                                    }
                                }
                                Err(e) => {
                                    warn!(
                                        "Error reading audio file entry in slot {:?}: {}",
                                        path, e
                                    );
                                }
                            }
                        }

                        if audio_files.is_empty() {
                            warn!(
                                "Slot directory {} contains no supported audio files. Skipping.",
                                slot_id
                            );
                            continue;
                        }

                        audio_files.sort();

                        slots.push(AnnouncementSlot {
                            id: slot_id,
                            audio_files,
                            weekdays: schedule,
                        });
                    } else {
                        trace!(
                            "Skipping non-directory entry in audio base path: {:?}",
                            path
                        );
                    }
                }
                Err(e) => {
                    warn!(
                        "Error reading directory entry in {:?}: {}",
                        audio_base_path, e
                    );
                }
            }
        }

        debug!(
            "Finished scanning audio slots. Found {} valid announcement slots.",
            slots.len()
        );
        slots
    }

    async fn scan_banner_files(banner_base_path: &Path) -> Vec<PathBuf> {
        info!("Scanning for banner media in {:?}.", banner_base_path);

        let mut banners = Vec::new();

        if !banner_base_path.exists() || !banner_base_path.is_dir() {
            warn!(
                "Banner base path does not exist or is not a directory: {:?}",
                banner_base_path
            );
            return banners;
        }

        let mut entries = match fs::read_dir(banner_base_path).await {
            Ok(entries) => entries,
            Err(e) => {
                error!(
                    "Failed to read banner base directory {:?}: {}",
                    banner_base_path, e
                );
                return banners;
            }
        };

        while let Some(entry_result) = entries.next_entry().await.transpose() {
            match entry_result {
                Ok(entry) => {
                    let path = entry.path();
                    if path.is_file() {
                        if Self::is_supported_banner_file(&path) {
                            banners.push(path);
                        } else {
                            trace!("Skipping unsupported banner asset: {:?}", path);
                        }
                    } else if path.is_dir() {
                        let mut nested_entries = match fs::read_dir(&path).await {
                            Ok(inner) => inner,
                            Err(e) => {
                                warn!("Could not read nested banner directory {:?}: {}", path, e);
                                continue;
                            }
                        };

                        while let Some(nested_result) =
                            nested_entries.next_entry().await.transpose()
                        {
                            match nested_result {
                                Ok(nested_entry) => {
                                    let nested_path = nested_entry.path();
                                    if nested_path.is_file() {
                                        if Self::is_supported_banner_file(&nested_path) {
                                            banners.push(nested_path);
                                        } else {
                                            trace!(
                                                "Skipping unsupported banner asset in nested dir {:?}: {:?}",
                                                path,
                                                nested_path
                                            );
                                        }
                                    }
                                }
                                Err(e) => {
                                    warn!("Error reading banner asset in {:?}: {}", path, e);
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    warn!(
                        "Error reading entry in banner base directory {:?}: {}",
                        banner_base_path, e
                    );
                }
            }
        }

        banners.sort();
        debug!("Discovered {} banner assets.", banners.len());
        banners
    }

    fn is_supported_banner_file(path: &Path) -> bool {
        match path.extension().and_then(|ext| ext.to_str()) {
            Some(ext) => matches!(
                ext.to_lowercase().as_str(),
                "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "mp4" | "webm" | "ogg" | "mov"
            ),
            None => false,
        }
    }

    fn now(&self) -> chrono::DateTime<Utc> {
        Utc::now() + chrono::Duration::hours(i64::from(self.config.announcement_utc_offset_hours))
    }

    fn next_slot_index(&self, day: Weekday) -> Option<usize> {
        let start = self.current_slot_index.map_or(0, |index| index + 1);
        (0..self.slots.len())
            .map(|offset| (start + offset) % self.slots.len())
            .find(|&index| self.slots[index].weekdays.contains(&day))
    }

    fn manual_cooldown_remaining_seconds(&self) -> Option<u64> {
        let remaining =
            Duration::from_secs(self.config.announcement_manual_trigger_cooldown_seconds)
                .saturating_sub(self.last_manual_trigger?.elapsed());
        (!remaining.is_zero())
            .then(|| remaining.as_secs() + u64::from(remaining.subsec_nanos() > 0))
    }

    fn check_manual_trigger(&self) -> Result<(), ManualTriggerError> {
        if !self.enabled {
            return Err(ManualTriggerError::Disabled);
        }
        if let Some(remaining_seconds) = self.manual_cooldown_remaining_seconds() {
            return Err(ManualTriggerError::CooldownActive { remaining_seconds });
        }
        Ok(())
    }

    pub async fn set_enabled(&mut self, enabled: bool) {
        if self.enabled != enabled {
            self.enabled = enabled;
            self.timer_changed.notify_one();
            self.current_slot_index = None;
            self.last_auto_cycle_reset = Instant::now();
            self.broadcast_status().await;
        }
    }

    pub async fn advance_slot(&mut self) {
        self.last_auto_cycle_reset = Instant::now();
        if !self.enabled {
            return;
        }
        self.current_slot_index = self.next_slot_index(self.now().weekday());
        self.broadcast_status().await;
    }

    pub async fn manual_advance_slot(&mut self) -> Result<(), ManualTriggerError> {
        self.check_manual_trigger()?;
        if self.next_slot_index(self.now().weekday()).is_none() {
            return Err(ManualTriggerError::NoSlotsAvailable);
        }
        self.last_manual_trigger = Some(Instant::now());
        self.advance_slot().await;
        Ok(())
    }

    pub async fn manual_trigger_slot(&mut self, slot_id: &str) -> Result<(), ManualTriggerError> {
        self.check_manual_trigger()?;
        let index = self
            .slots
            .iter()
            .position(|slot| slot.id == slot_id)
            .ok_or_else(|| ManualTriggerError::SlotNotFound(slot_id.to_string()))?;
        if !self.slots[index].weekdays.contains(&self.now().weekday()) {
            return Err(ManualTriggerError::SlotUnavailable(slot_id.to_string()));
        }
        self.last_manual_trigger = Some(Instant::now());
        self.last_auto_cycle_reset = Instant::now();
        self.current_slot_index = Some(index);
        self.broadcast_status().await;
        Ok(())
    }

    pub async fn get_current_status(&self) -> AnnouncementStatus {
        let today = self.now().weekday();
        let current_slot = self
            .current_slot_index
            .and_then(|index| self.slots.get(index))
            .filter(|slot| self.enabled && slot.weekdays.contains(&today));
        let playlist = |paths: &[PathBuf]| {
            paths
                .iter()
                .filter_map(|path| self.to_web_accessible_path(path))
                .collect::<Vec<_>>()
        };
        let cooldown_remaining_seconds = self.manual_cooldown_remaining_seconds().unwrap_or(0);
        AnnouncementStatus {
            enabled: self.enabled,
            current_slot_id: current_slot.map(|slot| slot.id.clone()),
            current_audio_playlist: current_slot
                .map(|slot| playlist(&slot.audio_files))
                .unwrap_or_default(),
            current_banner_playlist: playlist(&self.banner_files),
            banner_cycle_interval_seconds: self.config.banner_rotation_interval_seconds,
            cooldown_seconds: self.config.announcement_manual_trigger_cooldown_seconds,
            cooldown_remaining_seconds,
            cooldown_active: cooldown_remaining_seconds > 0,
            available_slots: self
                .slots
                .iter()
                .map(|slot| AnnouncementSlotSummary {
                    id: slot.id.clone(),
                    audio_playlist: playlist(&slot.audio_files),
                    available_today: slot.weekdays.contains(&today),
                })
                .collect(),
        }
    }

    async fn broadcast_status(&self) {
        let _ = self.event_bus_sender.send(AppEvent::AnnouncementStatus(
            self.get_current_status().await,
        ));
    }

    async fn run_auto_cycle_task(manager: Weak<Mutex<Self>>) {
        loop {
            let (delay, date, timer_changed) = {
                let Some(manager) = manager.upgrade() else {
                    return;
                };
                let manager = manager.lock().await;
                let now = manager.now();
                let until_midnight =
                    Duration::from_secs(u64::from(86_400 - now.num_seconds_from_midnight()));
                let interval = manager.config.announcement_auto_cycle_interval_seconds;
                let delay = if manager.enabled && interval > 0 {
                    Duration::from_secs(interval)
                        .saturating_sub(manager.last_auto_cycle_reset.elapsed())
                        .min(until_midnight)
                } else {
                    until_midnight
                };
                (delay, now.date_naive(), Arc::clone(&manager.timer_changed))
            };
            tokio::select! {
                _ = sleep(delay) => {},
                _ = timer_changed.notified() => continue,
            }
            let Some(manager) = manager.upgrade() else {
                return;
            };
            let mut manager = manager.lock().await;
            if manager.now().date_naive() != date {
                // Clear yesterday's playlist without replaying it when today's buttons refresh.
                manager.current_slot_index = None;
                manager.broadcast_status().await;
            }
            let interval = manager.config.announcement_auto_cycle_interval_seconds;
            if manager.enabled
                && interval > 0
                && manager.last_auto_cycle_reset.elapsed() >= Duration::from_secs(interval)
            {
                manager.advance_slot().await;
            }
        }
    }

    fn to_web_accessible_path(&self, file_path: &Path) -> Option<String> {
        match file_path.strip_prefix(&self.config.serve_dir_path) {
            Ok(path) => Some(format!(
                "/{}",
                path.components()
                    .map(
                        |part| urlencoding::encode(&part.as_os_str().to_string_lossy())
                            .into_owned()
                    )
                    .collect::<Vec<_>>()
                    .join("/")
            )),
            Err(_) => {
                warn!("File {:?} is outside the served directory", file_path);
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use envconfig::Envconfig;

    fn manager() -> AnnouncementManager {
        let config = AppConfig {
            serve_dir_path: PathBuf::from("/public"),
            announcements_enabled: true,
            announcement_utc_offset_hours: 7,
            announcement_auto_cycle_interval_seconds: 0,
            announcement_manual_trigger_cooldown_seconds: 0,
            ..AppConfig::init_from_env().unwrap()
        };
        AnnouncementManager {
            config: Arc::new(config),
            slots: vec![
                AnnouncementSlot {
                    id: "daily".into(),
                    audio_files: vec![PathBuf::from("/public/media/daily.mp3")],
                    weekdays: parse_weekdays("all").unwrap(),
                },
                AnnouncementSlot {
                    id: "lab".into(),
                    audio_files: vec![PathBuf::from("/public/media/lab.mp3")],
                    weekdays: parse_weekdays("tue,wed,thu").unwrap(),
                },
            ],
            banner_files: vec![PathBuf::from("/public/media/banner.png")],
            enabled: true,
            current_slot_index: None,
            last_manual_trigger: None,
            last_auto_cycle_reset: Instant::now(),
            event_bus_sender: broadcast::channel(16).0,
            timer_changed: Arc::new(Notify::new()),
        }
    }

    #[test]
    fn media_urls_escape_url_delimiters_in_filenames() {
        assert_eq!(
            manager().to_web_accessible_path(Path::new("/public/media/banner #1?.webp")),
            Some("/media/banner%20%231%3F.webp".into())
        );
        assert!(manager()
            .to_web_accessible_path(Path::new("/elsewhere/audio.mp3"))
            .is_none());
    }

    #[test]
    fn parses_weekdays_and_rejects_invalid_schedules() {
        assert_eq!(
            schedule_env_key("03-lab-done"),
            "ANNOUNCEMENT_03_LAB_DONE_DAYS"
        );
        assert_eq!(parse_weekdays("all").unwrap().len(), 7);
        assert_eq!(
            parse_weekdays(" Tuesday, WED, thu ").unwrap(),
            vec![Weekday::Tue, Weekday::Wed, Weekday::Thu]
        );
        assert!(parse_weekdays("off").unwrap().is_empty());
        for invalid in ["", "tue,", "all,tue", "mondayy", "tue,,wed"] {
            assert!(parse_weekdays(invalid).is_err(), "{invalid}");
        }
    }

    #[test]
    fn cycling_starts_with_first_slot_and_skips_disallowed_weekdays() {
        let mut manager = manager();
        assert_eq!(manager.next_slot_index(Weekday::Tue), Some(0));
        manager.current_slot_index = Some(0);
        for day in [Weekday::Tue, Weekday::Wed, Weekday::Thu] {
            assert_eq!(manager.next_slot_index(day), Some(1));
        }
        for day in [Weekday::Mon, Weekday::Fri, Weekday::Sat, Weekday::Sun] {
            assert_eq!(manager.next_slot_index(day), Some(0));
        }
        manager.current_slot_index = Some(1);
        assert_eq!(manager.next_slot_index(Weekday::Tue), Some(0));
        manager.slots.clear();
        assert_eq!(manager.next_slot_index(Weekday::Tue), None);
    }

    #[tokio::test]
    async fn toggle_blocks_both_trigger_paths_and_clears_audio_but_keeps_banners() {
        let mut manager = manager();
        manager.manual_advance_slot().await.unwrap();
        assert_eq!(
            manager
                .get_current_status()
                .await
                .current_slot_id
                .as_deref(),
            Some("daily")
        );
        let mut events = manager.event_bus_sender.subscribe();
        manager.set_enabled(false).await;
        assert!(matches!(
            events.try_recv(),
            Ok(AppEvent::AnnouncementStatus(AnnouncementStatus {
                enabled: false,
                ..
            }))
        ));
        assert!(matches!(
            manager.manual_advance_slot().await,
            Err(ManualTriggerError::Disabled)
        ));
        assert!(matches!(
            manager.manual_trigger_slot("daily").await,
            Err(ManualTriggerError::Disabled)
        ));
        manager.advance_slot().await;
        let status = manager.get_current_status().await;
        assert!(status.current_audio_playlist.is_empty());
        assert!(!status.current_banner_playlist.is_empty());
        manager.set_enabled(true).await;
        assert!(manager.get_current_status().await.current_slot_id.is_none());
        manager.manual_advance_slot().await.unwrap();
        assert_eq!(
            manager
                .get_current_status()
                .await
                .current_slot_id
                .as_deref(),
            Some("daily")
        );
    }

    #[tokio::test]
    async fn unavailable_slots_remain_visible_and_rejected_without_consuming_cooldown() {
        let mut manager = manager();
        manager.slots[0].weekdays.clear();
        manager.slots[1].weekdays.clear();
        let status = manager.get_current_status().await;
        assert_eq!(status.available_slots.len(), 2);
        assert!(status
            .available_slots
            .iter()
            .all(|slot| !slot.available_today));
        assert!(matches!(
            manager.manual_trigger_slot("daily").await,
            Err(ManualTriggerError::SlotUnavailable(_))
        ));
        assert!(matches!(
            manager.manual_trigger_slot("missing").await,
            Err(ManualTriggerError::SlotNotFound(_))
        ));
        assert!(matches!(
            manager.manual_advance_slot().await,
            Err(ManualTriggerError::NoSlotsAvailable)
        ));
        manager.advance_slot().await;
        assert!(manager.get_current_status().await.current_slot_id.is_none());
        assert!(manager.last_manual_trigger.is_none());
    }

    #[tokio::test]
    async fn slot_availability_is_separate_from_the_global_toggle() {
        let mut manager = manager();
        manager.slots[1].weekdays.clear();
        for enabled in [true, false] {
            manager.set_enabled(enabled).await;
            let status = manager.get_current_status().await;
            assert_eq!(status.enabled, enabled);
            assert_eq!(status.available_slots.len(), 2);
            assert!(status.available_slots[0].available_today);
            assert!(!status.available_slots[1].available_today);
            assert!(!status.available_slots[1].audio_playlist.is_empty());
        }
        manager.slots[1].weekdays = parse_weekdays("all").unwrap();
        assert!(manager.get_current_status().await.available_slots[1].available_today);
    }

    #[tokio::test]
    async fn cooldown_prevents_repeat_manual_triggers() {
        let mut manager = manager();
        Arc::make_mut(&mut manager.config).announcement_manual_trigger_cooldown_seconds = 5;
        manager.manual_trigger_slot("daily").await.unwrap();
        assert!(matches!(
            manager.manual_advance_slot().await,
            Err(ManualTriggerError::CooldownActive { .. })
        ));
        assert!(matches!(
            manager.manual_trigger_slot("daily").await,
            Err(ManualTriggerError::CooldownActive { .. })
        ));
        assert!(manager.get_current_status().await.cooldown_active);
    }

    #[tokio::test]
    async fn enabling_wakes_timer_and_task_does_not_keep_manager_alive() {
        let mut manager = manager();
        Arc::make_mut(&mut manager.config).announcement_auto_cycle_interval_seconds = 1;
        manager.enabled = false;
        let manager = Arc::new(Mutex::new(manager));
        let weak = Arc::downgrade(&manager);
        let task = tokio::spawn(AnnouncementManager::run_auto_cycle_task(weak.clone()));
        tokio::task::yield_now().await;
        let mut events = {
            let mut manager = manager.lock().await;
            manager.set_enabled(true).await;
            manager.last_auto_cycle_reset = Instant::now() - Duration::from_secs(2);
            manager.event_bus_sender.subscribe()
        };
        let event = tokio::time::timeout(Duration::from_secs(2), events.recv())
            .await
            .unwrap()
            .unwrap();
        assert!(matches!(
            event,
            AppEvent::AnnouncementStatus(AnnouncementStatus {
                current_slot_id: Some(_),
                ..
            })
        ));
        drop(manager);
        tokio::task::yield_now().await;
        assert!(weak.upgrade().is_none());
        task.abort();
    }
}
