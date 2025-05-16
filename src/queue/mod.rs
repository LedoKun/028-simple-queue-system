// src/queue/mod.rs

pub mod manager;
pub use manager::QueueManager;

use crate::Call;
use serde::Serialize;
use std::collections::VecDeque;

// Ensure Debug and potentially PartialEq if you ever assert_eq on QueueState instances directly
#[derive(Debug, Clone, Serialize, PartialEq)] // Added PartialEq for good measure
pub struct QueueState {
    pub current_call: Option<Call>,
    pub completed_history: VecDeque<Call>,
    pub skipped_history: VecDeque<Call>,
}
