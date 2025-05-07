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
COPY website/package.json website/package-lock.json* ./
RUN npm install --production=false

COPY website/. ./
COPY website/.env ./.env

RUN npm run build

RUN npm prune --omit=dev

# Build stage for websocket
FROM base-bun AS build-websocket
WORKDIR /app/websocket_project_root

COPY websocket/package.json websocket/bun.lock ./
COPY websocket/tsconfig.json ./
COPY websocket/src ./src

RUN mkdir -p /app/website/src
COPY website/src/lib /app/website/src/lib/

RUN bun install --production

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
# Set WORKDIR consistent with the build stage
WORKDIR /app/websocket_project_root

COPY --from=build-websocket /app/websocket_project_root/node_modules ./node_modules
COPY --from=build-websocket /app/websocket_project_root/src ./src
COPY --from=build-websocket /app/websocket_project_root/tsconfig.json ./ # Bun might need this for runtime path resolution
COPY --from=build-websocket /app/website/src/lib /app/website/src/lib/

# The .env file variables are injected by docker-compose's env_file,
# so no need to COPY .env here for process.env to work.

EXPOSE 8080

# CMD should be relative to the WORKDIR /app/websocket_project_root
CMD ["bun", "run", "src/main.ts"]