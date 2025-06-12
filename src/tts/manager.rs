// src/tts/manager.rs

//! Manages Text-to-Speech (TTS) generation and caching for the Queue Calling System.
//!
//! This module is responsible for:
//! - Initializing an HTTP client for external TTS services (like Google Translate TTS).
//! - Handling the caching of generated audio files to reduce redundant API calls.
//! - Tokenizing input text into smaller chunks suitable for TTS API limits.
//! - Generating and managing user agents to avoid rate limiting or blocking by TTS services.
//! - Providing methods to trigger TTS generation and retrieve supported languages.
//! - Broadcasting `AppEvent::TTSComplete` events when audio generation finishes.
//! - Implementing retry logic for robust TTS generation with exponential backoff.

use fake_user_agent::get_rua;
use regex::Regex;
use reqwest::header::USER_AGENT;
use reqwest::Client as ReqwestClient;
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, SystemTime}, // Import Duration for retry delays
};
use tokio::sync::{broadcast, Mutex};
use tokio::{fs as tokio_fs, io::AsyncWriteExt, task, time::sleep}; // Import sleep for retry delays
use tracing::{debug, error, info, trace, warn}; // Import tracing macros
use urlencoding::encode as url_encode;

use crate::{config::AppConfig, AppEvent};

/// Base URL for the Google Translate Text-to-Speech API.
const GOOGLE_TTS_URL_BASE: &str = "http://translate.google.com/translate_tts";
/// Maximum number of characters allowed per text chunk for the Google TTS API.
/// Text longer than this will be split and concatenated.
const MAX_CHARS_PER_CHUNK: usize = 200;
/// Maximum attempts to generate a unique user agent before potentially reusing one.
const MAX_UA_GENERATION_ATTEMPTS: u8 = 10;
/// Maximum number of retry attempts for TTS API requests.
const MAX_TTS_RETRY_ATTEMPTS: u8 = 5;
/// Base delay for exponential backoff retry strategy (in milliseconds).
const RETRY_BASE_DELAY_MS: u64 = 200;

/// Manages Text-to-Speech (TTS) operations, including fetching audio from
/// external services, caching, and text tokenization.
///
/// This struct holds the necessary HTTP client, configuration, event bus sender,
/// and state for handling TTS requests and caching.
#[derive(Debug)]
pub struct TTSManager {
    /// Application configuration, providing settings like cache paths and timeouts.
    config: Arc<AppConfig>,
    /// HTTP client used to make requests to the Google TTS API.
    http_client: ReqwestClient,
    /// Sender for the application-wide event bus, used to broadcast `TTSComplete` events.
    event_bus_sender: broadcast::Sender<AppEvent>,
    /// A map of supported language codes to their display names, parsed from `AppConfig`.
    supported_languages_map: HashMap<String, String>,
    /// A mutex-protected HashSet to store user agents recently used for TTS requests,
    /// to avoid immediate repetition and potential rate limiting.
    last_call_uas: Arc<Mutex<HashSet<String>>>,
}

impl TTSManager {
    /// Creates a new `TTSManager` instance.
    ///
    /// This function initializes the HTTP client, parses supported languages from the
    /// configuration, compiles the text tokenizer regex, and ensures the TTS cache
    /// directory exists asynchronously.
    ///
    /// # Arguments
    /// - `config`: An `Arc` to the shared application configuration.
    /// - `event_bus_sender`: A `broadcast::Sender` for `AppEvent`s, used to notify
    ///   other parts of the application when TTS generation is complete.
    ///
    /// # Returns
    /// A new `TTSManager` instance.
    pub fn new(config: Arc<AppConfig>, event_bus_sender: broadcast::Sender<AppEvent>) -> Self {
        info!("Initializing TTSManager for Google TTS...");
        debug!("TTSManager new: Using config: {:?}", config); // Debug config at init

        // Build the HTTP client with a configured timeout.
        let http_client = ReqwestClient::builder()
            .timeout(config.tts_external_service_timeout())
            .build()
            .expect("Failed to create HTTP client for TTSManager");
        debug!(
            "TTSManager new: HTTP client built with timeout: {:?}",
            config.tts_external_service_timeout()
        );

        // Parse supported languages from the configuration string into a HashMap.
        // This allows quick lookup of language support.
        let supported_languages_map: HashMap<String, String> = config
            .tts_supported_languages
            .split(',') // Split by comma-separated entries
            .filter_map(|s| {
                let parts: Vec<&str> = s.trim().split(':').collect(); // Split into code and display name
                if parts.len() == 2 {
                    trace!("TTSManager new: Parsing language pair: {:?}", parts); // Trace language parsing
                    Some((parts[0].to_string(), parts[1].to_string()))
                } else if parts.len() == 1 && !parts[0].is_empty() {
                    trace!("TTSManager new: Parsing single language code: {:?}", parts); // Trace language parsing (e.g., "es" without display name)
                    Some((parts[0].to_string(), parts[0].to_string())) // Use code as display name if not provided
                } else {
                    trace!("TTSManager new: Skipping invalid language entry: {:?}", s); // Trace invalid language entry
                    None // Skip malformed or empty entries
                }
            })
            .collect();
        info!(
            "Supported TTS languages (from config): {:?}",
            supported_languages_map
        );

        info!("User agents will be fetched using fake_user_agent::get_rua() with non-repetition logic.");

        // Ensure the TTS audio cache directory exists. This is done in a separate
        // Tokio task to avoid blocking the `new` function.
        let audio_cache_base_path = config.gtts_cache_base_path.clone();
        debug!(
            "TTSManager new: Ensuring TTS cache directory exists: {:?}",
            audio_cache_base_path
        );
        tokio::spawn(async move {
            if let Err(e) = tokio_fs::create_dir_all(&audio_cache_base_path).await {
                error!(
                    "Failed to create TTS audio cache directory {:?}: {}",
                    audio_cache_base_path, e
                );
                // In a production app, you might want to panic here or report this critical error more aggressively.
            } else {
                info!(
                    "Ensured TTS audio cache directory exists: {:?}",
                    audio_cache_base_path
                );
            }
        });

        TTSManager {
            config,
            http_client,
            event_bus_sender,
            supported_languages_map,
            last_call_uas: Arc::new(Mutex::new(HashSet::new())), // Initialize set for tracking recent UAs
        }
    }

