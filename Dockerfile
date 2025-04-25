# Use the official Node LTS Alpine image as the base
FROM node:22-alpine3.21

ENV NODE_ENV=production
ENV QUEUE_SERVER_PORT=3000
ENV TZ=Asia/Bangkok

# Timing
ENV QUEUE_DEBOUNCE_INTERVAL_MS=3000
ENV PUBLIC_ANNOUNCEMENT_INTERVAL_MS=1800000
ENV ANNOUNCEMENT_START_DELAY_MS=300000

# Cache
ENV TTS_CACHE_DIR=/tmp/cache-queue/tts

# Logging
ENV LOG_LEVEL=info

# Install Tini for proper process management
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /app

# Copy the package manifest files
COPY package.json yarn.lock ./

# Install dependencies (production-only; remove '--production' if needed)
RUN yarn install --production

# Copy the rest of your application code
COPY src ./src

# Expose the port your app listens on (assuming 3000)
EXPOSE 3000

# Use Tini as the entrypoint to handle signals and reaping zombies
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application with Yarn
CMD ["yarn", "start"]
