// src/api/mod.rs

//! This module defines the public-facing HTTP API for the Queue Calling System.
//!
//! It serves as the entry point for all API routes, encapsulating them within
//! the `routes` submodule. This structure promotes a clean separation of concerns,
//! keeping API endpoint definitions distinct from the core business logic.

// Declare the `routes` submodule.
// This line makes the code within `src/api/routes.rs` available
// as the `routes` submodule of the `api` module. It's where all
// your Rocket route handlers are defined.
pub mod routes;
