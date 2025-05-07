# syntax = docker/dockerfile:1

# Base Node.js stage
FROM node:20-slim AS base-node
WORKDIR /app
ENV NODE_ENV="production" # NODE_ENV is set to production here

# Base Bun stage for websocket
FROM oven/bun:latest AS base-bun
WORKDIR /app

# Build stage for main app
FROM base-node AS build-main # This stage inherits NODE_ENV="production"
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY website/package*.json ./
# Use npm ci --include=dev to install all dependencies including devDependencies
# This respects package-lock.json and works even with NODE_ENV=production
RUN npm ci --include=dev
# Copy the rest of the website source code
COPY website/. ./
# Copy the .env file if needed by the build process
COPY website/.env ./.env
# Now run the build, vite should be available from devDependencies
RUN npm run build
# Prune devDependencies after the build is complete
RUN npm prune --production

# Build stage for websocket
FROM base-bun AS build-websocket
WORKDIR /app
COPY websocket/package.json websocket/bun.lock ./
RUN bun install --production
COPY website/src/lib ./src/lib/
COPY websocket/src ./src/

# Production stage for main app
FROM base-node AS production-main
WORKDIR /app
COPY --from=build-main --chown=node:node /app/build ./build
COPY --from=build-main --chown=node:node /app/node_modules ./node_modules
COPY --from=build-main --chown=node:node /app/package.json .
USER node
EXPOSE 3000
CMD ["node", "build/index.js"]

# Production stage for websocket
FROM base-bun AS production-websocket
WORKDIR /app

# Copy dependencies from build stage
COPY --from=build-websocket /app/node_modules ./node_modules

COPY --from=build-websocket /app/src/lib ./src/lib/

# Copy websocket source files
COPY --from=build-websocket /app/src ./src/

EXPOSE 8080

# Command should now work with the updated import path in main.ts
CMD ["bun", "run", "src/main.ts"]