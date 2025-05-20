// src/tts/mod.rs

//! This module provides the core Text-to-Speech (TTS) functionality for the
//! Queue Calling System.
//!
//! It primarily exposes the `TTSManager`, which handles the generation,
//! caching, and playback (via events) of spoken audio for call announcements.

// Declare the `manager` submodule.
// This makes the code within `src/tts/manager.rs` available to this module
// and potentially to other parts of the crate if re-exported.
pub mod manager;

// Re-export the `TTSManager` struct from the `manager` submodule.
// This allows other modules to import `TTSManager` directly from `crate::tts::TTSManager`
// instead of the longer `crate::tts::manager::TTSManager`, simplifying imports.
pub use manager::TTSManager;
