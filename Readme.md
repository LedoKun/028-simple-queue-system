# Queue Calling System

A responsive, TV-friendly queue display system. It features real-time updates via Server-Sent Events (SSE), displays current queue numbers and stations, maintains a history of recent calls, and supports multiple languages with translations shown as subtitles (in parentheses). A chime notification sound plays upon new queue calls. The system is also Dockerized for easy deployment.

## Features

- Real-time queue updates using SSE
- Responsive design suitable for TV displays
- Support with static labels and translation subtitles
- Chime notification sound upon new queue calls (using the file `chime.mp3`)
- Duplicate queue number handling (removes previous calls if the same number is called again)
- Dockerized for easy deployment

## Prerequisites

- **Node.js** (LTS version recommended)
- **Yarn** package manager
- **Docker** (optional, for containerized deployment)

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/queue-calling-system.git
    cd queue-calling-system
    ```

2. Install dependencies:
    ```bash
    yarn install
    ```

## Running the Application

### Using Node.js and Yarn

1. Start the server:
    ```bash
    yarn start
    ```

2. Access the application by opening your browser and navigating to [http://localhost:3000](http://localhost:3000).

### Using Docker

1. Build the Docker image:
    ```bash
    docker build -t queue-calling-system .
    ```

2. Run the Docker container:
    ```bash
    docker run -p 3000:3000 queue-calling-system
    ```

3. Access the application by opening your browser and navigating to [http://localhost:3000](http://localhost:3000).

## Project Structure

The project is structured as follows:

```
.
├── Dockerfile
├── package.json
├── yarn.lock
├── server.js
├── public/
│   ├── tv.html
│   ├── caller.html
│   ├── chime.mp3
│   └── ... other static assets
├── README.md
└── ... other files
```

## Configuration

### Port Configuration

The application defaults to port `3000`. To change the port, set the `PORT` environment variable. For example:

```bash
PORT=4000 yarn start
```

### Chime Sound

Ensure that `chime.mp3` is placed in the `public/` directory.

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.