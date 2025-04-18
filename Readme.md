# Queue Calling System

A responsive, TV-friendly queue display and calling system. It features real-time updates via Server-Sent Events (SSE), displays current queue numbers and stations, maintains a history of recent calls, and supports multiple languages for both the display (subtitles) and audio announcements (via dynamic generation/TTS and pre-recorded files). Includes a separate interface for calling queues and triggering announcements, along with live server connection status. The system is also Dockerized for easy deployment.

## Features

-   **Real-time TV Display (`tv.html`):**
    -   Shows currently called queue number and station.
    -   Displays a configurable history of recently called numbers.
    -   Updates instantly via Server-Sent Events (SSE).
    -   Responsive design suitable for large screens/TVs.
    -   Handles duplicate queue number calls (removes previous instances from history).
    -   Plays a chime notification sound (`chime.mp3`) upon new queue calls.
-   **Caller Interface (`caller.html`):**
    -   Simple interface to input Station and Queue numbers.
    -   "Call Queue" button sends data to the backend (`/call` endpoint).
    -   "Trigger Announcement" button to initiate a public announcement cycle (with cooldown).
    -   Keyboard shortcuts for faster input and calling.
-   **Multi-Language Support:**
    -   Static labels on displays show primary language and translation subtitles.
    -   Dynamic audio generation (likely Text-to-Speech via `/speak` endpoint) for queue/station calls in multiple languages (`th`, `en`, `my`, `vi`, `fil`, `cn`, `ja`).
    -   Support for pre-recorded public announcements in multiple languages (via `/media/announcement/`).
-   **Real-time Status:** Live server connection indicator (Connecting/Connected/Disconnected/Retrying) on both TV and Caller pages.
-   **Deployment:** Dockerized for easy containerized deployment.
-   **Favicon Support:** Includes necessary HTML links for standard favicons.

## Prerequisites

-   **Node.js** (LTS version recommended)
-   **Yarn** package manager (or npm)
-   **Docker** (optional, for containerized deployment)

## Installation

1.  Clone the repository:
    ```bash
    git clone [https://github.com/LedoKun/028-simple-queue-system.git](https://github.com/LedoKun/028-simple-queue-system.git)
    cd 028-simple-queue-system
    ```

2.  Install dependencies:
    ```bash
    yarn install
    # OR if using npm:
    # npm install
    ```

## Configuration

The application's behavior can be customized using the following environment variables. You can set these directly in your shell, via system environment settings, or using a `.env` file if your setup includes a library like `dotenv`.

-   **`PORT`**: The port the server will listen on.
    -   *Default:* `3000`
-   **`DEBOUNCINGINTERVALMS`**: The interval (in milliseconds) used for debouncing certain events (e.g., related to SSE or internal processing).
    -   *Default:* `3000` (3 seconds)
-   **`PUBLICANNOUNCEMENTINTERVALMS`**: The interval (in milliseconds) at which the *automatic* public announcement cycle repeats after it starts.
    -   *Default:* `1800000` (30 minutes)
-   **`STARTPUBLICANNOUNCEMENTSAFTERMS`**: The delay (in milliseconds) after the server starts before the *first automatic* public announcement cycle begins.
    -   *Default:* `300000` (5 minutes)

## Running the Application

### Using Node.js and Yarn/npm

1.  **(Optional)** Set any desired environment variables (see Configuration).
    ```bash
    # Example setting port in shell (Linux/macOS)
    export PORT=8080
    # Example setting port in shell (Windows CMD)
    set PORT=8080
    # Example setting port in shell (Windows PowerShell)
    $env:PORT=8080
    ```
2.  Start the server:
    ```bash
    yarn start
    # OR if using npm:
    # npm start
    ```
