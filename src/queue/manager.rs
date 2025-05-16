// src/queue/manager.rs
use crate::Call;
use chrono::{DateTime, Utc};
use std::collections::VecDeque;
use std::time::SystemTime;

#[derive(Debug)]
pub struct QueueManager {
    current_call: Option<Call>,
    completed_history: VecDeque<Call>,
    skipped_history: VecDeque<Call>,
    max_history_size: usize,
    max_skipped_history_size: usize,
}

impl QueueManager {
    pub fn new(max_history_size: usize, max_skipped_history_size: usize) -> Self {
        tracing::info!(
            "Initializing QueueManager with max_history_size={} and max_skipped_history_size={}",
            max_history_size,
            max_skipped_history_size
        );
        QueueManager {
            current_call: None,
            completed_history: VecDeque::with_capacity(max_history_size),
            skipped_history: VecDeque::with_capacity(max_skipped_history_size),
            max_history_size,
            max_skipped_history_size,
        }
    }

    fn format_identifier(original_id: &str) -> String {
        if original_id.is_empty() {
            return String::new();
        }
        let mut chars = original_id.chars();
        let first_char = chars.next().unwrap().to_ascii_uppercase();
        let digit_part_str: String = chars.collect();
        if !digit_part_str.is_empty() && digit_part_str.chars().all(|c| c.is_ascii_digit()) {
            if digit_part_str.len() == 1 {
                match digit_part_str.parse::<u32>() {
                    Ok(num) => format!("{}{:02}", first_char, num),
                    Err(_) => {
                        tracing::warn!("Could not parse supposed single digit '{}' from id '{}', using as string.", digit_part_str, original_id);
                        format!("{}{}", first_char, digit_part_str)
                    }
                }
            } else {
                format!("{}{}", first_char, digit_part_str)
            }
        } else {
            format!("{}{}", first_char, digit_part_str)
        }
    }

    fn remove_call_from_all_queues(&mut self, call_id: &str) -> Option<Call> {
        let mut found_call: Option<Call> = None;

        if let Some(current) = &self.current_call {
            if current.id == call_id {
                tracing::debug!("QueueManager::remove_call_from_all_queues: ID '{}' found in current_call. Removing.", call_id);
                found_call = self.current_call.take();
            }
        }

        if let Some(pos) = self.completed_history.iter().position(|c| c.id == call_id) {
            tracing::debug!("QueueManager::remove_call_from_all_queues: ID '{}' found in completed_history. Removing.", call_id);
            let removed_from_history = self.completed_history.remove(pos).unwrap();
            if found_call.is_none() {
                found_call = Some(removed_from_history);
            }
        }

        if let Some(pos) = self.skipped_history.iter().position(|c| c.id == call_id) {
            tracing::debug!("QueueManager::remove_call_from_all_queues: ID '{}' found in skipped_history. Removing.", call_id);
            let removed_from_skipped = self.skipped_history.remove(pos).unwrap();
            if found_call.is_none() {
                found_call = Some(removed_from_skipped);
            }
        }
        
        if found_call.is_some() {
            tracing::info!("QueueManager::remove_call_from_all_queues: ID '{}' was present in one or more queues and has been removed.", call_id);
        } else {
            tracing::debug!("QueueManager::remove_call_from_all_queues: ID '{}' was not found in any active queue location.", call_id);
        }
        found_call
    }


    pub fn add_call(&mut self, original_id_param: String, location_param: String) -> Option<&Call> {
        let formatted_id = Self::format_identifier(&original_id_param);
        let now: DateTime<Utc> = SystemTime::now().into();

        tracing::info!(
            "QueueManager::add_call: Adding original_id='{}' (formatted_id='{}'), location='{}'. Previous current_call: {:?}",
            original_id_param,
            formatted_id,
            location_param,
            self.current_call.as_ref().map(|c| &c.id)
        );

        let call_to_add = self.remove_call_from_all_queues(&formatted_id)
            .map_or_else(
                || Call { 
                    id: formatted_id.clone(),
                    original_id: original_id_param.clone(), 
                    location: location_param.clone(),       
                    timestamp: now,
                },
                |mut existing_call| { 
                    tracing::info!("QueueManager::add_call: Recalling/updating existing call data for ID '{}'. Original_id: '{}' -> '{}', Location: '{}' -> '{}'.",
                        formatted_id, existing_call.original_id, original_id_param, existing_call.location, location_param
                    );
                    existing_call.original_id = original_id_param.clone(); // Use .clone() here
                    existing_call.location = location_param.clone();     // Use .clone() here
                    existing_call.timestamp = now;
                    existing_call
                }
            );

        if let Some(previous_current_call) = self.current_call.take() {
            if previous_current_call.id != call_to_add.id {
                 tracing::info!(
                    "QueueManager::add_call: Moving previous current_call '{}' to completed_history.",
                    previous_current_call.id
                );
                self.completed_history.push_back(previous_current_call);
                self.enforce_max_completed_history_size();
            } else {
                tracing::info!("QueueManager::add_call: Previous current call was same as call being added ('{}'), already handled.", call_to_add.id);
            }
        } else {
            tracing::info!("QueueManager::add_call: No previous current_call to move to history, or it was the same call.");
        }
        
        tracing::info!("QueueManager::add_call: Setting new current_call to: id='{}', original_id='{}', location='{}'.", call_to_add.id, call_to_add.original_id, call_to_add.location);
        self.current_call = Some(call_to_add);

        self.current_call.as_ref()
    }

