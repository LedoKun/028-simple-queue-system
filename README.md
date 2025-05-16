# Simple Queue System

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/LedoKun/028-simple-queue-system/blob/main/LICENSE.md)
[![Docker Image](https://img.shields.io/github/actions/workflow/status/ledokun/028-simple-queue-system/docker-build-push.yml)](https://github.com/LedoKun/028-simple-queue-system/pkgs/container/028-simple-queue-system)


This is a simple queue system built with Rust, providing both an operator interface and a signage display. It supports managing a queue of calls, announcing call numbers, and text-to-speech (TTS) functionality.

## Features

* **Operator Interface:** Allows operators to add calls to the queue, skip calls, and trigger announcements.
* **Signage Display:** Shows the current call and the queue status.
* **Text-to-Speech (TTS):** Generates audio for call announcements.
* **Announcement Management:** Supports automated and manual triggering of announcements with configurable cooldowns.
* **SSE (Server-Sent Events):** Provides real-time updates to clients.
* **Docker/Podman Support:** Containerization for easy deployment.

## Getting Started

### Prerequisites

* Docker or Podman installed.

### Deployment

#### Docker

```bash
docker run -d \
    -p 3000:3000 \
    --name queue-system \
    ghcr.io/ledokun/028-simple-queue-system:latest
```

#### Podman

```bash
podman run -d \
    -p 3000:3000 \
    --name queue-system \
    ghcr.io/ledokun/028-simple-queue-system:latest
```

### Environment Variables

| Variable                                  | Default                       | Description                                                                                             |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `RUST_LOG`                                | `info`                          | Logging level for Rust logs.                                                                            |
| `SERVER_ADDRESS`                            | `0.0.0.0`                       | Server address to bind to.                                                                            |
| `SERVER_PORT`                               | `3000`                          | Server port to listen on.                                                                             |
| `MAX_HISTORY_SIZE`                          | `5`                             | Maximum number of completed calls to store in history.                                                |
| `MAX_SKIPPED_HISTORY_SIZE`                    | `5`                             | Maximum number of skipped calls to store in history.                                                  |
| `SERVE_DIR_PATH`                            | `./public`                      | Path to the directory containing static web files.                                                    |
| `ANNOUNCEMENTS_SUB_PATH`                      | `media/audios_and_banners`      | Sub-path within `SERVE_DIR_PATH` where announcement audio and banner files are located.                |
| `ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS`    | `1200`                          | Interval (in seconds) for automatically cycling announcements. Set to 0 to disable.                    |
| `ANNOUNCEMENT_MANUAL_TRIGGER_COOLDOWN_SECONDS`| `60`                            | Cooldown period (in seconds) after manually triggering an announcement.                                |
| `GTTS_CACHE_BASE_PATH`                        | `/tmp/gtts_audio_cache`         | Base path for caching generated TTS audio files.                                                      |
| `TTS_CACHE_MAXIMUM_FILES`                     | `500`                           | Maximum number of TTS audio files to keep in the cache.                                               |
| `TTS_EXTERNAL_SERVICE_TIMEOUT_SECONDS`      | `15`                            | Timeout (in seconds) for external TTS service requests.                                               |
| `TTS_SUPPORTED_LANGUAGES`                     | `th:Thai,en-uk:British English` | Comma-separated list of supported languages for TTS (format: `code:Name`, e.g., `en:English,fr:French`). |
| `SSE_KEEP_ALIVE_INTERVAL_SECONDS`           | `15`                            | Interval (in seconds) for sending SSE keep-alive messages.                                           |
| `SSE_EVENT_BUFFER_SIZE`                       | `200`                           | Size of the buffer for SSE events.                                                                    |
| `TTS_CACHE_WEB_PATH`                          | `/tts_cache`                    | Web path where the TTS cache is accessible.                                                            |

## Automated Docker Image Builds

https://github.com/LedoKun/028-simple-queue-system/actions/workflows/docker-build-push.yml

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.