    /// Splits a long text into shorter chunks suitable for the TTS API.
    /// This function is ported from the logic in `splitLongText.ts`.
    ///
    /// # Arguments
    /// - `text`: The input string to be split.
    /// - `max_length`: The maximum length of each chunk.
    ///
    /// # Returns
    /// A `Result<Vec<String>, String>` containing a vector of text chunks or an error.
    fn split_long_text(&self, text: &str, max_length: usize) -> Result<Vec<String>, String> {
        // This regex combines whitespace and default punctuation from the TS source.
        // It uses correct Rust string escapes: \u{...} for Unicode, \" for quotes, and \\\\ for a literal backslash.
        let space_and_punct_regex =
            Regex::new("[\u{FEFF}\u{A0}\\s!\"#$%&'()*+,-./:;<=>?@\\\\^_`{|}~]+")
                .expect("Failed to compile punctuation regex");

        let is_space_or_punct =
            |c: char| -> bool { space_and_punct_regex.is_match(&c.to_string()) };

        let last_index_of_space_or_punct = |s: &str, left: usize, right: usize| -> Option<usize> {
            s[left..=right].rfind(is_space_or_punct)
        };

        let mut result: Vec<String> = Vec::new();
        let mut start = 0;

        while start < text.len() {
            if text.len() - start <= max_length {
                result.push(text[start..].to_string());
                break;
            }

            let mut end = start + max_length - 1;

            if let (Some(char_at_end), Some(char_after_end)) =
                (text.chars().nth(end), text.chars().nth(end + 1))
            {
                if is_space_or_punct(char_at_end) || is_space_or_punct(char_after_end) {
                    result.push(text[start..=end].to_string());
                    start = end + 1;
                    continue;
                }
            }

            if let Some(split_pos) = last_index_of_space_or_punct(text, start, end) {
                end = start + split_pos;
                result.push(text[start..=end].to_string());
                start = end + 1;
            } else {
                return Err(format!(
                    "The word is too long to split into a short text: '{}...'",
                    &text[start..start + max_length]
                ));
            }
        }

        Ok(result)
    }

