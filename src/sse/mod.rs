// Declare the manager submodule.
// This tells Rust that there's a 'manager.rs' file (or 'manager/mod.rs')
// that belongs to this 'sse' module.
pub mod manager;

// Re-export the SSEManager struct to make it easily accessible
// directly under the 'sse' module namespace.
pub use manager::SSEManager;
