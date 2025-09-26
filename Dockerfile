# Stage 1: Helper to get tini static binary from a slim Debian image
FROM debian:bookworm-slim AS build-env
# tini is a lightweight init system that reaps zombie processes
RUN apt-get update && \
    apt-get install -y --no-install-recommends tini ca-certificates && \
    cp /usr/bin/tini-static /tini-static && \
    update-ca-certificates && \
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

WORKDIR /

# Copy tini from the helper stage and set execute permissions
COPY --from=build-env --chmod=755 /tini-static /tini-static

# Copy certs from the build-env
COPY --from=build-env /etc/ssl/certs /etc/ssl/certs

# Copy static assets
COPY --chown=nonroot:nonroot public /public

# Copy the pre-compiled, platform-specific Rust binary and set execute permissions
COPY --chmod=755 staging_binaries/${TARGETPLATFORM}/queue-calling-system /queue-calling-system

# Define the volumes for persistent announcement data
# These paths are relative to WORKDIR / and align with SERVE_DIR_PATH
VOLUME ["/public/media/announcements", "/public/media/banners"]

# Use tini as the entrypoint to manage the application process
ENTRYPOINT ["/tini-static", "--"]

# Default command to run the application
CMD ["/queue-calling-system"]
