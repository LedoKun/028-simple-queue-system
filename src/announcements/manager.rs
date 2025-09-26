// src/announcements/manager.rs

//! Manages the scheduling, cycling, and status of audio and banner announcements.
//!
//! This module defines the `AnnouncementManager` which:
//! - Scans a configured directory for announcement "slots" (subdirectories containing audio and banner files).
//! - Cycles through these slots automatically at a configurable interval or manually.
//! - Maintains the current announcement status, including active slot, playlists, and manual trigger cooldown.
//! - Broadcasts `AppEvent::AnnouncementStatus` updates to inform other parts of the application and SSE clients.

use serde::Serialize;
use std::{
    fmt,
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{
    fs,                                      // Async file system operations
    sync::{broadcast, Mutex},                // Async synchronization primitives
    task::JoinHandle,                        // For managing the auto-cycle background task
    time::{self, sleep, MissedTickBehavior}, // For asynchronous timers
};
use tracing::{debug, error, info, trace, warn}; // Import tracing macros

use crate::config::AppConfig;
use crate::AppEvent;

/// Represents a single announcement slot, containing a collection of audio and banner files.
///
/// An announcement slot is typically a subdirectory within the configured announcements base path,
/// housing media files meant to be played or displayed together.
#[derive(Debug, Clone, Serialize)]
pub struct AnnouncementSlot {
    /// A unique identifier for the announcement slot, usually derived from its directory name.
    pub id: String,
    /// A list of paths to audio files (e.g., MP3, WAV) within this slot.
    /// These paths are relative to the project root for internal use.
    pub audio_files: Vec<PathBuf>,
}

/// Provides a lightweight summary of an announcement slot used for API responses and SSE updates.
#[derive(Debug, Clone, Serialize)]
pub struct AnnouncementSlotSummary {
    /// The slot identifier.
    pub id: String,
    /// Web-accessible URLs for the audio files contained in this slot.
    pub audio_playlist: Vec<String>,
}

/// Provides a snapshot of the current status of the announcement system.
///
/// This struct is designed for serialization and broadcasting to inform clients
/// about which announcement is active, its content, and the state of manual trigger cooldowns.
#[derive(Debug, Clone, Serialize)]
pub struct AnnouncementStatus {
    /// The ID of the currently active announcement slot, if any.
    pub current_slot_id: Option<String>,
    /// A list of web-accessible URLs for the audio files in the current slot.
    pub current_audio_playlist: Vec<String>,
    /// A list of web-accessible URLs for the banner files in the current slot.
    pub current_banner_playlist: Vec<String>,
    /// The configured interval in seconds for rotating banner media on clients.
    pub banner_cycle_interval_seconds: u64,
    /// The configured cooldown duration in seconds for manual announcement triggers.
    pub cooldown_seconds: u64,
    /// The estimated remaining seconds until a manual trigger is allowed again.
    pub cooldown_remaining_seconds: u64,
    /// A flag indicating if the manual trigger cooldown is currently active.
    pub cooldown_active: bool,
    /// All available announcement slots and their audio playlists.
    pub available_slots: Vec<AnnouncementSlotSummary>,
}

/// Errors that can occur when attempting to manually trigger announcements.
#[derive(Debug)]
pub enum ManualTriggerError {
    /// The manual trigger is within the cooldown period.
    CooldownActive { remaining_seconds: u64 },
    /// The requested slot ID does not exist.
    SlotNotFound(String),
    /// No announcement slots are available to trigger.
    NoSlotsAvailable,
}

impl fmt::Display for ManualTriggerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ManualTriggerError::CooldownActive { remaining_seconds } => {
                write!(
                    f,
                    "Manual trigger is on cooldown ({} seconds remaining)",
                    remaining_seconds
                )
            }
            ManualTriggerError::SlotNotFound(slot_id) => {
                write!(f, "Announcement slot '{}' was not found", slot_id)
            }
            ManualTriggerError::NoSlotsAvailable => {
                write!(f, "No announcement slots are available to trigger")
            }
        }
    }
}

impl std::error::Error for ManualTriggerError {}