    pub fn skip_current_call(&mut self) -> Option<Call> {
        tracing::info!("QueueManager::skip_current_call: Attempting. Current: {:?}", self.current_call.as_ref().map(|c| &c.id));
        if let Some(mut call_to_skip) = self.current_call.take() {
            tracing::info!("QueueManager::skip_current_call: Skipping '{}'.", call_to_skip.id);
            self.remove_call_from_all_queues(&call_to_skip.id); 

            call_to_skip.timestamp = SystemTime::now().into(); 
            self.skipped_history.push_back(call_to_skip.clone());
            self.enforce_max_skipped_history_size();
            tracing::info!("QueueManager::skip_current_call: '{}' moved to skipped_history. Current is now None.", call_to_skip.id);
            Some(call_to_skip)
        } else {
            tracing::warn!("QueueManager::skip_current_call: No current call to skip.");
            None
        }
    }

    pub fn complete_current_call(&mut self) -> Option<Call> {
        tracing::info!("QueueManager::complete_current_call: Attempting. Current: {:?}", self.current_call.as_ref().map(|c| &c.id));
        if let Some(mut call_to_complete) = self.current_call.take() {
            tracing::info!("QueueManager::complete_current_call: Completing '{}'.", call_to_complete.id);
            self.remove_call_from_all_queues(&call_to_complete.id); 

            call_to_complete.timestamp = SystemTime::now().into();
            self.completed_history.push_back(call_to_complete.clone());
            self.enforce_max_completed_history_size();
            tracing::info!("QueueManager::complete_current_call: '{}' moved to completed_history. Current is now None.", call_to_complete.id);
            Some(call_to_complete)
        } else {
            tracing::warn!("QueueManager::complete_current_call: No current call to complete.");
            None
        }
    }

    pub fn add_to_skipped_directly(&mut self, original_id_param: String, location_param: String) -> Option<Call> {
        let formatted_id = Self::format_identifier(&original_id_param);
        let now: DateTime<Utc> = SystemTime::now().into();
        tracing::info!("QueueManager::add_to_skipped_directly: Attempting for original_id='{}' (formatted_id='{}'), location='{}'.", original_id_param, formatted_id, location_param);

        let call_data = self.remove_call_from_all_queues(&formatted_id)
            .map_or_else(
                || Call { 
                    id: formatted_id.clone(),
                    original_id: original_id_param.clone(), // Clone here
                    location: location_param.clone(),     // Clone here
                    timestamp: now,
                },
                |mut existing_call| { 
                    tracing::info!("QueueManager::add_to_skipped_directly: Existing call data found for ID '{}'. Updating original_id: '{}' -> '{}', location: '{}' -> '{}'.",
                        formatted_id, existing_call.original_id, original_id_param, existing_call.location, location_param
                    );
                    existing_call.original_id = original_id_param.clone(); // Clone here
                    existing_call.location = location_param.clone();     // Clone here
                    existing_call.timestamp = now;
                    existing_call
                }
            );
        
        tracing::info!("QueueManager::add_to_skipped_directly: Adding call id='{}' directly to skipped_history.", call_data.id);
        self.skipped_history.push_back(call_data.clone()); 
        self.enforce_max_skipped_history_size();
        
        Some(call_data)
    }
    
    pub fn get_current_call(&self) -> Option<&Call> {
        self.current_call.as_ref()
    }

    pub fn get_completed_history(&self) -> &VecDeque<Call> {
        &self.completed_history
    }

    pub fn get_skipped_history(&self) -> &VecDeque<Call> {
        &self.skipped_history
    }

    fn enforce_max_completed_history_size(&mut self) {
        while self.completed_history.len() > self.max_history_size {
            if let Some(removed) = self.completed_history.pop_front() {
                tracing::trace!("QueueManager: Enforcing max_history_size. Removed oldest from completed_history: {}", removed.id);
            }
        }
    }

