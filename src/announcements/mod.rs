//! Prerecorded announcement discovery and scheduling.

pub mod manager;
pub use manager::{
    AnnouncementManager, AnnouncementSlot, AnnouncementSlotSummary, AnnouncementStatus,
    ManualTriggerError,
};
