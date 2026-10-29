# Simple Queue System

This is a simple, robust queue management system built with Rust and the Axum web framework. It provides an operator interface for managing a queue, a public-facing signage display for real-time status, and text-to-speech (TTS) functionality for announcements. The system is designed for easy deployment using Docker or Podman.

## Features

- **Operator Interface**: A web-based panel for operators to add new calls to the queue and manually trigger announcements.
- **Signage Display**: A public display that shows the currently served call number and location, along with an expanded calling history.
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

# Build Tailwind CSS once (production output)
npm run build:css

# Build frontend assets (also used by CI)
npm run build:assets

# Watch TailwindCSS during development
npx @tailwindcss/cli -i ./tailwind.css -o ./public/css/styles.css -w -m

# Run the Rust test suite
cargo test
```

The server listens on `SERVER_ADDRESS:SERVER_PORT` (defaults to `0.0.0.0:3000`). Static assets under `public/` are served by Axum, so HTML/JS/CSS edits take effect on reload.

### Browser Support

The operator and signage pages use native ES modules and current browser APIs.
Use a current Chromium, Firefox, or Safari browser. Legacy TV bundles, polyfills,
`tv.html`, and `signage-original.html` have been removed. The QR signage page remains
available at `/signage_with_028_qr.html`.

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

- `deploy/server/queue-app.service` — traditional systemd unit for Podman. Copy it to `/etc/systemd/system/`, then run `sudo systemctl daemon-reload` followed by `sudo systemctl enable --now queue-app`. The unit pulls `ghcr.io/ledokun/028-simple-queue-system:latest` before each start (falling back to the cached image if offline), keeps the container restarted on failure, and reads runtime overrides from `/etc/default/queue-app` (touched automatically if missing). Populate that file with `KEY=value` lines to pass configuration into the container.
- `deploy/kiosk/rpi-kiosk-launch.sh` — Raspberry Pi kiosk launcher that waits for the API, mirrors displays at 1080p, sets PulseAudio volume, and starts Chromium in fullscreen. Review the header comment for required packages, `/etc/environment` variables, and the LXDE autostart entry (e.g. `@/srv/rpi-kiosk-launch.sh`).

#### Health Checks

Every build exposes `GET /health`, which returns `{"status":"ok"}` when the backend is up. The kiosk launcher and any external monitors can rely on this liveness probe before attempting SSE subscriptions.

#### Server Environment Overrides

With the systemd unit in place, adjust backend behaviour by editing `/etc/default/queue-app` on the host. Each line should follow `VARIABLE=value` (for example `RUST_LOG=debug` or `ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS=900`). The service forwards those variables into the Podman container at start-up.

## Environment Variables

The system can be configured using the following environment variables. You can pass them to the docker run command using the `-e` flag (e.g., `-e RUST_LOG=debug`).

| Variable | Default | Description |
|----------|---------|-------------|
| `RUST_LOG` | `info` | Logging level for the application. Can be set to debug, warn, etc. |
| `SERVER_ADDRESS` | `0.0.0.0` | The IP address for the server to bind to. |
| `SERVER_PORT` | `3000` | The port for the server to listen on. |
| `MAX_HISTORY_SIZE` | `7` | Maximum number of completed calls to store in the history. |
| `MAX_SKIPPED_HISTORY_SIZE` | `5` | Maximum number of skipped calls to store in the history. |
| `QUEUE_IDENTIFIER_PREFIX_REQUIRED` | `true` | When `true`, queue identifiers must use the legacy letter+digits format such as `A1`. When `false`, queue identifiers must contain digits only such as `1` or `99`. |
| `SERVE_DIR_PATH` | `./public` | Path to the directory containing static web files. |
| `ANNOUNCEMENTS_ENABLED` | `true` | Initial on/off state for prerecorded audio announcements. The operator panel can change this until the server restarts. Queue calls, translator calls, and banners continue independently. |
| `ANNOUNCEMENT_UTC_OFFSET_HOURS` | `7` | UTC offset used for announcement weekdays; defaults to Bangkok time, including in containers. Valid range: -23 through 23. |
| `ANNOUNCEMENT_<SLOT_ID>_DAYS` | `all` | Allowed weekdays for a slot; see below. `03-lab-done` defaults to `tue,wed,thu`. |
| `ANNOUNCEMENTS_AUDIO_SUB_PATH` | `media/announcements` | Sub-path within SERVE_DIR_PATH where announcement audio files are located. |
| `BANNERS_SUB_PATH` | `media/banners` | Sub-path within SERVE_DIR_PATH where banner media is stored. |
| `ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS` | `1200` | Interval (in seconds) for automatically cycling announcements. Set to 0 to disable. |
| `ANNOUNCEMENT_MANUAL_TRIGGER_COOLDOWN_SECONDS` | `5` | Cooldown period (in seconds) after manually triggering an announcement. |
| `BANNER_ROTATION_INTERVAL_SECONDS` | `10` | Interval (in seconds) for rotating banners on the signage display. |
| `GTTS_CACHE_BASE_PATH` | `/tmp/gtts_audio_cache` | Base path for caching generated TTS audio files. |
| `TTS_CACHE_MAXIMUM_FILES` | `500` | Maximum number of TTS audio files to keep in the cache. |
| `TTS_EXTERNAL_SERVICE_TIMEOUT_SECONDS` | `30` | Timeout (in seconds) for external TTS service requests. |
| `TTS_SUPPORTED_LANGUAGES` | `th:Thai,en-GB:British English` | Comma-separated list of supported languages for TTS (format: code:Name). |
| `TTS_ANNOUNCEMENT_TEMPLATE_TH` | `หมายเลข {Q_NUM}, เชิญช่อง {DEST_NUM}` | Live Thai TTS template. Must include both `{Q_NUM}` and `{DEST_NUM}` placeholders. |
| `TTS_ANNOUNCEMENT_TEMPLATE_EN` | `Number {Q_NUM}, to counter {DEST_NUM}` | Live English TTS template. Must include both `{Q_NUM}` and `{DEST_NUM}` placeholders. |
| `SSE_KEEP_ALIVE_INTERVAL_SECONDS` | `15` | Interval (in seconds) for sending SSE keep-alive messages. |
| `SSE_EVENT_BUFFER_SIZE` | `200` | Size of the buffer for SSE events. |
| `TTS_CACHE_WEB_PATH` | `/tts_cache` | Web path where the TTS cache is accessible. |

Example:

```bash
-e QUEUE_IDENTIFIER_PREFIX_REQUIRED=false \
-e TTS_ANNOUNCEMENT_TEMPLATE_TH='หมายเลข {Q_NUM}, เชิญช่อง {DEST_NUM}' \
-e TTS_ANNOUNCEMENT_TEMPLATE_EN='Queue {Q_NUM}, please proceed to counter {DEST_NUM}'
```

### Announcement Scheduling

Each directory under `public/media/announcements/` is an announcement slot. Audio
files (`mp3`, `wav`, `ogg`) play in filename order. Schedules are read at startup;
restart the server after changing the environment or adding media.

Every announcement defaults to every day without any configuration, except
`03-lab-done`, which defaults to Tuesday, Wednesday, and Thursday. To override a
slot, uppercase its directory name and replace punctuation with underscores:

```dotenv
ANNOUNCEMENTS_ENABLED=true
ANNOUNCEMENT_UTC_OFFSET_HOURS=7
ANNOUNCEMENT_03_LAB_DONE_DAYS=tue,wed,thu
ANNOUNCEMENT_00_LISTEN_TO_NUMBER_DAYS=mon,tue,wed,thu,fri
ANNOUNCEMENT_01_NUMBER_NOT_QUEUE_DAYS=all
ANNOUNCEMENT_02_BRING_THAI_ID_DAYS=off
```

Use comma-separated weekday names (short or full names, case insensitive), `all`
for every day, or `off` to disable one slot. Invalid or empty schedules log an
error and exclude that slot. Day changes take effect without a restart. Automatic
cycling and manual triggers both obey these schedules; unavailable slots are
hidden from the operator panel.

The operator's **Turn Announcements Off** button stops current and queued
prerecorded playback on connected signage displays. Turning announcements back on
waits a full automatic interval or an explicit manual trigger before playing.
The initial state comes from `ANNOUNCEMENTS_ENABLED` after every server restart.
Use `ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS=0` for manual playback only.

API: `PUT /api/announcements/enabled` with `{"enabled": false}` or
`{"enabled": true}`. `GET /api/announcements/status` includes `enabled` and today's
`available_slots`. Disabled or out-of-schedule manual triggers return HTTP 409.

### Validation

```bash
npm ci
npm test
npm run build:assets
bash tests/kiosk.test.sh
python3 -m unittest discover -s tests -p 'test_*.py'
npm audit
cargo test --locked
cargo clippy --all-targets --locked -- -D warnings
cargo audit
```

The Python checks use the packages in `requirements.txt`.

`cargo audit` requires the separately installed RustSec `cargo-audit` tool. TTS
requests retain gzip, Brotli, and deflate support; unused Zstandard decoding has
been removed to reduce native build dependencies.

### Generating Text-to-Speech Assets

The frontend falls back to pre-generated Google Translate audio when the live TTS
service cannot be reached. The helper script `generate_stems_google_translate.py`
creates both the individual "stems" (phrases, numbers, characters) and a cache of
combined queue announcements.

Live TTS templates only affect online/dynamic generation. If you keep the default
templates, the runtime can still reuse the pre-generated combined cache under
`public/media/audio_cache/multi/`. If you customize the templates, the runtime
skips those pre-generated combined files and falls back to online generation first,
then to the default stem sequence if live TTS fails.

Queue identifier format also affects fallback stem playback. In the default mode
(`QUEUE_IDENTIFIER_PREFIX_REQUIRED=true`), stem playback uses the legacy
`phrase_number + char_<prefix> + number_<digit>...` sequence. When
`QUEUE_IDENTIFIER_PREFIX_REQUIRED=false`, numeric-only queue identifiers skip the
`char_*.mp3` segment and play only digit stems for the queue number. No extra
stem generation is required for that numeric-only fallback path.

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

Outputs are written beneath `public/media/audio_stems/` (locale folders such as
`th` and `en-GB`) and `public/media/audio_cache/multi/` (combined cache files
named like `A01-1_th_en-GB.mp3`). You can safely re-run the script; completed
files are detected and left untouched unless they are removed first.

The helper script still bootstraps the bundled combined cache with the default
letter-prefixed sample IDs. Numeric-only queue identifiers continue to work at
runtime through live TTS or atomic stem fallback, but they are not pre-generated
into the bundled combined cache unless you extend the script yourself.

## Automated Docker Image Builds

This repository is configured with GitHub Actions to automatically build and push a multi-architecture Docker image to the GitHub Container Registry (GHCR) on every push to the main branch.

You can view the workflow file here: `docker-build-push.yml`

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.