    /// Triggers the asynchronous generation of TTS audio for a given call ID, location, and language.
    ///
    /// This function performs initial validation (language support) and then spawns a separate
    /// Tokio task to handle the actual audio fetching, caching, and event broadcasting.
    ///
    /// # Arguments
    /// - `id`: The unique ID of the call (e.g., a queue number).
    /// - `location`: The location associated with the call (e.g., "Counter 1").
    /// - `lang`: The language code for the TTS audio (e.g., "th", "en-uk").
    ///
    /// # Returns
    /// - `Ok(())` if the TTS generation task is successfully spawned.
    /// - `Err(String)` if the provided language is not supported.
    pub fn trigger_tts_generation(
        &self,
        id: String,
        location: String,
        lang: String,
    ) -> Result<(), String> {
        info!(
            "Google TTS generation task starting for ID: {}, Location: {}, Lang: {}",
            id, location, lang
        );
        debug!(
            "Trigger TTS Generation: Checking language support for '{}'",
            lang
        );

        // Validate if the requested language is supported.
        if !self.supported_languages_map.contains_key(&lang) {
            let error_msg = format!("Unsupported language for Google TTS: {}", lang);
            warn!("{}", error_msg);
            return Err(error_msg);
        }
        debug!("Trigger TTS Generation: Language '{}' is supported.", lang);

        // Clone necessary data for the spawned asynchronous task.
        let config_clone = Arc::clone(&self.config);
        let http_client_clone = self.http_client.clone();
        let sender_clone = self.event_bus_sender.clone();
        let last_call_uas_clone = Arc::clone(&self.last_call_uas);

        // Build the full text to be spoken for the call.
        let text_for_this_lang = Self::build_speak_text(&id, &location, &lang);
        debug!(
            "Trigger TTS Generation: Constructed speak text: '{}'",
            text_for_this_lang
        );
        // Tokenize the text into smaller parts.
        let tokenized_parts = match self.split_long_text(&text_for_this_lang, MAX_CHARS_PER_CHUNK) {
            Ok(parts) => parts,
            Err(e) => {
                error!("Failed to tokenize text: {}", e);
                return Err(e);
            }
        };
        debug!(
            "Trigger TTS Generation: Tokenized text into {} parts.",
            tokenized_parts.len()
        );

        // Capture parameters for the spawned task.
        let task_id = id;
        let task_location = location;
        let task_lang = lang;

        // Spawn a new asynchronous task to perform the TTS generation.
        // This prevents blocking the main thread/Rocket handler.
        debug!("Trigger TTS Generation: Spawning async task for TTS generation.");
        task::spawn(async move {
            Self::perform_google_tts_task(
                config_clone,
                http_client_clone,
                sender_clone,
                last_call_uas_clone,
                task_id,
                task_location,
                task_lang,
                tokenized_parts,
            )
            .await;
        });

        Ok(())
    }

    /// Generates a cache file path for a given TTS audio.
    ///
    /// The path is constructed from the base cache directory, language, and sanitized
    /// call ID and location.
    ///
    /// # Arguments
    /// - `cache_base_path`: The root directory for the TTS cache.
    /// - `lang`: The language code.
    /// - `call_id`: The ID of the call.
    /// - `call_location`: The location of the call.
    ///
    /// # Returns
    /// A `PathBuf` representing the full path to the cached audio file.
    fn get_cache_file_path(
        cache_base_path: &Path,
        lang: &str,
        call_id: &str,
        call_location: &str,
    ) -> PathBuf {
        trace!(
            "Get Cache File Path: Building path for lang: '{}', id: '{}', loc: '{}'",
            lang,
            call_id,
            call_location
        );
        // Helper closure to sanitize strings for use in file names.
        let sanitize = |s: &str| {
            s.chars()
                .map(|c| {
                    // Allow alphanumeric, hyphen, and dot; replace others with underscore.
                    if c.is_alphanumeric() || c == '-' || c == '.' {
                        c
                    } else {
                        '_'
                    }
                })
                .collect::<String>()
        };
        let lang_sanitized = sanitize(lang);
        let call_id_sanitized = sanitize(call_id);
        let call_location_sanitized = sanitize(call_location);

        // Construct the full path: `cache_base_path / lang / {id}-{location}.mp3`
        let path = cache_base_path.join(lang_sanitized).join(format!(
            "{}-{}.mp3",
            call_id_sanitized, call_location_sanitized
        ));
        trace!("Get Cache File Path: Generated path: {:?}", path);
        path
    }

