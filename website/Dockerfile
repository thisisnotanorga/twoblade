# syntax = docker/dockerfile:1

# Base Node.js stage
FROM node:20-slim AS base-node
WORKDIR /app
ENV NODE_ENV="production"

FROM oven/bun:latest AS base-bun
WORKDIR /app

FROM base-node AS build-main
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY website/package*.json ./
RUN npm ci --include=dev
COPY website/. ./
COPY website/.env ./.env
RUN npm run build
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