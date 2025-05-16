use serde::Serialize;
use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{
    fs,
    sync::{broadcast, Mutex},
    task::JoinHandle,
    time::{self, MissedTickBehavior},
};

use crate::config::AppConfig;
use crate::AppEvent;

#[derive(Debug, Clone, Serialize)]
pub struct AnnouncementSlot {
    pub id: String,
    pub audio_files: Vec<PathBuf>,
    pub banner_files: Vec<PathBuf>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnnouncementStatus {
    pub current_slot_id: Option<String>,
    pub current_audio_playlist: Vec<String>,
    pub current_banner_playlist: Vec<String>,
    pub cooldown_seconds: u64,
    pub cooldown_remaining_seconds: u64,
    pub cooldown_active: bool,
}

#[derive(Debug)]
pub struct AnnouncementManager {
    config: Arc<AppConfig>,
    slots: Vec<AnnouncementSlot>,
    current_slot_index: usize,
    last_manual_trigger: Instant,
    event_bus_sender: broadcast::Sender<AppEvent>,
    _auto_cycle_task: Option<JoinHandle<()>>,
}

impl AnnouncementManager {
    pub async fn new(
        config: Arc<AppConfig>,
        event_bus_sender: broadcast::Sender<AppEvent>,
    ) -> Arc<Mutex<Self>> {
        tracing::info!("Initializing AnnouncementManager...");

        let base_path = config.announcement_base_path();
        let mut slots = Self::scan_announcement_slots(&base_path).await;
        slots.sort_by(|a, b| a.id.cmp(&b.id));
        tracing::info!("Found {} announcement slots.", slots.len());
        for slot in &slots {
            tracing::debug!("  - Slot: {}", slot.id);
            tracing::debug!("    Audio files: {}", slot.audio_files.len());
            tracing::debug!("    Banner files: {}", slot.banner_files.len());
        }

        let manager_core = Self {
            config: Arc::clone(&config),
            slots,
            current_slot_index: 0,
            last_manual_trigger: Instant::now(),
            event_bus_sender,
            _auto_cycle_task: None,
        };

        let manager_arc_mutex = Arc::new(Mutex::new(manager_core));
        let num_slots = manager_arc_mutex.lock().await.slots.len(); // Get after putting in mutex
        let auto_cycle_interval_seconds = config.announcement_auto_cycle_interval_seconds;

        if auto_cycle_interval_seconds > 0 && num_slots > 0 {
            tracing::info!(
                "Starting announcement auto-cycle task with interval {} seconds.",
                auto_cycle_interval_seconds
            );
            let task_manager_clone = Arc::clone(&manager_arc_mutex);
            let task_handle = tokio::spawn(async move {
                Self::run_auto_cycle_task(task_manager_clone, auto_cycle_interval_seconds).await;
            });
            manager_arc_mutex.lock().await._auto_cycle_task = Some(task_handle);
        } else {
            if auto_cycle_interval_seconds == 0 {
                tracing::info!("Announcement auto-cycling is disabled (interval is 0).");
            } else if num_slots == 0 {
                tracing::warn!("No announcement slots found, auto-cycling task not started.");
            }
        }

        manager_arc_mutex.lock().await.broadcast_status().await;

        manager_arc_mutex
    }