    /// Performs a single TTS API request with retry logic.
    ///
    /// This function implements exponential backoff retry strategy for robust TTS generation.
    /// It will retry up to MAX_TTS_RETRY_ATTEMPTS times on failure.
    ///
    /// # Arguments
    /// - `http_client`: The HTTP client to use for the request.
    /// - `tts_url`: The TTS API URL to request.
    /// - `user_agent_str`: The User-Agent string to use for the request.
    /// - `part_idx`: The index of the current text part (for logging).
    /// - `total_parts`: The total number of text parts (for logging).
    /// - `lang`: The language code (for logging).
    ///
    /// # Returns
    /// A `Result<Vec<u8>, String>` containing the audio bytes on success or an error message on failure.
    async fn fetch_tts_with_retry(
        http_client: &ReqwestClient,
        tts_url: &str,
        user_agent_str: &str,
        part_idx: usize,
        total_parts: usize,
        lang: &str,
    ) -> Result<Vec<u8>, String> {
        let mut attempt = 1;

        loop {
            debug!(
                "Fetching Google TTS part {}/{} (lang {}) - attempt {}/{}: URL: {}, User-Agent: {}",
                part_idx + 1,
                total_parts,
                lang,
                attempt,
                MAX_TTS_RETRY_ATTEMPTS,
                tts_url,
                user_agent_str
            );

            match http_client
                .get(tts_url)
                .header(USER_AGENT, user_agent_str)
                .send()
                .await
            {
                Ok(response) => {
                    debug!(
                        "Fetch TTS with Retry: Received response status: {} for part {}/{} (attempt {})",
                        response.status(),
                        part_idx + 1,
                        total_parts,
                        attempt
                    );

                    if response.status().is_success() {
                        match response.bytes().await {
                            Ok(bytes) => {
                                info!(
                                    "Successfully fetched TTS part {}/{} (lang {}) on attempt {} - {} bytes received",
                                    part_idx + 1,
                                    total_parts,
                                    lang,
                                    attempt,
                                    bytes.len()
                                );
                                return Ok(bytes.to_vec());
                            }
                            Err(e) => {
                                let error_msg = format!(
                                    "Failed to get bytes from Google TTS part {}/{} (lang {}) on attempt {}: {}",
                                    part_idx + 1,
                                    total_parts,
                                    lang,
                                    attempt,
                                    e
                                );

                                if attempt >= MAX_TTS_RETRY_ATTEMPTS {
                                    error!("{} - Maximum retries exceeded", error_msg);
                                    return Err(error_msg);
                                } else {
                                    warn!("{} - Retrying...", error_msg);
                                }
                            }
                        }
                    } else {
                        let status = response.status();
                        let error_body = response
                            .text()
                            .await
                            .unwrap_or_else(|_| "Could not read error body".to_string());
                        let error_msg = format!(
                            "Google TTS part {}/{} (lang {}) request failed on attempt {}: Status {}, Body: {}",
                            part_idx + 1,
                            total_parts,
                            lang,
                            attempt,
                            status,
                            error_body
                        );

                        if attempt >= MAX_TTS_RETRY_ATTEMPTS {
                            error!("{} - Maximum retries exceeded", error_msg);
                            return Err(error_msg);
                        } else {
                            warn!("{} - Retrying...", error_msg);
                        }
                    }
                }
                Err(e) => {
                    let error_msg = format!(
                        "HTTP request to Google TTS part {}/{} (lang {}) failed on attempt {}: {}",
                        part_idx + 1,
                        total_parts,
                        lang,
                        attempt,
                        e
                    );

                    if attempt >= MAX_TTS_RETRY_ATTEMPTS {
                        error!("{} - Maximum retries exceeded", error_msg);
                        return Err(error_msg);
                    } else {
                        warn!("{} - Retrying...", error_msg);
                    }
                }
            }

            // Calculate exponential backoff delay
            let delay_ms = RETRY_BASE_DELAY_MS * (1 << (attempt - 1)); // 200ms, 400ms, 800ms, 1600ms, 3200ms
            let delay_duration = Duration::from_millis(delay_ms);

            debug!(
                "Retrying TTS request for part {}/{} in {}ms (attempt {}/{})",
                part_idx + 1,
                total_parts,
                delay_ms,
                attempt + 1,
                MAX_TTS_RETRY_ATTEMPTS
            );

            sleep(delay_duration).await;
            attempt += 1;
        }
    }

