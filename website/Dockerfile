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
WORKDIR /app/websocket

COPY website/websocket/package.json website/websocket/bun.lock* ./

RUN bun install --production

COPY website/websocket/src ./src/

COPY website/src/lib /app/website/src/lib/

# Production stage for main app
FROM base-node AS production-main
WORKDIR /app
COPY --from=build-main --chown=node:node /app/build ./build
COPY --from=build-main --chown=node:node /app/node_modules ./node_modules
COPY --from=build-main --chown=node:node /app/package.json .
USER node
EXPOSE 3000
CMD ["node", "build/index.js"]

FROM base-bun AS production-websocket
WORKDIR /app/websocket

COPY --from=build-websocket /app/websocket/node_modules ./node_modules
COPY --from=build-websocket /app/websocket/src ./src
COPY --from=build-websocket /app/websocket/tsconfig.json ./tsconfig.json

COPY --from=build-websocket /app/website/src/lib ../website/src/lib/

EXPOSE 8080
CMD ["bun", "run", "src/main.ts"]