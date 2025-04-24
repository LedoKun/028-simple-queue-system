# Queue Calling System 🚀🎉📺

A responsive, TV-friendly queue display and calling system featuring real-time updates, multilingual audio announcements, and Dockerized deployment. 📡🖥️📣

Actively developed and continuously improved based on feedback!

---

## Table of Contents 🗂️📑✨
1. [Features](#features)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
   - [Node.js](#using-nodejs)
   - [Docker](#using-docker)
6. [Usage](#usage)
7. [Audio Files](#audio-files)
8. [License](#license)
9. [Contributing](#contributing)

---

## Features 🎯✅📋

- **TV Display (`tv.html`)**
  - Real-time updates via Server-Sent Events (SSE)
  - Prominent display of current queue number and station
  - Configurable history of recent calls, with automatic duplicate removal
  - Chime notification and multi-language audio announcements
  - Responsive design optimized for large screens (TVs)
  - Live server status indicator (Connecting / Connected / Disconnected / Retrying)

- **Caller Interface (`caller.html`)**
  - Simple form for station and queue number input
  - “Call Queue” button to invoke `POST /call`
  - “Trigger Announcement” button to start public announcement cycle (`POST /trigger-announcement`)
  - Keyboard shortcuts for quick operation

- **Multi-Language Audio**
  - Dynamic Text‑to‑Speech via `GET /speak?queue=&station=&lang=` (`th`, `en`, `my`, etc.)
  - Pre-recorded public announcements in multiple languages under `public/media/announcement/`

- **Deployment**
  - Dockerized for containerized deployment
  - Ready to run with default or custom environment settings

- **Favicon Support**
  - Includes standard favicon definitions for various devices and browsers

---

## Prerequisites 🛠️📦✅

- **Node.js** (LTS recommended)
- **Yarn** (or npm)
- **Docker** (optional, for containerized deployment)

---

## Installation 🛠️📥📋

1. **Clone the repository**
   ```bash
   git clone https://github.com/LedoKun/028-simple-queue-system.git
   cd 028-simple-queue-system
   ```

2. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

---

## Configuration ⚙️🌐🔧

Use environment variables to customize behavior. You can export them in your shell or use a `.env` file with `dotenv`. 🔄🛡️🔑

| Variable                         | Description                                                                     | Default     |
| -------------------------------- | ------------------------------------------------------------------------------- | ----------- |
| `PORT`                           | Port for the server to listen on                                                | `3000`      |
| `DEBOUNCINGINTERVALMS`           | Debounce interval for queue processing (milliseconds)                           | `3000`      |
| `PUBLICANNOUNCEMENTINTERVALMS`   | Interval for automatic announcement cycle (milliseconds)                        | `1800000`   |
| `STARTPUBLICANNOUNCEMENTSAFTERMS`| Delay before first announcement cycle after server start (milliseconds)         | `300000`    |

---

## Running the Application ▶️🚀💻

### Using Node.js 🟢📦⚙️

1. (Optional) Set environment variables:
   ```bash
   export PORT=8080
   export PUBLICANNOUNCEMENTINTERVALMS=3600000
   ```
2. Start the server:
   ```bash
   yarn start
   # or
   npm start
   ```
3. Open in browser:
   - TV Display: `http://localhost:<PORT>/tv.html`
   - Caller Interface: `http://localhost:<PORT>/caller.html`

### Using Docker 🐳📦⚙️

#### Build Locally

```bash
# Build image
docker build -t queue-calling-system .

# Run container
docker run -p 3000:3000 --rm --name queue-app \
  -e PUBLICANNOUNCEMENTINTERVALMS=3600000 \
  -e STARTPUBLICANNOUNCEMENTSAFTERMS=600000 \
  queue-calling-system
```

#### Pull Pre-Built Image

```bash
docker pull ghcr.io/ledokun/028-simple-queue-system:latest

docker run -p 8080:3000 --rm --name queue-app \
  ghcr.io/ledokun/028-simple-queue-system:latest
```

Access:
```text
TV:     http://localhost:<HOST_PORT>/tv.html
Caller: http://localhost:<HOST_PORT>/caller.html
```

---

## Usage 📝👥📺

1. Open **Caller Interface** and enter:
   - **Station Number**
   - **Queue Number**
   - Click **Call Queue** or press **Enter**
2. Open **TV Display** to view:
   - Current queue/station
   - History of recent calls (duplicates removed)
   - Live server status
3. Click **Trigger Announcement** in Caller Interface to play pre-recorded public announcements (cooldown applies)

---

## Audio Files 🔊🎵📁

- `public/chime.mp3`: Chime for each new queue call
- `public/media/announcement/{lang}.mp3`: Pre-recorded announcement files for each language code (`th`, `en`, `my`, `vi`, `fil`, `cn`, `ja`)

Ensure all required `.mp3` files exist in their respective directories. 🔍📂🔈

---

## License 📜🆓✔️

This project is licensed under the [MIT License](LICENSE). 📝🔓✅

---

## Contributing 🤝🌟🛠️

Contributions are welcome! Fork the repo and submit a pull request with your changes. 🙌📬💡