    /// Performs the actual Google TTS generation task. This is an asynchronous operation
    /// executed in a spawned Tokio task.
    ///
    /// It checks for cached audio first. If not found, it iterates through text parts,
    /// fetches audio from Google TTS with retry logic, concatenates them, writes to cache,
    /// prunes the cache, and then broadcasts a `TTSComplete` event.
    ///
    /// # Arguments
    /// - `config`: Shared application configuration.
    /// - `http_client`: Reqwest HTTP client for API calls.
    /// - `sender`: Event bus sender to broadcast completion events.
    /// - `last_call_uas_lock`: Mutex-protected HashSet for recent user agents.
    /// - `id`: Call ID.
    /// - `location`: Call location.
    /// - `lang`: Language code.
    /// - `text_parts`: Pre-tokenized text chunks to synthesize.
    async fn perform_google_tts_task(
        config: Arc<AppConfig>,
        http_client: ReqwestClient,
        sender: broadcast::Sender<AppEvent>,
        last_call_uas_lock: Arc<Mutex<HashSet<String>>>,
        id: String,
        location: String,
        lang: String,
        text_parts: Vec<String>,
    ) {
        debug!(
            "Perform Google TTS Task: Starting for call_id='{}', lang='{}', location='{}'",
            id, lang, location
        );
        // Determine the expected path for the cached audio file.
        let cache_file_path =
            Self::get_cache_file_path(&config.gtts_cache_base_path, &lang, &id, &location);

        debug!(
            "Google TTS task: for call_id='{}', location='{}', lang='{}', target cache_path='{:?}'",
            id, location, lang, cache_file_path
        );

        // Check if the audio file already exists in the cache.
        if tokio_fs::metadata(&cache_file_path).await.is_ok() {
            info!(
                "Google TTS audio found in cache: {:?} for lang: {}",
                cache_file_path, lang
            );
            debug!(
                "Perform Google TTS Task: Attempting to get web-accessible URL for cached file."
            );
            // If cached, get its web-accessible URL and broadcast a completion event.
            if let Some(audio_url) = Self::get_web_accessible_audio_url(
                &cache_file_path,
                &config.serve_dir_path, // Not used in current implementation but kept for context
                &config.gtts_cache_base_path,
                &config.tts_cache_web_path,
            ) {
                debug!(
                    "Perform Google TTS Task: Broadcasting TTSComplete for cached audio. URL: {}",
                    audio_url
                );
                let event = AppEvent::TTSComplete {
                    id: id.clone(),
                    location: location.clone(),
                    lang: lang.clone(),
                    audio_url,
                };
                if let Err(e) = sender.send(event) {
                    debug!("Failed to broadcast TTSComplete for cached Google TTS audio (id: {}, lang: {}): {}", id, lang, e);
                }
            } else {
                error!("Failed to get web-accessible URL for cached Google TTS audio (id: {}, lang: {}): {:?}", id, lang, cache_file_path);
            }
            return; // Exit if audio is found in cache
        }

        info!(
            "Google TTS audio not found in cache ({:?}), generating for call id '{}', lang {}...",
            cache_file_path, id, lang
        );

        // Handle cases where tokenization resulted in no valid parts.
        if text_parts.is_empty() {
            error!(
                "Tokenization resulted in no text parts for call id '{}', lang '{}'",
                id, lang
            );
            return;
        }
        debug!(
            "Processing {} pre-tokenized parts for Google TTS (call id '{}', lang {}).",
            text_parts.len(),
            id,
            lang
        );

        let mut all_audio_bytes: Vec<u8> = Vec::new();
        let total_parts = text_parts.len();
        // `uas_this_task` keeps track of UAs used within this specific TTS generation task
        // to avoid immediate repetition for subsequent chunks.
        let mut uas_this_task: HashSet<String> = HashSet::new();

        // Iterate through each tokenized part to fetch audio.
        for (idx, part_text) in text_parts.iter().enumerate() {
            debug!(
                "Perform Google TTS Task: Processing part {}/{} (text: '{}')",
                idx + 1,
                total_parts,
                part_text
            );
            // Build the specific TTS URL for the current chunk.
            let tts_url = Self::static_build_google_tts_url(part_text, &lang, idx, total_parts);
            trace!("Perform Google TTS Task: TTS URL for part: {}", tts_url);

            let user_agent_str: String;
            let mut attempts = 0;

            // Loop to generate a user agent that hasn't been recently used.
            loop {
                trace!(
                    "Perform Google TTS Task: UA generation attempt {} for part {}/{}",
                    attempts + 1,
                    idx + 1,
                    total_parts
                );
                let candidate_ua_slice: &str = get_rua(); // Get a random user agent.

                let last_call_uas_guard = last_call_uas_lock.lock().await; // Acquire lock for shared UA history.

                // Check if the candidate UA is new for this task AND not in the globally shared recent UAs.
                if !uas_this_task.contains(candidate_ua_slice)
                    && !last_call_uas_guard.contains(candidate_ua_slice)
                {
                    user_agent_str = candidate_ua_slice.to_string();
                    uas_this_task.insert(user_agent_str.clone()); // Add to current task's used UAs.
                    drop(last_call_uas_guard); // Release lock as soon as possible.
                    debug!(
                        "Perform Google TTS Task: Selected new UA: '{}'",
                        user_agent_str
                    );
                    break; // Found a good UA, exit loop.
                }
                drop(last_call_uas_guard); // Release lock even if not found.

                attempts += 1;
                // If max attempts reached, accept the last generated UA, even if it's a repeat.
                if attempts >= MAX_UA_GENERATION_ATTEMPTS {
                    warn!(
                        "Max UA generation attempts reached for part {}/{}. Using last generated UA ('{}'), which might be a repeat.",
                        idx + 1, total_parts, candidate_ua_slice
                    );
                    user_agent_str = candidate_ua_slice.to_string();
                    if !uas_this_task.contains(candidate_ua_slice) {
                        uas_this_task.insert(user_agent_str.clone());
                    }
                    break;
                }
                trace!(
                    "UA '{}' was recently used, retrying generation...",
                    candidate_ua_slice
                );
                // Consider adding a small `tokio::time::sleep` here to prevent busy-waiting
                // if `get_rua()` generates many repetitions quickly.
            }

            // Fetch audio with retry logic
            match Self::fetch_tts_with_retry(
                &http_client,
                &tts_url,
                &user_agent_str,
                idx,
                total_parts,
                &lang,
            )
            .await
            {
                Ok(bytes) => {
                    trace!(
                        "Perform Google TTS Task: Received {} bytes for part {}/{}",
                        bytes.len(),
                        idx + 1,
                        total_parts
                    );
                    all_audio_bytes.extend_from_slice(&bytes); // Append audio bytes.
                }
                Err(e) => {
                    error!(
                        "Failed to fetch Google TTS part {}/{} (lang {}) after {} retries: {}",
                        idx + 1,
                        total_parts,
                        lang,
                        MAX_TTS_RETRY_ATTEMPTS,
                        e
                    );
                    return; // Exit task on error.
                }
            }
        }

        // After processing all parts, handle the concatenated audio.
        if !all_audio_bytes.is_empty() {
            debug!("Perform Google TTS Task: All audio bytes collected (total {} bytes). Updating last_call_uas.", all_audio_bytes.len());
            // Update the global set of recently used user agents.
            let mut last_call_uas_guard = last_call_uas_lock.lock().await;
            *last_call_uas_guard = uas_this_task; // Replace old set with the one used in this task.
            drop(last_call_uas_guard);
            trace!("Perform Google TTS Task: last_call_uas updated.");

            // Ensure the parent directory for the cache file exists before writing.
            if let Some(parent_dir) = cache_file_path.parent() {
                debug!(
                    "Perform Google TTS Task: Checking/creating parent directory for cache: {:?}",
                    parent_dir
                );
                if !parent_dir.exists() {
                    if let Err(e) = tokio_fs::create_dir_all(parent_dir).await {
                        error!(
                            "Failed to create TTS cache subdirectory {:?}: {}",
                            parent_dir, e
                        );
                        return; // Exit task on error.
                    }
                    info!("Created TTS cache subdirectory: {:?}", parent_dir);
                }
            } else {
                error!(
                    "Could not determine parent directory for cache file: {:?}",
                    cache_file_path
                );
                return; // Exit task on error.
            }

            // Write the concatenated audio bytes to the cache file.
            debug!(
                "Perform Google TTS Task: Writing concatenated audio to cache file: {:?}",
                cache_file_path
            );
            if let Err(e) = Self::write_cache_file(&cache_file_path, &all_audio_bytes).await {
                error!(
                    "Failed to write concatenated Google TTS audio to cache {:?} (lang {}): {}",
                    cache_file_path, lang, e
                );
                return; // Exit task on error.
            }
            info!(
                "Google TTS audio (lang {}) cached successfully: {:?}",
                lang, cache_file_path
            );

            // Prune the cache if the maximum file limit is set.
            let max_files = config.tts_cache_maximum_files;
            if max_files > 0 {
                debug!(
                    "Perform Google TTS Task: Initiating cache pruning. Max files: {}",
                    max_files
                );
                Self::prune_cache(&config.gtts_cache_base_path, max_files).await;
            }

            // Get the web-accessible URL for the newly created audio file and broadcast.
            debug!("Perform Google TTS Task: Getting web-accessible URL for new audio.");
            if let Some(audio_url) = Self::get_web_accessible_audio_url(
                &cache_file_path,
                &config.serve_dir_path, // Not used in current implementation but kept for context
                &config.gtts_cache_base_path,
                &config.tts_cache_web_path,
            ) {
                debug!(
                    "Perform Google TTS Task: Broadcasting TTSComplete for new audio. URL: {}",
                    audio_url
                );
                let event = AppEvent::TTSComplete {
                    id: id.clone(),
                    location: location.clone(),
                    lang: lang.clone(),
                    audio_url,
                };
                if let Err(e) = sender.send(event) {
                    debug!("Failed to broadcast TTSComplete for Google TTS audio (id: {}, lang: {}): {}", id, lang, e);
                }
            } else {
                error!("Failed to get web-accessible URL for Google TTS audio (id: {}, lang: {}): {:?}", id, lang, cache_file_path);
            }
        } else {
            warn!(
                "No audio bytes collected from Google TTS for call ID '{}', lang '{}'",
                id, lang
            );
        }
        debug!(
            "Perform Google TTS Task: Finished for call_id='{}', lang='{}'.",
            id, lang
        );
    }

