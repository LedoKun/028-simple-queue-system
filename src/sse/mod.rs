// src/sse/mod.rs

//! The `sse` module provides functionality for Server-Sent Events (SSE) within the
//! Queue Calling System.
//!
//! It encapsulates the `SSEManager`, which is responsible for formatting
//! application events (`AppEvent`s) into a streamable format that can be
//! consumed by web clients for real-time updates.

// Declare the `manager` submodule.
// This line informs the Rust compiler that there's a file named `manager.rs`
// (or a directory `manager/` containing `mod.rs`) within this `sse` directory.
// The contents of `manager.rs` will form the `manager` submodule of `sse`.
pub mod manager;

// Re-export the `SSEManager` struct from its submodule.
// This `pub use` statement makes `SSEManager` directly accessible when
// someone imports `crate::sse`, simplifying the import path for other modules.
// Instead of `use crate::sse::manager::SSEManager;`, users can simply write
// `use crate::sse::SSEManager;`.
pub use manager::SSEManager;