    async fn scan_announcement_slots(base_path: &Path) -> Vec<AnnouncementSlot> {
        tracing::info!("Scanning for announcement slots in: {:?}", base_path);
        let mut slots = Vec::new();

        if !base_path.exists() || !base_path.is_dir() {
            tracing::error!(
                "Announcement base path does not exist or is not a directory: {:?}",
                base_path
            );
            return slots;
        }

        let mut dir_entries = match fs::read_dir(base_path).await {
            Ok(entries) => entries,
            Err(e) => {
                tracing::error!(
                    "Failed to read announcement base directory {:?}: {}",
                    base_path,
                    e
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
                        tracing::debug!("Found potential slot directory: {}", slot_id);

                        let mut audio_files = Vec::new();
                        let mut banner_files = Vec::new();

                        let mut slot_dir_entries = match fs::read_dir(&path).await {
                            Ok(entries) => entries,
                            Err(e) => {
                                tracing::warn!("Could not read slot directory {:?}: {}", path, e);
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
                                                "jpg" | "jpeg" | "png" | "gif" | "webp" => {
                                                    banner_files.push(file_path.clone())
                                                }
                                                _ => {}
                                            }
                                        }
                                    }
                                }
                                Err(e) => {
                                    tracing::warn!(
                                        "Error reading file entry in slot {:?}: {}",
                                        path,
                                        e
                                    );
                                }
                            }
                        }
                        if !audio_files.is_empty() || !banner_files.is_empty() {
                            slots.push(AnnouncementSlot {
                                id: slot_id,
                                audio_files,
                                banner_files,
                            });
                        } else {
                            tracing::warn!(
                                "Slot directory {} contains no supported files.",
                                slot_id
                            );
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Error reading directory entry in {:?}: {}", base_path, e);
                }
            }
        }
        slots
    }

    pub async fn advance_slot(&mut self) {
        if self.slots.is_empty() {
            tracing::warn!("Cannot advance slot, no announcement slots available.");
            return;
        }
        self.current_slot_index = (self.current_slot_index + 1) % self.slots.len();
        tracing::info!(
            "Advanced announcement slot to index {}",
            self.current_slot_index
        );
        self.broadcast_status().await;
    }

    pub async fn manual_advance_slot(&mut self) {
        tracing::info!("Manual announcement slot advancement triggered.");
        let cooldown_duration =
            Duration::from_secs(self.config.announcement_manual_trigger_cooldown_seconds);
        let elapsed = self.last_manual_trigger.elapsed();

        if elapsed >= cooldown_duration
            || self.config.announcement_manual_trigger_cooldown_seconds == 0
        {
            tracing::debug!("Cooldown period passed or disabled, performing manual advancement.");
            self.last_manual_trigger = Instant::now();
            self.advance_slot().await;
        } else {
            let remaining = cooldown_duration - elapsed;
            tracing::warn!(
                "Manual trigger on cooldown. {} seconds remaining.",
                remaining.as_secs()
            );
            self.broadcast_status().await; // Still broadcast status to show cooldown
        }
    }

    pub async fn get_current_status(&self) -> AnnouncementStatus {
        let current_slot = self.slots.get(self.current_slot_index);
        let serve_dir_path = &self.config.serve_dir_path;

        let current_slot_id = current_slot.map(|s| s.id.clone());

        let current_audio_playlist = current_slot
            .map(|slot| {
                slot.audio_files
                    .iter()
                    .filter_map(|p| self.to_web_accessible_path(p, serve_dir_path))
                    .collect()
            })
            .unwrap_or_default();

        let current_banner_playlist = current_slot
            .map(|slot| {
                slot.banner_files
                    .iter()
                    .filter_map(|p| self.to_web_accessible_path(p, serve_dir_path))
                    .collect()
            })
            .unwrap_or_default();

        let cooldown_seconds = self.config.announcement_manual_trigger_cooldown_seconds;
        let elapsed_since_last_trigger = self.last_manual_trigger.elapsed();
        let cooldown_active = elapsed_since_last_trigger < Duration::from_secs(cooldown_seconds)
            && cooldown_seconds > 0;

        let cooldown_remaining_seconds = if cooldown_active {
            cooldown_seconds.saturating_sub(elapsed_since_last_trigger.as_secs())
        } else {
            0
        };

        AnnouncementStatus {
            current_slot_id,
            current_audio_playlist,
            current_banner_playlist,
            cooldown_seconds,
            cooldown_remaining_seconds,
            cooldown_active,
        }
    }

    async fn broadcast_status(&self) {
        let status = self.get_current_status().await;
        tracing::debug!("Broadcasting announcement status: {:?}", status);
        let event = AppEvent::AnnouncementStatus(status);
        if let Err(e) = self.event_bus_sender.send(event) {
            // Changed from error! to debug! as this is expected if no clients are connected
            tracing::debug!(
                "Could not broadcast announcement status (possibly no active subscribers yet): {}",
                e
            );
        }
    }

    async fn run_auto_cycle_task(
        manager_arc: Arc<Mutex<AnnouncementManager>>,
        interval_seconds: u64,
    ) {
        if interval_seconds == 0 {
            tracing::info!("Auto-cycle interval is 0, task will not run.");
            return;
        }
        let mut interval = time::interval(Duration::from_secs(interval_seconds));
        interval.set_missed_tick_behavior(MissedTickBehavior::Skip);

        loop {
            interval.tick().await;
            tracing::debug!("Auto-cycle timer ticked, acquiring manager lock.");
            let mut manager = manager_arc.lock().await;
            manager.advance_slot().await;
            drop(manager);
            tracing::debug!("Manager lock released by auto-cycle task.");
        }
    }

    fn to_web_accessible_path(&self, file_path: &Path, serve_dir_path: &Path) -> Option<String> {
        match file_path.strip_prefix(serve_dir_path) {
            Ok(relative_path) => {
                let mut web_path_str = "/".to_string();
                // Ensure no leading slash from relative_path if it's empty or already absolute-like
                let relative_lossy = relative_path.to_string_lossy();
                if relative_lossy.starts_with('/') {
                    web_path_str.push_str(relative_lossy.trim_start_matches('/'));
                } else {
                    web_path_str.push_str(&relative_lossy);
                }
                Some(web_path_str.replace('\\', "/"))
            }
            Err(_) => {
                tracing::warn!(
                    "File {:?} is not within served dir {:?}, cannot create web path.",
                    file_path,
                    serve_dir_path
                );
                None
            }
        }
    }
}