    /// Builds the full Google TTS API URL for a given text part and language.
    /// This implementation is ported from `getAudioUrl.ts`.
    ///
    /// # Arguments
    /// - `text_part`: The segment of text to be converted to speech.
    /// - `lang`: The language code (e.g., "en-US", "th").
    /// - `slow`: Whether to use a slower speech rate.
    ///
    /// # Returns
    /// A `String` containing the fully formed Google TTS API URL.
    fn static_build_google_tts_url(
        text_part: &str,
        lang: &str,
        idx: usize,
        total_parts: usize,
    ) -> String {
        let encoded_text = url_encode(text_part);
        // The `slow` parameter is not used in the original Rust code, so it's set to a default of `false`.
        // The `ttsspeed` parameter is derived from this boolean.
        let slow = false;
        let ttsspeed = if slow { "0.24" } else { "1" };

        format!(
            "{}?ie=UTF-8&q={}&tl={}&total={}&idx={}&textlen={}&client=tw-ob&prev=input&ttsspeed={}",
            GOOGLE_TTS_URL_BASE,
            encoded_text,
            lang,
            total_parts,
            idx,
            text_part.len(),
            ttsspeed
        )
    }

    /// Constructs the human-readable text that will be converted to speech for a call.
    ///
    /// This function adapts the phrasing based on the target language.
    ///
    /// # Arguments
    /// - `id`: The ID of the call (e.g., "A123").
    /// - `location`: The location for the call (e.g., "Counter 5").
    /// - `lang`: The language code to determine the phrasing.
    ///
    /// # Returns
    /// A `String` containing the full text to be spoken.
    fn build_speak_text(id: &str, location: &str, lang: &str) -> String {
        debug!(
            "Build Speak Text: For ID: '{}', Location: '{}', Lang: '{}'",
            id, location, lang
        );
        match lang.to_lowercase().as_str() {
            "th" => {
                let text = format!("หมายเลข {}, เชิญช่อง {}", id, location); // Thai phrasing
                trace!("Build Speak Text: Thai phrasing: '{}'", text);
                text
            }
            "en-uk" | "en-us" | "en" => {
                let text = format!("Number {}, to counter {}", id, location); // English phrasing
                trace!("Build Speak Text: English phrasing: '{}'", text);
                text
            }
            _ => {
                // Default to English phrasing for unsupported or unmapped languages,
                // and log a warning.
                let text = format!("Number {}, to counter {}", id, location);
                warn!(
                    "Using default/English speak text phrasing for unmapped lang code: {}; Text: '{}'",
                    lang, text
                );
                text
            }
        }
    }

