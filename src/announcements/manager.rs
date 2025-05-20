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
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{
    fs,                               // Async file system operations
    sync::{broadcast, Mutex},         // Async synchronization primitives
    task::JoinHandle,                 // For managing the auto-cycle background task
    time::{self, MissedTickBehavior}, // For asynchronous timers
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
    /// A list of paths to banner image files (e.g., JPG, PNG) within this slot.
    /// These paths are relative to the project root for internal use.
    pub banner_files: Vec<PathBuf>,
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
    /// The configured cooldown duration in seconds for manual announcement triggers.
    pub cooldown_seconds: u64,
    /// The estimated remaining seconds until a manual trigger is allowed again.
    pub cooldown_remaining_seconds: u64,
    /// A flag indicating if the manual trigger cooldown is currently active.
    pub cooldown_active: bool,
}

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

        // Scan the configured base path for announcement slot directories.
        let base_path = config.announcement_base_path();
        let mut slots = Self::scan_announcement_slots(&base_path).await;
        // Sort slots by their ID for consistent ordering.
        slots.sort_by(|a, b| a.id.cmp(&b.id));

        info!("Found {} announcement slots.", slots.len());
        // Log details of each discovered slot.
        for slot in &slots {
            debug!("  - Slot: {}", slot.id);
            debug!("    Audio files: {}", slot.audio_files.len());
            debug!("    Banner files: {}", slot.banner_files.len());
        }

        // Create the core manager instance.
        let manager_core = Self {
            config: Arc::clone(&config),
            slots,
            current_slot_index: 0,               // Start with the first slot.
            last_manual_trigger: Instant::now(), // Initialize cooldown timer.
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

        // Broadcast the initial status after initialization.
        manager_arc_mutex.lock().await.broadcast_status().await;

        manager_arc_mutex
    }

    /// Scans a given base directory for announcement slot subdirectories.
    ///
    /// Each subdirectory is treated as an `AnnouncementSlot` if it contains
    /// at least one supported audio or banner file. Files are added to the slot
    /// based on their extension.
    ///
    /// # Arguments
    /// - `base_path`: The `Path` to the root directory where announcement slots are expected.
    ///
    /// # Returns
    /// A `Vec<AnnouncementSlot>` containing all discovered and parsed slots.
    async fn scan_announcement_slots(base_path: &Path) -> Vec<AnnouncementSlot> {
        info!("Scanning for announcement slots in: {:?}", base_path);
        let mut slots = Vec::new();

        // Validate the base path exists and is a directory.
        if !base_path.exists() || !base_path.is_dir() {
            error!(
                "Announcement base path does not exist or is not a directory: {:?}",
                base_path
            );
            return slots;
        }

        // Read entries in the base directory.
        let mut dir_entries = match fs::read_dir(base_path).await {
            Ok(entries) => entries,
            Err(e) => {
                error!(
                    "Failed to read announcement base directory {:?}: {}",
                    base_path, e
                );
                return slots;
            }
        };

        // Iterate over each entry in the base directory.
        while let Some(entry_result) = dir_entries.next_entry().await.transpose() {
            match entry_result {
                Ok(entry) => {
                    let path = entry.path();
                    // Process only subdirectories as potential slots.
                    if path.is_dir() {
                        let slot_id = path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .into_owned();
                        debug!("Found potential slot directory: {}", slot_id);

                        let mut audio_files = Vec::new();
                        let mut banner_files = Vec::new();

                        // Read files within the slot directory.
                        let mut slot_dir_entries = match fs::read_dir(&path).await {
                            Ok(entries) => entries,
                            Err(e) => {
                                warn!("Could not read slot directory {:?}: {}", path, e);
                                continue; // Skip to next slot if cannot read
                            }
                        };

                        // Iterate over files in the slot directory.
                        while let Some(file_entry_result) =
                            slot_dir_entries.next_entry().await.transpose()
                        {
                            match file_entry_result {
                                Ok(file_entry) => {
                                    let file_path = file_entry.path();
                                    if file_path.is_file() {
                                        // Check file extension to categorize as audio or banner.
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
                                                _ => {
                                                    trace!(
                                                        "Skipping unsupported file type: {:?}",
                                                        file_path
                                                    );
                                                } // Ignore unsupported file types
                                            }
                                        }
                                    } else {
                                        trace!(
                                            "Skipping non-file entry in slot dir: {:?}",
                                            file_path
                                        );
                                    }
                                }
                                Err(e) => {
                                    warn!("Error reading file entry in slot {:?}: {}", path, e);
                                }
                            }
                        }
                        // Only add the slot if it contains any supported media files.
                        if !audio_files.is_empty() || !banner_files.is_empty() {
                            // Sort files within the slot for consistent playback order.
                            audio_files.sort();
                            banner_files.sort();

                            slots.push(AnnouncementSlot {
                                id: slot_id,
                                audio_files,
                                banner_files,
                            });
                        } else {
                            warn!(
                                "Slot directory {} contains no supported audio or banner files. Skipping.",
                                slot_id
                            );
                        }
                    } else {
                        trace!("Skipping non-directory entry in base path: {:?}", path);
                    }
                }
                Err(e) => {
                    warn!("Error reading directory entry in {:?}: {}", base_path, e);
                }
            }
        }
        debug!(
            "Finished scanning. Found {} valid announcement slots.",
            slots.len()
        );
        slots
    }

    /// Advances the `current_slot_index` to the next slot in sequence.
    ///
    /// If there are no slots, a warning is logged and no action is taken.
    /// The index wraps around to 0 after reaching the last slot.
    /// After advancing, it broadcasts the new announcement status.
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
    /// and the status is broadcast to reflect the remaining cooldown time.
    pub async fn manual_advance_slot(&mut self) {
        info!("Manual announcement slot advancement triggered.");
        let cooldown_duration =
            Duration::from_secs(self.config.announcement_manual_trigger_cooldown_seconds);
        let elapsed = self.last_manual_trigger.elapsed();

        // Check if cooldown has passed or if cooldown is disabled (interval is 0).
        if elapsed >= cooldown_duration
            || self.config.announcement_manual_trigger_cooldown_seconds == 0
        {
            debug!("Cooldown period passed or disabled, performing manual advancement.");
            self.last_manual_trigger = Instant::now(); // Reset cooldown timer.
            self.advance_slot().await; // Perform the actual slot advancement.
        } else {
            let remaining = cooldown_duration - elapsed;
            warn!(
                "Manual trigger on cooldown. {} seconds remaining.",
                remaining.as_secs()
            );
            // Even if on cooldown, broadcast status to update clients with remaining time.
            self.broadcast_status().await;
        }
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

        // Convert file system paths of banner files to web-accessible URLs.
        let current_banner_playlist = current_slot
            .map(|slot| {
                slot.banner_files
                    .iter()
                    .filter_map(|p| self.to_web_accessible_path(p, serve_dir_path))
                    .collect()
            })
            .unwrap_or_default();

        // Calculate cooldown status.
        let cooldown_seconds = self.config.announcement_manual_trigger_cooldown_seconds;
        let elapsed_since_last_trigger = self.last_manual_trigger.elapsed();
        let cooldown_active = elapsed_since_last_trigger < Duration::from_secs(cooldown_seconds)
            && cooldown_seconds > 0;

        let cooldown_remaining_seconds = if cooldown_active {
            cooldown_seconds.saturating_sub(elapsed_since_last_trigger.as_secs())
        } else {
            0
        };

        let status = AnnouncementStatus {
            current_slot_id,
            current_audio_playlist,
            current_banner_playlist,
            cooldown_seconds,
            cooldown_remaining_seconds,
            cooldown_active,
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
