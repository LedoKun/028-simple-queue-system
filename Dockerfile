FROM rust:1-bookworm AS build-env

LABEL org.opencontainers.image.authors="LedoKun <romamp100@gmail.com>"

WORKDIR /app
COPY . /app

RUN apt-get update && apt-get install -y tini
RUN cargo build --release

FROM gcr.io/distroless/cc-debian12:nonroot

# Set environment variables
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
    TTS_EXTERNAL_SERVICE_TIMEOUT_SECONDS=15 \
    TTS_SUPPORTED_LANGUAGES="th:Thai,en-uk:British English" \
    SSE_KEEP_ALIVE_INTERVAL_SECONDS=15 \
    SSE_EVENT_BUFFER_SIZE=200 \
    TTS_CACHE_WEB_PATH=/tts_cache

WORKDIR /
COPY --from=build-env /app/target/release/queue-calling-system /
COPY --from=build-env /usr/bin/tini-static /tini-static
COPY --chown=nonroot:nonroot public /public

VOLUME /app/public/media/audios_and_banners

ENTRYPOINT ["/tini-static", "--"]
CMD ["/queue-calling-system"]