    /// Asynchronously writes a byte slice to a file at the specified path.
    ///
    /// # Arguments
    /// - `file_path`: The `Path` to the file to write.
    /// - `bytes`: The slice of bytes to write to the file.
    ///
    /// # Returns
    /// A `std::io::Result<()>` indicating success or failure of the write operation.
    async fn write_cache_file(file_path: &Path, bytes: &[u8]) -> std::io::Result<()> {
        debug!(
            "Write Cache File: Writing {} bytes to {:?}",
            bytes.len(),
            file_path
        );
        let mut file = tokio_fs::File::create(file_path).await?;
        file.write_all(bytes).await?;
        trace!("Write Cache File: Successfully wrote file: {:?}", file_path);
        Ok(())
    }

    /// Asynchronously prunes the TTS audio cache, deleting the oldest files
    /// if the total number of files exceeds `max_files`.
    ///
    /// This function iterates through all subdirectories (languages) within the cache
    /// base path, collects file metadata, sorts by modification/creation time,
    /// and removes files exceeding the specified limit.
    ///
    /// # Arguments
    /// - `cache_base_path`: The root directory of the TTS cache.
    /// - `max_files`: The maximum number of files to keep in the cache. If 0, no pruning occurs.
    async fn prune_cache(cache_base_path: &Path, max_files: usize) {
        debug!(
            "Prune Cache: Starting. Max files: {}, Base path: {:?}",
            max_files, cache_base_path
        );
        if max_files == 0 {
            trace!("Prune Cache: max_files is 0, skipping pruning.");
            return;
        }

        info!(
            "Checking TTS cache for pruning (max files: {} across all lang dirs). Base: {:?}",
            max_files, cache_base_path
        );

        let mut files_with_time: Vec<(SystemTime, PathBuf)> = Vec::new();
        let mut lang_dirs = match tokio_fs::read_dir(cache_base_path).await {
            Ok(rd) => rd,
            Err(e) => {
                error!(
                    "Failed to read TTS cache base directory for pruning {:?}: {}",
                    cache_base_path, e
                );
                return;
            }
        };

        trace!("Prune Cache: Iterating through language directories.");
        // Iterate through language subdirectories.
        while let Some(lang_dir_entry_res) = lang_dirs.next_entry().await.transpose() {
            if let Ok(lang_dir_entry) = lang_dir_entry_res {
                let lang_path = lang_dir_entry.path();
                if lang_path.is_dir() {
                    trace!(
                        "Prune Cache: Processing language directory: {:?}",
                        lang_path
                    );
                    let mut files_in_lang_dir = match tokio_fs::read_dir(&lang_path).await {
                        Ok(rd) => rd,
                        Err(e) => {
                            warn!(
                                "Failed to read lang subdirectory {:?} for pruning: {}",
                                lang_path, e
                            );
                            continue;
                        }
                    };
                    trace!("Prune Cache: Iterating through files in {:?}", lang_path);
                    // Iterate through files within each language directory.
                    while let Some(file_entry_res) =
                        files_in_lang_dir.next_entry().await.transpose()
                    {
                        if let Ok(file_entry) = file_entry_res {
                            let file_path = file_entry.path();
                            if file_path.is_file() {
                                trace!("Prune Cache: Found file: {:?}", file_path);
                                if let Ok(metadata) = tokio_fs::metadata(&file_path).await {
                                    // Prefer modified time, fall back to created time.
                                    if let Ok(modified_time) =
                                        metadata.modified().or_else(|_| metadata.created())
                                    {
                                        files_with_time.push((modified_time, file_path));
                                        trace!(
                                            "Prune Cache: Added file to list with modified time."
                                        );
                                    } else {
                                        warn!("Prune Cache: Could not get modified/created time for {:?}", file_path);
                                    }
                                } else {
                                    warn!(
                                        "Prune Cache: Could not get metadata for {:?}",
                                        file_path
                                    );
                                }
                            } else {
                                trace!("Prune Cache: Skipping non-file entry: {:?}", file_path);
                            }
                        } else if let Err(e) = file_entry_res {
                            warn!(
                                "Error reading file entry in {:?} for pruning: {}",
                                lang_path, e
                            );
                        }
                    }
                } else {
                    trace!("Prune Cache: Skipping non-directory entry: {:?}", lang_path);
                }
            } else if let Err(e) = lang_dir_entry_res {
                warn!(
                    "Error reading entry in TTS cache base directory {:?}: {}",
                    cache_base_path, e
                );
            }
        }
        debug!(
            "Prune Cache: Found {} files in total cache.",
            files_with_time.len()
        );

        // If the total number of files is within the limit, no pruning is needed.
        if files_with_time.len() <= max_files {
            debug!(
                "Total TTS cache files ({}) is within limit ({}). No pruning needed.",
                files_with_time.len(),
                max_files
            );
            return;
        }

        // Sort files by their modification/creation time (oldest first).
        files_with_time.sort_by_key(|k| k.0);

        // Calculate how many files need to be removed.
        let num_to_remove = files_with_time.len() - max_files;
        info!(
            "Pruning TTS cache: {} files to remove from {} total.",
            num_to_remove,
            files_with_time.len()
        );

        // Remove the oldest files.
        for i in 0..num_to_remove {
            debug!(
                "Prune Cache: Attempting to remove file: {:?}",
                files_with_time[i].1
            );
            if let Err(e) = tokio_fs::remove_file(&files_with_time[i].1).await {
                error!(
                    "Failed to remove old cache file {:?}: {}",
                    files_with_time[i].1, e
                );
            } else {
                debug!("Removed old cache file: {:?}", files_with_time[i].1);
            }
        }
        debug!("Prune Cache: Pruning complete.");
    }