3.  Access the application:
    * **TV Display:** [http://localhost:3000/tv.html](http://localhost:3000/tv.html) (or the configured port)
    * **Caller Interface:** [http://localhost:3000/caller.html](http://localhost:3000/caller.html) (or the configured port)

### Using Docker

You have two primary ways to run the application using Docker: by building the image locally or by pulling a pre-built image from GitHub Container Registry.

#### Option 1: Building the Docker Image Locally

1.  Build the Docker image:
    ```bash
    docker build -t queue-calling-system .
    ```

2.  Run the Docker container, optionally passing environment variables with `-e`:
    ```bash
    # Simple run with default port 3000:
    docker run -p 3000:3000 --rm --name queue-app queue-calling-system

    # Example mapping to host port 8080 and setting custom announcement intervals:
    docker run -p 8080:3000 \
           -e PORT=3000 \
           -e PUBLICANNOUNCEMENTINTERVALMS=3600000 \
           -e STARTPUBLICANNOUNCEMENTSAFTERMS=600000 \
           --rm --name queue-app queue-calling-system
    ```
    *(Note: `PORT` inside the container should match what the app listens to, usually the default unless overridden)*

3.  Access the application:
    * **TV Display:** [http://localhost:3000/tv.html](http://localhost:3000/tv.html) (or your mapped host port, e.g., `http://localhost:8080/tv.html`)
    * **Caller Interface:** [http://localhost:3000/caller.html](http://localhost:3000/caller.html) (or your mapped host port)

#### Option 2: Pulling the Pre-built Docker Image

1.  Pull the latest pre-built Docker image from GitHub Container Registry:
    ```bash
    docker pull ghcr.io/ledokun/028-simple-queue-system:latest
    ```

2.  Run the Docker container, optionally mapping ports and setting environment variables:
    ```bash
    # Simple run with default port 3000:
    docker run -p 3000:3000 --rm --name queue-app ghcr.io/ledokun/028-simple-queue-system:latest

    # Example mapping to host port 8080 and setting custom announcement intervals:
    docker run -p 8080:3000 \
           -e PORT=3000 \
           -e PUBLICANNOUNCEMENTINTERVALMS=3600000 \
           -e STARTPUBLICANNOUNCEMENTSAFTERMS=600000 \
           --rm --name queue-app ghcr.io/ledokun/028-simple-queue-system:latest
    ```

3.  Access the application:
    * **TV Display:** [http://localhost:3000/tv.html](http://localhost:3000/tv.html) (or your mapped host port, e.g., `http://localhost:8080/tv.html`)
    * **Caller Interface:** [http://localhost:3000/caller.html](http://localhost:3000/caller.html) (or your mapped host port)

## Usage

1.  Open the **Caller Interface** (`/caller.html`) on a device (PC, tablet).
2.  Enter the `Station Number` where the staff member is located.
3.  Enter the `Queue Number` to be called.
4.  Click the "Call Queue" button or press Enter.
5.  Open the **TV Display** (`/tv.html`) on a separate, larger screen visible to customers.
6.  When a queue is called via the caller interface:
    * The TV display will update in real-time showing the new number and station.
    * A chime sound will play.
    * A multi-lingual audio announcement (e.g., "Queue number X, please go to station Y") will play (requires backend TTS or audio lookup).
    * The called number/station will be added to the history list.
7.  Use the "Trigger Announcement" button on the caller interface to play pre-recorded public messages (e.g., opening/closing times). This button has a 2-minute cooldown period after use.

## Audio Files

-   **`public/chime.mp3`**: This sound file is played *every time* a new queue number is called via the caller interface. Ensure this file exists.
-   **`public/media/announcement/`**: This directory must contain pre-recorded audio files for the "Trigger Announcement" feature and the automatic announcement cycles. The system expects files named according to language codes (e.g., `en.mp3`, `th.mp3`). The current languages cycled through by the trigger are: `th`, `en`, `my`, `vi`, `fil`, `cn`, `ja`. Ensure these `.mp3` files are present for the announcement features to work correctly.

## License

This project is licensed under the [MIT License](LICENSE). *(Ensure you have a LICENSE file)*

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.