/// Manages the discovery, cycling, and state of announcements.
///
/// This manager handles:
/// - Scanning a designated directory for `AnnouncementSlot`s.
/// - Automatically advancing through slots based on a configurable interval.
/// - Handling manual slot advancement requests, respecting a cooldown period.
/// - Providing the current status of the announcement system.
/// - Broadcasting status updates via the application's event bus.
#[derive(Debug)]
pub struct AnnouncementManager {
    /// Application configuration, providing paths, intervals, and cooldowns.
    config: Arc<AppConfig>,
    /// A sorted list of all discovered announcement slots.
    slots: Vec<AnnouncementSlot>,
    /// Collected banner media files served to clients.
    banner_files: Vec<PathBuf>,
    /// The index of the currently active announcement slot within the `slots` vector.
    current_slot_index: usize,
    /// The `Instant` when the last manual announcement trigger occurred, used for cooldown.
    last_manual_trigger: Instant,
    /// Sender for the application-wide event bus, used to broadcast `AnnouncementStatus` updates.
    event_bus_sender: broadcast::Sender<AppEvent>,
    /// Handle to the background task responsible for automatically cycling through announcement slots.
    /// Stored as `_auto_cycle_task` to indicate it's not directly read, but its lifecycle is managed.
    _auto_cycle_task: Option<JoinHandle<()>>,
}

impl AnnouncementManager {
    const INITIAL_STATUS_BROADCAST_DELAY_SECS: u64 = 30;

    /// Creates a new `AnnouncementManager` instance.
    ///
    /// This asynchronous function scans for announcement slots, sorts them,
    /// and optionally starts a background task for auto-cycling if configured.
    ///
    /// # Arguments
    /// - `config`: An `Arc` to the shared application configuration.
    /// - `event_bus_sender`: A `broadcast::Sender` for `AppEvent`s, used to
    ///   broadcast `AnnouncementStatus` updates.
    ///
    /// # Returns
    /// An `Arc<Mutex<Self>>` containing the newly created `AnnouncementManager` instance.
    /// The `Mutex` wrapper is necessary as the manager's state is modified by both
    /// API routes and the internal auto-cycle task.
    pub async fn new(
        config: Arc<AppConfig>,
        event_bus_sender: broadcast::Sender<AppEvent>,
    ) -> Arc<Mutex<Self>> {
        info!("Initializing AnnouncementManager...");
        debug!("AnnouncementManager new: Using config: {:?}", config);

        // Scan the configured base paths for announcement slot directories.
        let audio_base_path = config.announcement_audio_base_path();
        let banner_base_path = config.banner_base_path();
        let mut slots = Self::scan_announcement_slots(&audio_base_path).await;
        let banner_files = Self::scan_banner_files(&banner_base_path).await;
        // Sort slots by their ID for consistent ordering.
        slots.sort_by(|a, b| a.id.cmp(&b.id));

        info!(
            "Found {} announcement slots (audio path: {:?}).",
            slots.len(),
            audio_base_path
        );
        // Log details of each discovered slot.
        for slot in &slots {
            debug!("  - Slot: {}", slot.id);
            debug!("    Audio files: {}", slot.audio_files.len());
        }

        // Create the core manager instance.
        let manager_core = Self {
            config: Arc::clone(&config),
            slots,
            banner_files,
            current_slot_index: 0, // Start with the first slot.
            last_manual_trigger: {
                let now = Instant::now();
                let cooldown = config.announcement_manual_trigger_cooldown_seconds;
                if cooldown == 0 {
                    now
                } else {
                    let cooldown_duration = Duration::from_secs(cooldown);
                    now.checked_sub(cooldown_duration).unwrap_or(now)
                }
            },
            event_bus_sender,
            _auto_cycle_task: None, // Will be set if auto-cycling is enabled.
        };

        // Wrap the manager in Arc<Mutex> for shared, mutable access.
        let manager_arc_mutex = Arc::new(Mutex::new(manager_core));

        // Get configuration values relevant to auto-cycling.
        // Acquire a temporary lock to read the number of slots from the newly created manager.
        let num_slots = manager_arc_mutex.lock().await.slots.len();
        let auto_cycle_interval_seconds = config.announcement_auto_cycle_interval_seconds;

        // Start the auto-cycle background task if enabled and slots are available.
        if auto_cycle_interval_seconds > 0 && num_slots > 0 {
            info!(
                "Starting announcement auto-cycle task with interval {} seconds.",
                auto_cycle_interval_seconds
            );
            // Clone the Arc for the task, so it has its own reference to the manager.
            let task_manager_clone = Arc::clone(&manager_arc_mutex);
            let task_handle = tokio::spawn(async move {
                Self::run_auto_cycle_task(task_manager_clone, auto_cycle_interval_seconds).await;
            });
            // Store the JoinHandle to keep the task running.
            manager_arc_mutex.lock().await._auto_cycle_task = Some(task_handle);
        } else {
            // Log reasons why auto-cycling is not started.
            if auto_cycle_interval_seconds == 0 {
                info!("Announcement auto-cycling is disabled (interval is 0).");
            } else if num_slots == 0 {
                warn!("No announcement slots found, auto-cycling task not started.");
            }
        }

        // Broadcast the initial status after a short delay so SSE clients have
        // a chance to subscribe before the first event is emitted.
        let initial_broadcast_manager = Arc::clone(&manager_arc_mutex);
        tokio::spawn(async move {
            sleep(Duration::from_secs(
                Self::INITIAL_STATUS_BROADCAST_DELAY_SECS,
            ))
            .await;
            let manager = initial_broadcast_manager.lock().await;
            manager.broadcast_status().await;
        });

        manager_arc_mutex
    }

