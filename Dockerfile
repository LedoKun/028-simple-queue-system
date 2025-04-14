# Use the official Node LTS Alpine image as the base
FROM node:22-alpine3.21

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Bangkok
ENV DEBOUNCINGINTERVALMS=3000
ENV PUBLICANNOUNCEMENTINTERVALMS=1800000
ENV STARTPUBLICANNOUNCEMENTSAFTERMS=300000

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

# Expose the port your app listens on (assuming 3000)
EXPOSE 3000

# Use Tini as the entrypoint to handle signals and reaping zombies
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application with Yarn
CMD ["yarn", "start"]
