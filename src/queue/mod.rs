// src/queue/mod.rs

//! Queue data structures and manager re-exports.

pub mod manager;

pub use manager::QueueManager;

use crate::Call;
use serde::Serialize;
use std::collections::VecDeque;

/// Snapshot of the queue state shared with API consumers.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct QueueState {
    pub current_call: Option<Call>,
    pub completed_history: VecDeque<Call>,
    pub skipped_history: VecDeque<Call>,
}
