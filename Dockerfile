# Stage 1: Helper to get tini static binary from a slim Debian image
FROM debian:bookworm-slim AS tini-env
# tini is a lightweight init system that reaps zombie processes
RUN apt-get update && \
    apt-get install -y --no-install-recommends tini && \
    cp /usr/bin/tini-static /tini-static && \
    # Clean up apt cache to keep this layer small
    rm -rf /var/lib/apt/lists/*

# Stage 2: Final application image using distroless for a minimal footprint
FROM gcr.io/distroless/cc-debian12:nonroot

LABEL org.opencontainers.image.authors="LedoKun <romamp100@gmail.com>"
LABEL org.opencontainers.image.description="A simple queue management system with a web interface and TTS announcements."

# Build arguments passed from the GitHub Actions workflow
ARG BUILD_DATE
ARG VCS_REF
# Automatically provided by Docker Buildx for the current platform being built
ARG TARGETPLATFORM
# Passed from GitHub Actions: contains owner/repository
ARG GH_REPO

# Set OCI standard image labels
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF
LABEL org.opencontainers.image.source="https://github.com/${GH_REPO}"

# Application runtime environment variables
ENV RUST_LOG=info \
    SERVER_ADDRESS=0.0.0.0 \
    SERVER_PORT=3000 \
    MAX_HISTORY_SIZE=5 \
    MAX_SKIPPED_HISTORY_SIZE=5 \
    SERVE_DIR_PATH=./public \
    ANNOUNCEMENTS_SUB_PATH=media/audios_and_banners \
    ANNOUNCEMENT_AUTO_CYCLE_INTERVAL_SECONDS=1200 \
    ANNOUNCEMENT_MANUAL_TRIGGER_COOLDOWN_SECONDS=60 \
    GTTS_CACHE_BASE_PATH=/tmp/gtts_audio_cache \
    TTS_CACHE_MAXIMUM_FILES=500 \
    TTS_EXTERNAL_SERVICE_TIMEOUT_SECONDS=5 \
    TTS_SUPPORTED_LANGUAGES="th:Thai,en-GB:British English" \
    SSE_KEEP_ALIVE_INTERVAL_SECONDS=15 \
    SSE_EVENT_BUFFER_SIZE=200 \
    TTS_CACHE_WEB_PATH=/tts_cache

WORKDIR /

# Copy tini from the helper stage and set execute permissions
COPY --from=tini-env --chmod=755 /tini-static /tini-static

# Copy static assets
COPY --chown=nonroot:nonroot public /public

# Copy the pre-compiled, platform-specific Rust binary and set execute permissions
COPY --chmod=755 staging_binaries/${TARGETPLATFORM}/queue-calling-system /queue-calling-system

# The problematic RUN chmod line is now removed, as permissions are set during COPY
# REMOVED: RUN chmod 755 /queue-calling-system /tini-static

# Define the volume for persistent announcement data
# This path is relative to WORKDIR / and uses SERVE_DIR_PATH and ANNOUNCEMENTS_SUB_PATH
VOLUME /public/media/audios_and_banners

# Use tini as the entrypoint to manage the application process
ENTRYPOINT ["/tini-static", "--"]

# Default command to run the application
CMD ["/queue-calling-system"]