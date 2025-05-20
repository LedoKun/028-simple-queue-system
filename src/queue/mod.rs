// src/queue/mod.rs

//! The `queue` module manages the core logic and data structures for the call queueing system.
//!
//! It provides:
//! - The `QueueManager` responsible for manipulating the queue's state (adding, skipping, completing calls).
//! - The `QueueState` struct, which offers a snapshot view of the current call and historical records,
//!   designed for serialization and communication (e.g., via Server-Sent Events).

// Declare the `manager` submodule.
// This tells Rust to include the code defined in `src/queue/manager.rs`
// as part of this `queue` module.
pub mod manager;

// Re-export the `QueueManager` struct from its `manager` submodule.
// This makes `QueueManager` directly accessible via `crate::queue::QueueManager`,
// simplifying imports for other parts of the crate that need to interact with the queue logic.
pub use manager::QueueManager;

use crate::Call;
use serde::Serialize;
use std::collections::VecDeque;
use tracing::debug;

/// Represents a snapshot of the current state of the call queue.
///
/// This struct is primarily used for:
/// - Providing a consistent view of the queue's status to external consumers (e.g., API responses, SSE clients).
/// - Serialization to formats like JSON for communication.
///
/// It implements `Debug` for easy introspection, `Clone` for creating copies,
/// `Serialize` for converting to other formats, and `PartialEq` for straightforward comparisons in tests.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct QueueState {
    /// The `Call` currently being processed or announced.
    /// It is `None` if no call is currently active.
    pub current_call: Option<Call>,
    /// A history of calls that have been marked as completed.
    /// This is a `VecDeque` (double-ended queue) to efficiently manage history size
    /// by removing the oldest entries when the limit is exceeded.
    pub completed_history: VecDeque<Call>,
    /// A history of calls that have been explicitly skipped.
    /// Similar to `completed_history`, it uses a `VecDeque` for efficient size management.
    pub skipped_history: VecDeque<Call>,
}

impl QueueState {
    // Example of a potential method with a debug log if needed in the future:
    pub fn new(current: Option<Call>, completed: VecDeque<Call>, skipped: VecDeque<Call>) -> Self {
        debug!("Creating new QueueState snapshot.");
        QueueState {
            current_call: current,
            completed_history: completed,
            skipped_history: skipped,
        }
    }
}