    /// Converts a file system cache path to a web-accessible URL.
    ///
    /// This function constructs a URL that a client can use to download the cached audio file,
    /// by replacing the file system base path with the configured web path segment.
    ///
    /// # Arguments
    /// - `cache_file_path`: The absolute path to the cached audio file on the file system.
    /// - `_serve_dir_path`: The root directory from which static files are served (currently unused in logic).
    /// - `cache_base_fs_path`: The file system base path for the TTS cache.
    /// - `cache_web_path_segment`: The URL path segment where the TTS cache is exposed (e.g., "/tts_cache").
    ///
    /// # Returns
    /// An `Option<String>` containing the web-accessible URL if successful, otherwise `None`.
    fn get_web_accessible_audio_url(
        cache_file_path: &Path,
        _serve_dir_path: &Path, // This parameter is currently not used in the logic.
        cache_base_fs_path: &Path,
        cache_web_path_segment: &str,
    ) -> Option<String> {
        debug!("Get Web Accessible Audio URL: For cache file: {:?}, base_fs_path: {:?}, web_path_segment: '{}'", cache_file_path, cache_base_fs_path, cache_web_path_segment);

        // Get the path relative to the file system cache base.
        let relative_path_from_fs_base = cache_file_path.strip_prefix(cache_base_fs_path).ok()?;
        trace!(
            "Get Web Accessible Audio URL: Relative path from FS base: {:?}",
            relative_path_from_fs_base
        );

        // Clean and prepare the web path segment.
        let base_web_path = cache_web_path_segment.trim_matches('/');
        // Convert the relative file path to a string, replacing backslashes with forward slashes for URLs.
        let relative_file_part = relative_path_from_fs_base
            .to_string_lossy()
            .replace('\\', "/");

        // Construct the full web path.
        let full_web_path = if base_web_path.is_empty() {
            // If web path segment is empty, just use the relative file path from root.
            format!("/{}", relative_file_part.trim_start_matches('/'))
        } else {
            // Otherwise, join the base web path and the relative file path.
            format!(
                "/{}/{}",
                base_web_path,
                relative_file_part.trim_start_matches('/')
            )
        };

        // Normalize the URL to ensure it starts with a single '/' and has proper segments.
        // This handles cases like `//` or multiple `/`
        let segments: Vec<&str> = full_web_path.split('/').filter(|s| !s.is_empty()).collect();
        let final_url = format!("/{}", segments.join("/"));

        debug!("Get Web Accessible Audio URL: Generated URL: {}", final_url);
        Some(final_url)
    }

    /// Returns a reference to the `HashMap` of supported languages.
    ///
    /// The map keys are language codes (e.g., "th", "en-uk") and values are
    /// their corresponding display names (e.g., "Thai", "British English").
    ///
    /// # Returns
    /// A reference to the internal `supported_languages_map`.
    pub fn get_supported_languages(&self) -> &HashMap<String, String> {
        debug!("Get Supported Languages: Returning map of supported languages.");
        &self.supported_languages_map
    }
}