    /// Scans the configured audio directory for announcement slots.
    ///
    /// Each subdirectory in the audio base path is treated as a slot whose audio files are
    /// played together when the slot becomes active.
    async fn scan_announcement_slots(audio_base_path: &Path) -> Vec<AnnouncementSlot> {
        info!("Scanning for announcement slots in {:?}.", audio_base_path);
        let mut slots = Vec::new();

        // Validate the audio base path exists and is a directory.
        if !audio_base_path.exists() || !audio_base_path.is_dir() {
            error!(
                "Announcement audio base path does not exist or is not a directory: {:?}",
                audio_base_path
            );
            return slots;
        }

        // Read entries in the audio base directory.
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

        // Iterate over each entry in the base directory.
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

                        let mut audio_files = Vec::new();

                        // Read files within the audio slot directory.
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

    /// Collects all banner media files located under the provided base path.
    ///
    /// The scanner looks for supported image and video formats in the root directory
    /// and within its immediate subdirectories, allowing flexible organization.
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

    /// Advances the `current_slot_index` to the next slot in sequence.
    ///
    /// If there are no slots, a warning is logged and no action is taken.
    /// The index wraps around to 0 after reaching the last slot.
    /// After advancing, it broadcasts the new announcement status.
    fn manual_cooldown_remaining_seconds(&self) -> Option<u64> {
        let cooldown_seconds = self.config.announcement_manual_trigger_cooldown_seconds;
        if cooldown_seconds == 0 {
            return None;
        }
        let elapsed_since_last_trigger = self.last_manual_trigger.elapsed();
        if elapsed_since_last_trigger >= Duration::from_secs(cooldown_seconds) {
            None
        } else {
            Some(cooldown_seconds.saturating_sub(elapsed_since_last_trigger.as_secs()))
        }
    }

    pub async fn advance_slot(&mut self) {
        debug!("Attempting to advance announcement slot.");
        if self.slots.is_empty() {
            warn!("Cannot advance slot, no announcement slots available.");
            return;
        }
        self.current_slot_index = (self.current_slot_index + 1) % self.slots.len();
        info!(
            "Advanced announcement slot to index {} (ID: {:?}).",
            self.current_slot_index,
            self.slots.get(self.current_slot_index).map(|s| &s.id)
        );
        self.broadcast_status().await;
    }

    /// Triggers a manual advancement of the announcement slot.
    ///
    /// This function respects a configured cooldown period to prevent rapid
    /// manual advancements. If the cooldown is active, a warning is logged
    /// and an error is returned.
    pub async fn manual_advance_slot(&mut self) -> Result<(), ManualTriggerError> {
        info!("Manual announcement slot advancement triggered.");
        if self.slots.is_empty() {
            warn!("Manual advance requested but no announcement slots are available.");
            return Err(ManualTriggerError::NoSlotsAvailable);
        }

        if let Some(remaining) = self.manual_cooldown_remaining_seconds() {
            warn!(
                "Manual trigger on cooldown. {} seconds remaining.",
                remaining
            );
            // Broadcast to refresh clients with updated cooldown status.
            self.broadcast_status().await;
            return Err(ManualTriggerError::CooldownActive {
                remaining_seconds: remaining,
            });
        }

        debug!("Cooldown period passed or disabled, performing manual advancement.");
        self.last_manual_trigger = Instant::now();
        self.advance_slot().await;
        Ok(())
    }

    /// Triggers a manual activation of a specific announcement slot by ID.
    pub async fn manual_trigger_slot(&mut self, slot_id: &str) -> Result<(), ManualTriggerError> {
        info!(
            "Manual trigger requested for announcement slot '{}'.",
            slot_id
        );
        if self.slots.is_empty() {
            warn!("Manual trigger requested but no announcement slots are available.");
            return Err(ManualTriggerError::NoSlotsAvailable);
        }

        let Some(target_index) = self.slots.iter().position(|slot| slot.id == slot_id) else {
            warn!("Manual trigger requested for unknown slot '{}'.", slot_id);
            return Err(ManualTriggerError::SlotNotFound(slot_id.to_string()));
        };

        if let Some(remaining) = self.manual_cooldown_remaining_seconds() {
            warn!(
                "Manual trigger on cooldown. {} seconds remaining.",
                remaining
            );
            self.broadcast_status().await;
            return Err(ManualTriggerError::CooldownActive {
                remaining_seconds: remaining,
            });
        }

        self.last_manual_trigger = Instant::now();
        self.current_slot_index = target_index;
        info!(
            "Manual trigger activated slot {} (index {}).",
            slot_id, target_index
        );
        self.broadcast_status().await;
        Ok(())
    }

    /// Retrieves the current `AnnouncementStatus` based on the manager's state.
    ///
    /// This function constructs a snapshot of the current announcement state,
    /// including web-accessible paths for audio and banner files.
    ///
    /// # Returns
    /// An `AnnouncementStatus` struct representing the current state.
    pub async fn get_current_status(&self) -> AnnouncementStatus {
        debug!("Getting current announcement status.");
        let current_slot = self.slots.get(self.current_slot_index);
        let serve_dir_path = &self.config.serve_dir_path; // Path for static file serving.

        let current_slot_id = current_slot.map(|s| s.id.clone());

        // Convert file system paths of audio files to web-accessible URLs.
        let current_audio_playlist = current_slot
            .map(|slot| {
                slot.audio_files
                    .iter()
                    .filter_map(|p| self.to_web_accessible_path(p, serve_dir_path))
                    .collect()
            })
            .unwrap_or_default();

        // Convert banner media paths to web-accessible URLs.
        let current_banner_playlist = self
            .banner_files
            .iter()
            .filter_map(|p| self.to_web_accessible_path(p, serve_dir_path))
            .collect();

        // Calculate cooldown status.
        let cooldown_seconds = self.config.announcement_manual_trigger_cooldown_seconds;
        let cooldown_remaining = self.manual_cooldown_remaining_seconds();
        let cooldown_active = cooldown_remaining.is_some();
        let cooldown_remaining_seconds = cooldown_remaining.unwrap_or(0);

        // Build summaries for all available slots (audio only).
        let available_slots = self
            .slots
            .iter()
            .map(|slot| AnnouncementSlotSummary {
                id: slot.id.clone(),
                audio_playlist: slot
                    .audio_files
                    .iter()
                    .filter_map(|p| self.to_web_accessible_path(p, serve_dir_path))
                    .collect(),
            })
            .collect();

        let status = AnnouncementStatus {
            current_slot_id,
            current_audio_playlist,
            current_banner_playlist,
            banner_cycle_interval_seconds: self.config.banner_rotation_interval_seconds,
            cooldown_seconds,
            cooldown_remaining_seconds,
            cooldown_active,
            available_slots,
        };
        trace!("Current announcement status: {:?}", status);
        status
    }

    /// Broadcasts the current `AnnouncementStatus` to the application's event bus.
    ///
    /// This method is called after any state change that affects the current announcement,
    /// ensuring connected clients are always up-to-date.
    async fn broadcast_status(&self) {
        let status = self.get_current_status().await;
        debug!("Broadcasting announcement status: {:?}", status);
        let event = AppEvent::AnnouncementStatus(status);
        // Log send errors as debug, as it's expected if no clients are connected.
        if let Err(e) = self.event_bus_sender.send(event) {
            debug!(
                "Could not broadcast announcement status (possibly no active SSE subscribers yet): {}",
                e
            );
        }
    }

    /// The background task that automatically cycles the announcement slot.
    ///
    /// This task runs indefinitely, advancing the slot at the configured interval.
    /// It acquires a lock on the `AnnouncementManager` to ensure safe mutable access.
    ///
    /// # Arguments
    /// - `manager_arc`: An `Arc<Mutex<AnnouncementManager>>` to the manager instance.
    /// - `interval_seconds`: The duration in seconds between automatic slot advancements.
    async fn run_auto_cycle_task(
        manager_arc: Arc<Mutex<AnnouncementManager>>,
        interval_seconds: u64,
    ) {
        if interval_seconds == 0 {
            info!("Auto-cycle interval is 0, task will not run.");
            return;
        }
        let mut interval = time::interval(Duration::from_secs(interval_seconds));
        // Skip missed ticks to avoid "catching up" if the system is overloaded.
        interval.set_missed_tick_behavior(MissedTickBehavior::Skip);

        loop {
            // Wait for the next tick of the interval timer.
            interval.tick().await;
            debug!("Auto-cycle timer ticked, acquiring manager lock.");
            // Acquire a lock on the manager to advance the slot.
            let mut manager = manager_arc.lock().await;
            manager.advance_slot().await;
            // Explicitly drop the lock as soon as the operation is done.
            drop(manager);
            debug!("Manager lock released by auto-cycle task.");
        }
    }

    /// Converts a file system `Path` to a web-accessible URL string.
    ///
    /// This function assumes that `file_path` is located *within* the `serve_dir_path`
    /// and constructs a URL relative to the web root.
    ///
    /// # Arguments
    /// - `file_path`: The absolute file system path to the resource.
    /// - `serve_dir_path`: The base directory from which static files are served via HTTP.
    ///
    /// # Returns
    /// An `Option<String>`:
    /// - `Some(String)` if the `file_path` is successfully converted to a web URL.
    /// - `None` if the `file_path` is not under `serve_dir_path` or conversion fails.
    fn to_web_accessible_path(&self, file_path: &Path, serve_dir_path: &Path) -> Option<String> {
        trace!(
            "Converting file path {:?} to web-accessible path relative to serve_dir_path: {:?}",
            file_path,
            serve_dir_path
        );
        match file_path.strip_prefix(serve_dir_path) {
            Ok(relative_path) => {
                let mut web_path_str = "/".to_string();
                // Ensure no double leading slash.
                let relative_lossy = relative_path.to_string_lossy();
                if relative_lossy.starts_with('/') {
                    web_path_str.push_str(relative_lossy.trim_start_matches('/'));
                } else {
                    web_path_str.push_str(&relative_lossy);
                }
                // Replace Windows-style backslashes with forward slashes for URLs.
                let final_path = web_path_str.replace('\\', "/");
                debug!(
                    "Converted file path {:?} to web-accessible URL: {}",
                    file_path, final_path
                );
                Some(final_path)
            }
            Err(_) => {
                warn!(
                    "File {:?} is not within served directory {:?}, cannot create web path.",
                    file_path, serve_dir_path
                );
                None
            }
        }
    }
}
