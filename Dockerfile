# Use the official Node LTS Alpine image as the base
FROM node:22-alpine3.21

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Bangkok
ENV DEBOUNCINGINTERVALMS=3000
ENV PUBLICANNOUNCEMENTINTERVALMS=1800000
ENV STARTPUBLICANNOUNCEMENTSAFTERMS=300000
ENV CACHE_DIR=/tmp/cache-queue/tts

# Install Tini for proper process management
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /app

# Copy the package manifest files
COPY package.json yarn.lock ./

# Install dependencies (production-only; remove '--production' if needed)
RUN yarn install --production

# Copy the rest of your application code
COPY . .

# Ensure /tmp is a clean directory with appropriate permissions
# Raspberry Pi OS bug?
RUN rm -rf /tmp && mkdir -p /tmp && chmod 1777 /tmp

# Expose the port your app listens on (assuming 3000)
EXPOSE 3000

# Use Tini as the entrypoint to handle signals and reaping zombies
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application with Yarn
CMD ["yarn", "start"]
