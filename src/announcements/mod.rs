// Declare the manager submodule.
// This tells Rust that there's a 'manager.rs' file (or 'manager/mod.rs')
// that belongs to this 'announcements' module.
pub mod manager;

// Re-export the key structs to make them easily accessible
// directly under the 'announcements' module namespace.
pub use manager::AnnouncementManager;
pub use manager::AnnouncementSlot; // Might be useful for API/status representation
pub use manager::AnnouncementStatus; // Essential for broadcasting and API responses
