// src/announcements/mod.rs

//! The `announcements` module handles the management of audio and banner announcements
//! within the Queue Calling System.
//!
//! It defines the structure and logic for organizing, scheduling, and
//! providing the status of announcements. The core component is the
//! `AnnouncementManager`, which orchestrates the announcement playback
//! according to the configured slots and timing.
//!
//! This module also exports the data structures used to represent
//! announcements and their status, allowing other parts of the application
//! to easily interact with the announcement system.

// Declare the `manager` submodule.
// This line tells the Rust compiler that the implementation details
// for announcement management are located in the `manager.rs` file
// (or in a `manager/mod.rs` directory structure).
pub mod manager;

// Re-export the key structs from the `manager` submodule.
// This makes these structs directly accessible from the `announcements` module,
// simplifying imports in other parts of the application. For example:
//
// Instead of:
// use crate::announcements::manager::{AnnouncementManager, AnnouncementSlot, AnnouncementStatus};
//
// Users can write:
// use crate::announcements::{AnnouncementManager, AnnouncementSlot, AnnouncementStatus};
pub use manager::AnnouncementManager;
pub use manager::AnnouncementSlot;
pub use manager::AnnouncementSlotSummary;
pub use manager::AnnouncementStatus;
pub use manager::ManualTriggerError;
