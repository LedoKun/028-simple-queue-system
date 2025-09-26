# Simple Queue System

This is a simple, robust queue management system built with Rust and the Axum web framework. It provides an operator interface for managing a queue, a public-facing signage display for real-time status, and text-to-speech (TTS) functionality for announcements. The system is designed for easy deployment using Docker or Podman.

## Features

- **Operator Interface**: A web-based panel for operators to add new calls to the queue, skip calls, and manually trigger announcements.
- **Signage Display**: A public display that shows the currently served call number and location, along with histories of recent and skipped calls.
- **Text-to-Speech (TTS)**: Automatically generates audio announcements for calls in multiple languages. It includes a caching mechanism to improve performance and reduce external API calls, and signage playback runs at 1.1× speed (while the chime remains at 1×) to keep announcements brisk without losing cues.
- **Announcement Management**: Supports automated and manual cycling of pre-recorded audio and banner announcements, with configurable cooldowns to prevent spamming.
- **Real-time Updates**: Uses Server-Sent Events (SSE) to provide instant updates to all connected clients (operators and signage displays) without needing to refresh the page.
- **Docker/Podman Support**: Containerized for easy, consistent, and isolated deployment across different environments.
- **Multi-Arch Builds**: The application is automatically built and pushed as a multi-architecture Docker image (amd64, arm64, armv7), making it suitable for a wide range of devices, including Raspberry Pi.

## Getting Started

### Prerequisites

Docker or Podman must be installed on your system.

### Local Development

You can run the stack directly on your machine without containers:

```bash
# Install JavaScript dependencies for the frontend (once)
npm install

# Install Python tooling for audio helpers
pip install -r requirements.txt

# Start the Axum backend
cargo run

# Rebuild frontend assets when needed
npm run build    # or `npm run dev` for watch mode

# Watch TailwindCSS during development
npx @tailwindcss/cli -i ./tailwind.css -o ./public/css/styles.css -w -m

# Run the Rust test suite
cargo test
```

The server listens on `SERVER_ADDRESS:SERVER_PORT` (defaults to `0.0.0.0:3000`). Static assets under `public/` are served by Axum, so HTML/JS/CSS edits take effect on reload.

### Deployment

You can run the system using a single command. The container image is publicly available on the GitHub Container Registry.

**Using Docker:**
```bash
docker run -d \
    -p 3000:3000 \
    --name queue-system \
    ghcr.io/ledokun/028-simple-queue-system:latest
```

**Using Podman:**
```bash
podman run -d \
    -p 3000:3000 \
    --name queue-system \
    ghcr.io/ledokun/028-simple-queue-system:latest
```

Once running, you can access the interfaces at:

- **Landing Page**: http://localhost:3000
- **Operator Panel**: http://localhost:3000/operator.html
- **Signage Display**: http://localhost:3000/signage.html

### Production Assets

Pre-built deployment helpers live under `deploy/`:

- `deploy/server/queue-app.service` — traditional systemd unit for Podman. Copy it to `/etc/systemd/system/`, adjust any environment overrides, then run `sudo systemctl daemon-reload` followed by `sudo systemctl enable --now queue-app`. The unit pulls `ghcr.io/ledokun/028-simple-queue-system:latest` before each start (falling back to the cached image if offline) and keeps the container restarted on failure. The backend now exposes a simple `/health` endpoint for kiosks and monitors.
- `deploy/kiosk/rpi-kiosk-launch.sh` — Raspberry Pi kiosk launcher that waits for the API, mirrors displays at 1080p, sets PulseAudio volume, and starts Chromium in fullscreen. Review the header comment for required packages, `/etc/environment` variables, and the LXDE autostart entry (e.g. `@/srv/rpi-kiosk-launch.sh`).

## Environment Variables

The system can be configured using the following environment variables. You can pass them to the docker run command using the `-e` flag (e.g., `-e RUST_LOG=debug`).

| Variable | Default | Description |
|----------|---------|-------------|
| `RUST_LOG` | `info` | Logging level for the application. Can be set to debug, warn, etc. |
| `SERVER_ADDRESS` | `0.0.0.0` | The IP address for the server to bind to. |
| `SERVER_PORT` | `3000` | The port for the server to listen on. |
| `MAX_HISTORY_SIZE` | `5` | Maximum number of completed calls to store in the history. |
| `MAX_SKIPPED_HISTORY_SIZE` | `5` | Maximum number of skipped calls to store in the history. |
| `SERVE_DIR_PATH` | `./public` | Path to the directory containing static web files. |
| `ANNOUNCEMENTS_AUDIO_SUB_PATH` | `media/announcements` | Sub-path within SERVE_DIR_PATH where announcement audio files are located. |
| `BANNERS_SUB_PATH` | `media/banners` | Sub-path within SERVE_DIR_PATH where banner media is stored. |
| `ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS` | `1200` | Interval (in seconds) for automatically cycling announcements. Set to 0 to disable. |
| `ANNOUNCEMENT_MANUAL_TRIGGER_COOLDOWN_SECONDS` | `5` | Cooldown period (in seconds) after manually triggering an announcement. |
| `BANNER_ROTATION_INTERVAL_SECONDS` | `10` | Interval (in seconds) for rotating banners on the signage display. |
| `GTTS_CACHE_BASE_PATH` | `/tmp/gtts_audio_cache` | Base path for caching generated TTS audio files. |
| `TTS_CACHE_MAXIMUM_FILES` | `500` | Maximum number of TTS audio files to keep in the cache. |
| `TTS_EXTERNAL_SERVICE_TIMEOUT_SECONDS` | `30` | Timeout (in seconds) for external TTS service requests. |
| `TTS_SUPPORTED_LANGUAGES` | `th:Thai,en-GB:British English` | Comma-separated list of supported languages for TTS (format: code:Name). |
| `SSE_KEEP_ALIVE_INTERVAL_SECONDS` | `15` | Interval (in seconds) for sending SSE keep-alive messages. |
| `SSE_EVENT_BUFFER_SIZE` | `200` | Size of the buffer for SSE events. |
| `TTS_CACHE_WEB_PATH` | `/tts_cache` | Web path where the TTS cache is accessible. |

### Generating Text-to-Speech Assets

The frontend falls back to pre-generated Google Translate audio when the live TTS
service cannot be reached. The helper script `generate_stems_google_translate.py`
creates both the individual "stems" (phrases, numbers, characters) and a cache of
combined queue announcements.

Prerequisites:

- Python 3.10+
- FFmpeg available on your PATH (required for MP3 recompression)

Install the minimal dependencies:

```bash
pip install -r requirements.txt
```

Then run the script. By default it generates both stem and cache audio, skipping
files that already exist:

```bash
python generate_stems_google_translate.py
```

Useful flags:

- `--skip-stems` – only refresh the combined cache files
- `--skip-cache` – only refresh individual stem files
- `--log-level DEBUG` – surface detailed fetch/compression diagnostics

Outputs are written beneath `public/media/audio_stems/` and
`public/media/audio_cache/multi/` respectively. You can safely re-run the script;
completed files are detected and left untouched unless they are removed first.

## Automated Docker Image Builds

This repository is configured with GitHub Actions to automatically build and push a multi-architecture Docker image to the GitHub Container Registry (GHCR) on every push to the main branch.

You can view the workflow file here: `docker-build-push.yml`

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.
