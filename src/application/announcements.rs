use std::sync::Arc;

type BroadcastSender = tokio::sync::broadcast::Sender<crate::AppEvent>;

use tokio::sync::Mutex;

use crate::{
    announcements::manager::{AnnouncementManager, AnnouncementStatus},
    announcements::ManualTriggerError,
    config::AppConfig,
};

/// Service wrapper around [`AnnouncementManager`] to provide a simpler API surface.
#[derive(Clone)]
pub struct AnnouncementService {
    manager: Arc<Mutex<AnnouncementManager>>,
}

impl AnnouncementService {
    /// Initialise the announcement subsystem and auto-cycle task where applicable.
    pub async fn new(config: Arc<AppConfig>, event_bus: BroadcastSender) -> Self {
        let manager = AnnouncementManager::new(config, event_bus).await;
        Self { manager }
    }

    /// Retrieve the current announcement status snapshot.
    pub async fn current_status(&self) -> AnnouncementStatus {
        let manager = self.manager.lock().await;
        manager.get_current_status().await
    }

    /// Manually advance to the next announcement slot.
    pub async fn manual_advance(&self) -> Result<(), ManualTriggerError> {
        let mut manager = self.manager.lock().await;
        manager.manual_advance_slot().await
    }

    /// Manually trigger a specific announcement slot.
    pub async fn manual_trigger(&self, slot_id: &str) -> Result<(), ManualTriggerError> {
        let mut manager = self.manager.lock().await;
        manager.manual_trigger_slot(slot_id).await
    }
}
