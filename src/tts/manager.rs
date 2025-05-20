use fake_user_agent::get_rua;
use regex::Regex;
use reqwest::header::USER_AGENT;
use reqwest::Client as ReqwestClient;
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    sync::Arc,
    time::SystemTime,
};
use tokio::sync::{broadcast, Mutex};
use tokio::{fs as tokio_fs, io::AsyncWriteExt, task};
use urlencoding::encode as url_encode;

use crate::{config::AppConfig, AppEvent};

const GOOGLE_TTS_URL_BASE: &str = "http://translate.google.com/translate_tts";
const MAX_CHARS_PER_CHUNK: usize = 100;
const MAX_UA_GENERATION_ATTEMPTS: u8 = 10;

#[derive(Debug)]
pub struct TTSManager {
    config: Arc<AppConfig>,
    http_client: ReqwestClient,
    event_bus_sender: broadcast::Sender<AppEvent>,
    supported_languages_map: HashMap<String, String>,
    tokenizer_regex: Regex,
    last_call_uas: Arc<Mutex<HashSet<String>>>,
}

impl TTSManager {
    pub fn new(config: Arc<AppConfig>, event_bus_sender: broadcast::Sender<AppEvent>) -> Self {
        tracing::info!("Initializing TTSManager for Google TTS...");
        tracing::debug!("TTSManager new: Using config: {:?}", config); // Debug config at init

        let http_client = ReqwestClient::builder()
            .timeout(config.tts_external_service_timeout())
            .build()
            .expect("Failed to create HTTP client for TTSManager");
        tracing::debug!(
            "TTSManager new: HTTP client built with timeout: {:?}",
            config.tts_external_service_timeout()
        );

        let supported_languages_map = config
            .tts_supported_languages
            .split(',')
            .filter_map(|s| {
                let parts: Vec<&str> = s.trim().split(':').collect();
                if parts.len() == 2 {
                    tracing::trace!("TTSManager new: Parsing language pair: {:?}", parts); // Trace language parsing
                    Some((parts[0].to_string(), parts[1].to_string()))
                } else if parts.len() == 1 && !parts[0].is_empty() {
                    tracing::trace!("TTSManager new: Parsing single language code: {:?}", parts); // Trace language parsing
                    Some((parts[0].to_string(), parts[0].to_string()))
                } else {
                    tracing::trace!("TTSManager new: Skipping invalid language entry: {:?}", s); // Trace invalid language entry
                    None
                }
            })
            .collect();
        tracing::info!(
            "Supported TTS languages (from config): {:?}",
            supported_languages_map
        );

        tracing::info!("User agents will be fetched using fake_user_agent::get_rua() with non-repetition logic.");

        let audio_cache_base_path = config.gtts_cache_base_path.clone();
        tracing::debug!(
            "TTSManager new: Ensuring TTS cache directory exists: {:?}",
            audio_cache_base_path
        );
        tokio::spawn(async move {
            if let Err(e) = tokio_fs::create_dir_all(&audio_cache_base_path).await {
                tracing::error!(
                    "Failed to create TTS audio cache directory {:?}: {}",
                    audio_cache_base_path,
                    e
                );
            } else {
                tracing::info!(
                    "Ensured TTS audio cache directory exists: {:?}",
                    audio_cache_base_path
                );
            }
        });

        let punc_pattern = r"[¡!()\[\]¿?.,;:—«»\s\n]+";
        let tokenizer_regex = Regex::new(punc_pattern).expect("Failed to compile tokenizer regex");
        tracing::debug!("TTSManager new: Tokenizer regex compiled: {}", punc_pattern);

        TTSManager {
            config,
            http_client,
            event_bus_sender,
            supported_languages_map,
            tokenizer_regex,
            last_call_uas: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    fn tokenize(&self, text: &str) -> Vec<String> {
        tracing::debug!("Tokenizing text (length: {})", text.len());
        if text.is_empty() {
            tracing::trace!("Tokenize: Input text is empty, returning empty Vec.");
            return Vec::new();
        }
        let parts: Vec<&str> = self
            .tokenizer_regex
            .split(text)
            .filter(|p| !p.is_empty())
            .collect();
        tracing::trace!(
            "Tokenize: Split into {} initial parts: {:?}",
            parts.len(),
            parts
        );

        if parts.is_empty() {
            tracing::trace!("Tokenize: No valid parts after splitting, returning empty Vec.");
            return Vec::new();
        }
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();
        for part in parts {
            tracing::trace!("Tokenize: Processing part: '{}'", part);
            let potential_len =
                current_chunk.len() + if current_chunk.is_empty() { 0 } else { 1 } + part.len();
            if !current_chunk.is_empty() && potential_len > MAX_CHARS_PER_CHUNK {
                tracing::trace!(
                    "Tokenize: Current chunk ('{}') too long, pushing and starting new.",
                    current_chunk
                );
                chunks.push(current_chunk.trim().to_string());
                current_chunk = String::from(part);
            } else {
                if !current_chunk.is_empty() {
                    current_chunk.push(' ');
                }
                current_chunk.push_str(part);
                tracing::trace!(
                    "Tokenize: Appended part to current chunk: '{}'",
                    current_chunk
                );
            }
        }
        if !current_chunk.is_empty() {
            tracing::trace!("Tokenize: Pushing final chunk: '{}'", current_chunk);
            chunks.push(current_chunk.trim().to_string());
        }
        let final_chunks = chunks
            .into_iter()
            .filter(|s| !s.trim().is_empty())
            .collect();
        tracing::debug!(
            "Tokenize: Finished tokenization. Resulting chunks: {:?}",
            final_chunks
        );
        final_chunks
    }

    pub fn trigger_tts_generation(
        &self,
        id: String,
        location: String,
        lang: String,
    ) -> Result<(), String> {
        tracing::info!(
            "Google TTS generation task starting for ID: {}, Location: {}, Lang: {}",
            id,
            location,
            lang
        );
        tracing::debug!(
            "Trigger TTS Generation: Checking language support for '{}'",
            lang
        );

        if !self.supported_languages_map.contains_key(&lang) {
            let error_msg = format!("Unsupported language for Google TTS: {}", lang);
            tracing::warn!("{}", error_msg);
            return Err(error_msg);
        }
        tracing::debug!("Trigger TTS Generation: Language '{}' is supported.", lang);

        let config_clone = Arc::clone(&self.config);
        let http_client_clone = self.http_client.clone();
        let sender_clone = self.event_bus_sender.clone();
        let last_call_uas_clone = Arc::clone(&self.last_call_uas);

        let text_for_this_lang = Self::build_speak_text(&id, &location, &lang);
        tracing::debug!(
            "Trigger TTS Generation: Constructed speak text: '{}'",
            text_for_this_lang
        );
        let tokenized_parts = self.tokenize(&text_for_this_lang);
        tracing::debug!(
            "Trigger TTS Generation: Tokenized text into {} parts.",
            tokenized_parts.len()
        );

        let task_id = id;
        let task_location = location;
        let task_lang = lang;

        tracing::debug!("Trigger TTS Generation: Spawning async task for TTS generation.");
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

    fn get_cache_file_path(
        cache_base_path: &Path,
        lang: &str,
        call_id: &str,
        call_location: &str,
    ) -> PathBuf {
        tracing::trace!(
            "Get Cache File Path: Building path for lang: '{}', id: '{}', loc: '{}'",
            lang,
            call_id,
            call_location
        );
        let sanitize = |s: &str| {
            s.chars()
                .map(|c| {
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
        let path = cache_base_path.join(lang_sanitized).join(format!(
            "{}-{}.mp3",
            call_id_sanitized, call_location_sanitized
        ));
        tracing::trace!("Get Cache File Path: Generated path: {:?}", path);
        path
    }

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
        tracing::debug!(
            "Perform Google TTS Task: Starting for call_id='{}', lang='{}', location='{}'",
            id,
            lang,
            location
        );
        let cache_file_path =
            Self::get_cache_file_path(&config.gtts_cache_base_path, &lang, &id, &location);

        tracing::debug!(
            "Google TTS task: for call_id='{}', location='{}', lang='{}', target cache_path='{:?}'",
            id,
            location,
            lang,
            cache_file_path
        );

        if tokio_fs::metadata(&cache_file_path).await.is_ok() {
            tracing::info!(
                "Google TTS audio found in cache: {:?} for lang: {}",
                cache_file_path,
                lang
            );
            tracing::debug!(
                "Perform Google TTS Task: Attempting to get web-accessible URL for cached file."
            );
            if let Some(audio_url) = Self::get_web_accessible_audio_url(
                &cache_file_path,
                &config.serve_dir_path,
                &config.gtts_cache_base_path,
                &config.tts_cache_web_path,
            ) {
                tracing::debug!(
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
                    tracing::debug!("Failed to broadcast TTSComplete for cached Google TTS audio (id: {}, lang: {}): {}", id, lang, e);
                }
            } else {
                tracing::error!("Failed to get web-accessible URL for cached Google TTS audio (id: {}, lang: {}): {:?}", id, lang, cache_file_path);
            }
            return;
        }

        tracing::info!(
            "Google TTS audio not found in cache ({:?}), generating for call id '{}', lang {}...",
            cache_file_path,
            id,
            lang
        );

        if text_parts.is_empty() {
            tracing::error!(
                "Tokenization resulted in no text parts for call id '{}', lang '{}'",
                id,
                lang
            );
            return;
        }
        tracing::debug!(
            "Processing {} pre-tokenized parts for Google TTS (call id '{}', lang {}).",
            text_parts.len(),
            id,
            lang
        );

        let mut all_audio_bytes: Vec<u8> = Vec::new();
        let total_parts = text_parts.len();
        let mut uas_this_task: HashSet<String> = HashSet::new();

        for (idx, part_text) in text_parts.iter().enumerate() {
            tracing::debug!(
                "Perform Google TTS Task: Processing part {}/{} (text: '{}')",
                idx + 1,
                total_parts,
                part_text
            );
            let tts_url = Self::static_build_google_tts_url(part_text, &lang, idx, total_parts);
            tracing::trace!("Perform Google TTS Task: TTS URL for part: {}", tts_url);

            let user_agent_str: String;
            let mut attempts = 0;

            loop {
                tracing::trace!(
                    "Perform Google TTS Task: UA generation attempt {} for part {}/{}",
                    attempts + 1,
                    idx + 1,
                    total_parts
                );
                let candidate_ua_slice: &str = get_rua();

                let last_call_uas_guard = last_call_uas_lock.lock().await;

                if !uas_this_task.contains(candidate_ua_slice)
                    && !last_call_uas_guard.contains(candidate_ua_slice)
                {
                    user_agent_str = candidate_ua_slice.to_string();
                    uas_this_task.insert(user_agent_str.clone());
                    drop(last_call_uas_guard);
                    tracing::debug!(
                        "Perform Google TTS Task: Selected new UA: '{}'",
                        user_agent_str
                    );
                    break;
                }
                drop(last_call_uas_guard);

                attempts += 1;
                if attempts >= MAX_UA_GENERATION_ATTEMPTS {
                    tracing::warn!(
                        "Max UA generation attempts reached for part {}/{}. Using last generated UA ('{}'), which might be a repeat.",
                        idx + 1, total_parts, candidate_ua_slice
                    );
                    user_agent_str = candidate_ua_slice.to_string();
                    if !uas_this_task.contains(candidate_ua_slice) {
                        uas_this_task.insert(user_agent_str.clone());
                    }
                    break;
                }
                tracing::trace!(
                    "UA '{}' was recently used, retrying generation...",
                    candidate_ua_slice
                );
            }

            tracing::debug!(
                "Fetching Google TTS part {}/{} (lang {}): URL: {}, User-Agent: {}",
                idx + 1,
                total_parts,
                lang,
                tts_url,
                user_agent_str
            );

            match http_client
                .get(&tts_url)
                .header(USER_AGENT, &user_agent_str)
                .send()
                .await
            {
                Ok(response) => {
                    tracing::debug!(
                        "Perform Google TTS Task: Received response status: {} for part {}/{}",
                        response.status(),
                        idx + 1,
                        total_parts
                    );
                    if response.status().is_success() {
                        match response.bytes().await {
                            Ok(bytes) => {
                                tracing::trace!(
                                    "Perform Google TTS Task: Received {} bytes for part {}/{}",
                                    bytes.len(),
                                    idx + 1,
                                    total_parts
                                );
                                all_audio_bytes.extend_from_slice(&bytes)
                            }
                            Err(e) => {
                                tracing::error!(
                                    "Failed to get bytes from Google TTS part {}/{} (lang {}): {}",
                                    idx + 1,
                                    total_parts,
                                    lang,
                                    e
                                );
                                return;
                            }
                        }
                    } else {
                        let status = response.status();
                        let error_body = response
                            .text()
                            .await
                            .unwrap_or_else(|_| "Could not read error body".to_string());
                        tracing::error!(
                            "Google TTS part {}/{} (lang {}) request failed: Status {}, Body: {}",
                            idx + 1,
                            total_parts,
                            lang,
                            status,
                            error_body
                        );
                        return;
                    }
                }
                Err(e) => {
                    tracing::error!(
                        "HTTP request to Google TTS part {}/{} (lang {}) failed: {}",
                        idx + 1,
                        total_parts,
                        lang,
                        e
                    );
                    return;
                }
            }
        }

        if !all_audio_bytes.is_empty() {
            tracing::debug!("Perform Google TTS Task: All audio bytes collected (total {} bytes). Updating last_call_uas.", all_audio_bytes.len());
            let mut last_call_uas_guard = last_call_uas_lock.lock().await;
            *last_call_uas_guard = uas_this_task;
            drop(last_call_uas_guard);
            tracing::trace!("Perform Google TTS Task: last_call_uas updated.");

            if let Some(parent_dir) = cache_file_path.parent() {
                tracing::debug!(
                    "Perform Google TTS Task: Checking/creating parent directory for cache: {:?}",
                    parent_dir
                );
                if !parent_dir.exists() {
                    if let Err(e) = tokio_fs::create_dir_all(parent_dir).await {
                        tracing::error!(
                            "Failed to create TTS cache subdirectory {:?}: {}",
                            parent_dir,
                            e
                        );
                        return;
                    }
                    tracing::info!("Created TTS cache subdirectory: {:?}", parent_dir);
                }
            } else {
                tracing::error!(
                    "Could not determine parent directory for cache file: {:?}",
                    cache_file_path
                );
                return;
            }

            tracing::debug!(
                "Perform Google TTS Task: Writing concatenated audio to cache file: {:?}",
                cache_file_path
            );
            if let Err(e) = Self::write_cache_file(&cache_file_path, &all_audio_bytes).await {
                tracing::error!(
                    "Failed to write concatenated Google TTS audio to cache {:?} (lang {}): {}",
                    cache_file_path,
                    lang,
                    e
                );
                return;
            }
            tracing::info!(
                "Google TTS audio (lang {}) cached successfully: {:?}",
                lang,
                cache_file_path
            );

            let max_files = config.tts_cache_maximum_files;
            if max_files > 0 {
                tracing::debug!(
                    "Perform Google TTS Task: Initiating cache pruning. Max files: {}",
                    max_files
                );
                Self::prune_cache(&config.gtts_cache_base_path, max_files).await;
            }

            tracing::debug!("Perform Google TTS Task: Getting web-accessible URL for new audio.");
            if let Some(audio_url) = Self::get_web_accessible_audio_url(
                &cache_file_path,
                &config.serve_dir_path,
                &config.gtts_cache_base_path,
                &config.tts_cache_web_path,
            ) {
                tracing::debug!(
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
                    tracing::debug!("Failed to broadcast TTSComplete for Google TTS audio (id: {}, lang: {}): {}", id, lang, e);
                }
            } else {
                tracing::error!("Failed to get web-accessible URL for Google TTS audio (id: {}, lang: {}): {:?}", id, lang, cache_file_path);
            }
        } else {
            tracing::warn!(
                "No audio bytes collected from Google TTS for call ID '{}', lang '{}'",
                id,
                lang
            );
        }
        tracing::debug!(
            "Perform Google TTS Task: Finished for call_id='{}', lang='{}'.",
            id,
            lang
        );
    }

    fn static_build_google_tts_url(
        text_part: &str,
        lang: &str,
        idx: usize,
        total_parts: usize,
    ) -> String {
        tracing::trace!(
            "Static Build Google TTS URL: Building URL for part {}/{} (lang: '{}', text: '{}')",
            idx,
            total_parts,
            lang,
            text_part
        );
        let encoded_text = url_encode(text_part);
        let url = format!(
            "{}?ie=UTF-8&tl={}&q={}&total={}&idx={}&client=tw-ob&textlen={}",
            GOOGLE_TTS_URL_BASE,
            lang,
            encoded_text,
            total_parts,
            idx,
            text_part.chars().count()
        );
        tracing::trace!("Static Build Google TTS URL: Generated URL: {}", url);
        url
    }

    fn build_speak_text(id: &str, location: &str, lang: &str) -> String {
        tracing::debug!(
            "Build Speak Text: For ID: '{}', Location: '{}', Lang: '{}'",
            id,
            location,
            lang
        );
        match lang.to_lowercase().as_str() {
            "th" => {
                let text = format!("หมายเลข {}, เชิญช่อง {}", id, location);
                tracing::trace!("Build Speak Text: Thai phrasing: '{}'", text);
                text
            }
            "en-uk" | "en-us" | "en" => {
                let text = format!("Number {}, to counter {}", id, location);
                tracing::trace!("Build Speak Text: English phrasing: '{}'", text);
                text
            }
            _ => {
                let text = format!("Number {}, to counter {}", id, location);
                tracing::warn!(
                    "Using default/English speak text phrasing for unmapped lang code: {}; Text: '{}'",
                    lang,
                    text
                );
                text
            }
        }
    }

    async fn write_cache_file(file_path: &Path, bytes: &[u8]) -> std::io::Result<()> {
        tracing::debug!(
            "Write Cache File: Writing {} bytes to {:?}",
            bytes.len(),
            file_path
        );
        let mut file = tokio_fs::File::create(file_path).await?;
        file.write_all(bytes).await?;
        tracing::trace!("Write Cache File: Successfully wrote file: {:?}", file_path);
        Ok(())
    }

    async fn prune_cache(cache_base_path: &Path, max_files: usize) {
        tracing::debug!(
            "Prune Cache: Starting. Max files: {}, Base path: {:?}",
            max_files,
            cache_base_path
        );
        if max_files == 0 {
            tracing::trace!("Prune Cache: max_files is 0, skipping pruning.");
            return;
        }
        tracing::debug!(
            "Checking TTS cache for pruning (max files: {} across all lang dirs). Base: {:?}",
            max_files,
            cache_base_path
        );
        let mut files_with_time: Vec<(SystemTime, PathBuf)> = Vec::new();
        let mut lang_dirs = match tokio_fs::read_dir(cache_base_path).await {
            Ok(rd) => rd,
            Err(e) => {
                tracing::error!(
                    "Failed to read TTS cache base directory for pruning {:?}: {}",
                    cache_base_path,
                    e
                );
                return;
            }
        };
        tracing::trace!("Prune Cache: Iterating through language directories.");
        while let Some(lang_dir_entry_res) = lang_dirs.next_entry().await.transpose() {
            if let Ok(lang_dir_entry) = lang_dir_entry_res {
                let lang_path = lang_dir_entry.path();
                if lang_path.is_dir() {
                    tracing::trace!(
                        "Prune Cache: Processing language directory: {:?}",
                        lang_path
                    );
                    let mut files_in_lang_dir = match tokio_fs::read_dir(&lang_path).await {
                        Ok(rd) => rd,
                        Err(e) => {
                            tracing::warn!(
                                "Failed to read lang subdirectory {:?} for pruning: {}",
                                lang_path,
                                e
                            );
                            continue;
                        }
                    };
                    tracing::trace!("Prune Cache: Iterating through files in {:?}", lang_path);
                    while let Some(file_entry_res) =
                        files_in_lang_dir.next_entry().await.transpose()
                    {
                        if let Ok(file_entry) = file_entry_res {
                            let file_path = file_entry.path();
                            if file_path.is_file() {
                                tracing::trace!("Prune Cache: Found file: {:?}", file_path);
                                if let Ok(metadata) = tokio_fs::metadata(&file_path).await {
                                    if let Ok(modified_time) =
                                        metadata.modified().or_else(|_| metadata.created())
                                    {
                                        files_with_time.push((modified_time, file_path));
                                        tracing::trace!(
                                            "Prune Cache: Added file to list with modified time."
                                        );
                                    } else {
                                        tracing::warn!("Prune Cache: Could not get modified/created time for {:?}", file_path);
                                    }
                                } else {
                                    tracing::warn!(
                                        "Prune Cache: Could not get metadata for {:?}",
                                        file_path
                                    );
                                }
                            } else {
                                tracing::trace!(
                                    "Prune Cache: Skipping non-file entry: {:?}",
                                    file_path
                                );
                            }
                        } else if let Err(e) = file_entry_res {
                            tracing::warn!(
                                "Error reading file entry in {:?} for pruning: {}",
                                lang_path,
                                e
                            );
                        }
                    }
                } else {
                    tracing::trace!("Prune Cache: Skipping non-directory entry: {:?}", lang_path);
                }
            } else if let Err(e) = lang_dir_entry_res {
                tracing::warn!(
                    "Error reading entry in TTS cache base directory {:?}: {}",
                    cache_base_path,
                    e
                );
            }
        }
        tracing::debug!(
            "Prune Cache: Found {} files in total cache.",
            files_with_time.len()
        );

        if files_with_time.len() <= max_files {
            tracing::debug!(
                "Total TTS cache files ({}) is within limit ({}). No pruning needed.",
                files_with_time.len(),
                max_files
            );
            return;
        }
        files_with_time.sort_by_key(|k| k.0);
        let num_to_remove = files_with_time.len() - max_files;
        tracing::info!(
            "Pruning TTS cache: {} files to remove from {} total.",
            num_to_remove,
            files_with_time.len()
        );
        for i in 0..num_to_remove {
            tracing::debug!(
                "Prune Cache: Attempting to remove file: {:?}",
                files_with_time[i].1
            );
            if let Err(e) = tokio_fs::remove_file(&files_with_time[i].1).await {
                tracing::error!(
                    "Failed to remove old cache file {:?}: {}",
                    files_with_time[i].1,
                    e
                );
            } else {
                tracing::debug!("Removed old cache file: {:?}", files_with_time[i].1);
            }
        }
        tracing::debug!("Prune Cache: Pruning complete.");
    }

    fn get_web_accessible_audio_url(
        cache_file_path: &Path,
        _serve_dir_path: &Path,
        cache_base_fs_path: &Path,
        cache_web_path_segment: &str,
    ) -> Option<String> {
        tracing::debug!("Get Web Accessible Audio URL: For cache file: {:?}, base_fs_path: {:?}, web_path_segment: '{}'", cache_file_path, cache_base_fs_path, cache_web_path_segment);
        let relative_path_from_fs_base = cache_file_path.strip_prefix(cache_base_fs_path).ok()?;
        tracing::trace!(
            "Get Web Accessible Audio URL: Relative path from FS base: {:?}",
            relative_path_from_fs_base
        );
        let base_web_path = cache_web_path_segment.trim_matches('/');
        let relative_file_part = relative_path_from_fs_base
            .to_string_lossy()
            .replace('\\', "/");
        let full_web_path = if base_web_path.is_empty() {
            format!("/{}", relative_file_part.trim_start_matches('/'))
        } else {
            format!(
                "/{}/{}",
                base_web_path,
                relative_file_part.trim_start_matches('/')
            )
        };
        let segments: Vec<&str> = full_web_path.split('/').filter(|s| !s.is_empty()).collect();
        let final_url = format!("/{}", segments.join("/"));
        tracing::debug!("Get Web Accessible Audio URL: Generated URL: {}", final_url);
        Some(final_url)
    }

    pub fn get_supported_languages(&self) -> &HashMap<String, String> {
        tracing::debug!("Get Supported Languages: Returning map of supported languages.");
        &self.supported_languages_map
    }
}
