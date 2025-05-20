use fake_user_agent::get_rua;
use regex::Regex;
use reqwest::header::USER_AGENT;
use reqwest::Client as ReqwestClient;
use std::{
    collections::{HashMap, HashSet}, // Added HashSet
    path::{Path, PathBuf},
    sync::Arc,
    time::SystemTime,
};
use tokio::sync::{broadcast, Mutex}; // Added tokio::sync::Mutex
use tokio::{fs as tokio_fs, io::AsyncWriteExt, task};
use urlencoding::encode as url_encode;

use crate::{config::AppConfig, AppEvent};

const GOOGLE_TTS_URL_BASE: &str = "http://translate.google.com/translate_tts";
const MAX_CHARS_PER_CHUNK: usize = 100;
const MAX_UA_GENERATION_ATTEMPTS: u8 = 10; // To prevent infinite loops if UA pool is too small

#[derive(Debug)]
pub struct TTSManager {
    config: Arc<AppConfig>,
    http_client: ReqwestClient,
    event_bus_sender: broadcast::Sender<AppEvent>,
    supported_languages_map: HashMap<String, String>,
    tokenizer_regex: Regex,
    last_call_uas: Arc<Mutex<HashSet<String>>>, // Stores UAs from the previous task call
}

impl TTSManager {
    pub fn new(config: Arc<AppConfig>, event_bus_sender: broadcast::Sender<AppEvent>) -> Self {
        tracing::info!("Initializing TTSManager for Google TTS...");

        let http_client = ReqwestClient::builder()
            .timeout(config.tts_external_service_timeout())
            .build()
            .expect("Failed to create HTTP client for TTSManager");

        let supported_languages_map = config
            .tts_supported_languages
            .split(',')
            .filter_map(|s| {
                let parts: Vec<&str> = s.trim().split(':').collect();
                if parts.len() == 2 {
                    Some((parts[0].to_string(), parts[1].to_string()))
                } else if parts.len() == 1 && !parts[0].is_empty() {
                    Some((parts[0].to_string(), parts[0].to_string()))
                } else {
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

        TTSManager {
            config,
            http_client,
            event_bus_sender,
            supported_languages_map,
            tokenizer_regex,
            last_call_uas: Arc::new(Mutex::new(HashSet::new())), // Initialize the new field
        }
    }

    fn tokenize(&self, text: &str) -> Vec<String> {
        if text.is_empty() {
            return Vec::new();
        }
        let parts: Vec<&str> = self
            .tokenizer_regex
            .split(text)
            .filter(|p| !p.is_empty())
            .collect();
        if parts.is_empty() {
            return Vec::new();
        }
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();
        for part in parts {
            let potential_len =
                current_chunk.len() + if current_chunk.is_empty() { 0 } else { 1 } + part.len();
            if !current_chunk.is_empty() && potential_len > MAX_CHARS_PER_CHUNK {
                chunks.push(current_chunk.trim().to_string());
                current_chunk = String::from(part);
            } else {
                if !current_chunk.is_empty() {
                    current_chunk.push(' ');
                }
                current_chunk.push_str(part);
            }
        }
        if !current_chunk.is_empty() {
            chunks.push(current_chunk.trim().to_string());
        }
        chunks
            .into_iter()
            .filter(|s| !s.trim().is_empty())
            .collect()
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

        if !self.supported_languages_map.contains_key(&lang) {
            let error_msg = format!("Unsupported language for Google TTS: {}", lang);
            tracing::warn!("{}", error_msg);
            return Err(error_msg);
        }

        let config_clone = Arc::clone(&self.config);
        let http_client_clone = self.http_client.clone();
        let sender_clone = self.event_bus_sender.clone();
        let last_call_uas_clone = Arc::clone(&self.last_call_uas); // Clone Arc for the task

        let text_for_this_lang = Self::build_speak_text(&id, &location, &lang);
        let tokenized_parts = self.tokenize(&text_for_this_lang);

        let task_id = id;
        let task_location = location;
        let task_lang = lang;

        task::spawn(async move {
            Self::perform_google_tts_task(
                config_clone,
                http_client_clone,
                sender_clone,
                last_call_uas_clone, // Pass the Arc to the task
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
        cache_base_path.join(lang_sanitized).join(format!(
            "{}-{}.mp3",
            call_id_sanitized, call_location_sanitized
        ))
    }

    async fn perform_google_tts_task(
        config: Arc<AppConfig>,
        http_client: ReqwestClient,
        sender: broadcast::Sender<AppEvent>,
        last_call_uas_lock: Arc<Mutex<HashSet<String>>>, // Receive the Arc<Mutex<...>>
        id: String,
        location: String,
        lang: String,
        text_parts: Vec<String>,
    ) {
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
            if let Some(audio_url) = Self::get_web_accessible_audio_url(
                &cache_file_path,
                &config.serve_dir_path,
                &config.gtts_cache_base_path,
                &config.tts_cache_web_path,
            ) {
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
        // uas_this_task will store owned Strings, as these are the UAs "chosen" for this task.
        let mut uas_this_task: HashSet<String> = HashSet::new();

        for (idx, part_text) in text_parts.iter().enumerate() {
            let tts_url = Self::static_build_google_tts_url(part_text, &lang, idx, total_parts);

            let user_agent_str: String; // This will be an owned String
            let mut attempts = 0;

            loop {
                let candidate_ua_slice: &str = get_rua(); // Assuming get_rua() returns &str

                let last_call_uas_guard = last_call_uas_lock.lock().await;

                // HashSet<String> can check .contains() using an &str
                if !uas_this_task.contains(candidate_ua_slice)
                    && !last_call_uas_guard.contains(candidate_ua_slice)
                {
                    user_agent_str = candidate_ua_slice.to_string(); // Convert to owned String
                    uas_this_task.insert(user_agent_str.clone()); // Insert the owned String
                    drop(last_call_uas_guard); // Release lock
                    break;
                }
                drop(last_call_uas_guard); // Release lock if condition was false

                attempts += 1;
                if attempts >= MAX_UA_GENERATION_ATTEMPTS {
                    tracing::warn!(
                        "Max UA generation attempts reached for part {}/{}. Using last generated UA ('{}'), which might be a repeat.",
                        idx + 1, total_parts, candidate_ua_slice
                    );
                    user_agent_str = candidate_ua_slice.to_string(); // Convert to owned String
                                                                     // Attempt to insert if not already in this task's set (it might be if only prev_call_uas caused conflict)
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
                user_agent_str // user_agent_str is now an owned String
            );

            match http_client
                .get(&tts_url)
                .header(USER_AGENT, &user_agent_str) // Pass reference to the owned String
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.bytes().await {
                            Ok(bytes) => all_audio_bytes.extend_from_slice(&bytes),
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
            let mut last_call_uas_guard = last_call_uas_lock.lock().await;
            *last_call_uas_guard = uas_this_task;
            drop(last_call_uas_guard);

            if let Some(parent_dir) = cache_file_path.parent() {
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
                Self::prune_cache(&config.gtts_cache_base_path, max_files).await;
            }

            if let Some(audio_url) = Self::get_web_accessible_audio_url(
                &cache_file_path,
                &config.serve_dir_path,
                &config.gtts_cache_base_path,
                &config.tts_cache_web_path,
            ) {
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
    }

    fn static_build_google_tts_url(
        text_part: &str,
        lang: &str,
        idx: usize,
        total_parts: usize,
    ) -> String {
        let encoded_text = url_encode(text_part);
        format!(
            "{}?ie=UTF-8&tl={}&q={}&total={}&idx={}&client=tw-ob&textlen={}",
            GOOGLE_TTS_URL_BASE,
            lang,
            encoded_text,
            total_parts,
            idx,
            text_part.chars().count()
        )
    }

    fn build_speak_text(id: &str, location: &str, lang: &str) -> String {
        match lang.to_lowercase().as_str() {
            "th" => format!("หมายเลข {}, เชิญช่อง {}", id, location),
            "en-uk" | "en-us" | "en" => format!("Number {}, to counter {}", id, location),
            _ => {
                tracing::warn!(
                    "Using default/English speak text phrasing for lang code: {}",
                    lang
                );
                format!("Number {}, to counter {}", id, location)
            }
        }
    }

    async fn write_cache_file(file_path: &Path, bytes: &[u8]) -> std::io::Result<()> {
        let mut file = tokio_fs::File::create(file_path).await?;
        file.write_all(bytes).await?;
        Ok(())
    }

    async fn prune_cache(cache_base_path: &Path, max_files: usize) {
        if max_files == 0 {
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
        while let Some(lang_dir_entry_res) = lang_dirs.next_entry().await.transpose() {
            if let Ok(lang_dir_entry) = lang_dir_entry_res {
                let lang_path = lang_dir_entry.path();
                if lang_path.is_dir() {
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
                    while let Some(file_entry_res) =
                        files_in_lang_dir.next_entry().await.transpose()
                    {
                        if let Ok(file_entry) = file_entry_res {
                            let file_path = file_entry.path();
                            if file_path.is_file() {
                                if let Ok(metadata) = tokio_fs::metadata(&file_path).await {
                                    if let Ok(modified_time) =
                                        metadata.modified().or_else(|_| metadata.created())
                                    {
                                        files_with_time.push((modified_time, file_path));
                                    }
                                }
                            }
                        } else if let Err(e) = file_entry_res {
                            tracing::warn!(
                                "Error reading file entry in {:?} for pruning: {}",
                                lang_path,
                                e
                            );
                        }
                    }
                }
            } else if let Err(e) = lang_dir_entry_res {
                tracing::warn!(
                    "Error reading entry in TTS cache base directory {:?}: {}",
                    cache_base_path,
                    e
                );
            }
        }
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
    }

    fn get_web_accessible_audio_url(
        cache_file_path: &Path,
        _serve_dir_path: &Path,
        cache_base_fs_path: &Path,
        cache_web_path_segment: &str,
    ) -> Option<String> {
        let relative_path_from_fs_base = cache_file_path.strip_prefix(cache_base_fs_path).ok()?;
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
        Some(format!("/{}", segments.join("/")))
    }

    pub fn get_supported_languages(&self) -> &HashMap<String, String> {
        &self.supported_languages_map
    }
}