    fn enforce_max_skipped_history_size(&mut self) {
        while self.skipped_history.len() > self.max_skipped_history_size {
             if let Some(removed) = self.skipped_history.pop_front() {
                tracing::trace!("QueueManager: Enforcing max_skipped_history_size. Removed oldest from skipped_history: {}", removed.id);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_identifier_logic() {
        assert_eq!(QueueManager::format_identifier("A1"), "A01");
        assert_eq!(QueueManager::format_identifier("a1"), "A01");
        assert_eq!(QueueManager::format_identifier("B10"), "B10");
        assert_eq!(QueueManager::format_identifier(""), "");
    }

    #[test]
    fn test_add_call_sequence_t1_to_t4_behavior_and_uniqueness() {
        let mut manager = QueueManager::new(5, 5);

        // T1
        assert!(manager.get_current_call().is_none());
        assert!(manager.get_completed_history().is_empty());
        assert!(manager.get_skipped_history().is_empty());

        // T2: Call A100, 4
        manager.add_call("A100".to_string(), "4".to_string());
        let current = manager.get_current_call().unwrap();
        assert_eq!(current.id, "A100");
        assert!(manager.get_completed_history().is_empty());

        // T3: Call A101, 4
        manager.add_call("A101".to_string(), "4".to_string());
        let current = manager.get_current_call().unwrap();
        assert_eq!(current.id, "A101");
        let completed = manager.get_completed_history();
        assert_eq!(completed.len(), 1);
        assert_eq!(completed[0].id, "A100");

        // T4: Call A102, 4
        manager.add_call("A102".to_string(), "4".to_string());
        let current = manager.get_current_call().unwrap();
        assert_eq!(current.id, "A102");
        let completed = manager.get_completed_history();
        assert_eq!(completed.len(), 2);
        assert_eq!(completed[1].id, "A101"); 
        assert_eq!(completed[0].id, "A100"); 

        manager.add_call("A100".to_string(), "new_loc_for_A100".to_string());
        let current = manager.get_current_call().unwrap();
        assert_eq!(current.id, "A100");
        assert_eq!(current.location, "new_loc_for_A100");
        let completed = manager.get_completed_history(); // A102 (prev current), A101
        assert_eq!(completed.len(), 2); 
        assert_eq!(completed.iter().find(|c| c.id == "A100"), None); 
        assert_eq!(completed.iter().find(|c| c.id == "A102").unwrap().id, "A102");
        assert_eq!(completed.iter().find(|c| c.id == "A101").unwrap().id, "A101");


        assert!(manager.get_skipped_history().is_empty());
    }

    #[test]
    fn test_skip_current_call_uniqueness() {
        let mut manager = QueueManager::new(5, 5);
        manager.add_call("S1".to_string(), "1".to_string()); 
        manager.add_call("S2".to_string(), "2".to_string()); 
        
        assert_eq!(manager.get_current_call().unwrap().id, "S2");
        assert_eq!(manager.get_completed_history().front().unwrap().id, "S1");

        manager.skip_current_call(); 
        assert!(manager.get_current_call().is_none());
        assert_eq!(manager.get_skipped_history().front().unwrap().id, "S2");
        assert_eq!(manager.get_completed_history().front().unwrap().id, "S1"); 
    }
    
    #[test]
    fn test_add_to_skipped_directly_t5_and_uniqueness() {
        let mut manager = QueueManager::new(5, 5);
        manager.add_call("A100".to_string(), "4".to_string());
        manager.add_call("A101".to_string(), "4".to_string());
        manager.add_call("A102".to_string(), "4".to_string()); 

        manager.add_to_skipped_directly("A104".to_string(), "4".to_string());
        assert_eq!(manager.get_current_call().unwrap().id, "A102"); 
        assert_eq!(manager.get_completed_history().len(), 2);   
        let skipped = manager.get_skipped_history();
        assert_eq!(skipped.len(), 1);
        assert_eq!(skipped[0].id, "A104");

        manager.add_to_skipped_directly("A102".to_string(), "new_loc_A102".to_string());
        assert!(manager.get_current_call().is_none()); 
        let skipped = manager.get_skipped_history();
        assert_eq!(skipped.len(), 2); 
        assert!(skipped.iter().any(|c| c.id == "A102" && c.location == "new_loc_A102"));
        assert!(skipped.iter().any(|c| c.id == "A104"));

        manager.add_call("C1".to_string(), "1".to_string()); 
        manager.add_to_skipped_directly("A100".to_string(), "new_loc_A100".to_string());
        assert_eq!(manager.get_completed_history().iter().find(|c| c.id == "A100"), None); 
        let skipped = manager.get_skipped_history(); 
        assert!(skipped.iter().any(|c| c.id == "A100" && c.location == "new_loc_A100"));
         assert_eq!(skipped.len(), 3); // A104, A102, A100 were present. C1 displaced nothing from skipped.
    }
}