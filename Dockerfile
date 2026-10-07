FROM node:24.21.0-alpine3.24 AS pure_node
FROM pure_node AS base
ARG NPM_CONFIG_REGISTRY
ENV NPM_CONFIG_REGISTRY=${NPM_CONFIG_REGISTRY}
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install system deps and configure pnpm in single layer
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@10.0.0 --activate && \
    pnpm config set store-dir /pnpm/store

# ============================================================================
# BUILDER: Prune monorepo for the target app
# ============================================================================
FROM base AS builder
ARG TURBO_APP_SCOPE
WORKDIR /app
COPY . .
# turbo prune creates optimized output:
# - out/json/ = only package.json files (for dep install caching)
# - out/pnpm-lock.yaml = lockfile
# - out/full/ = full source for the scoped packages
RUN pnpm dlx turbo prune --scope=${TURBO_APP_SCOPE} --docker

# ============================================================================
# INSTALLER: Install deps and build
# ============================================================================
FROM base AS installer
ARG TURBO_APP_SCOPE
ARG BASE_PATH
ARG REACT_APP_SENTRY_DSN
ARG REACT_APP_ALLOWED_HIVE_API_NODES
ARG REACT_APP_GOOGLE_DRIVE_CLIENT_ID

# Build-time env vars for next.config.js
ENV NEXT_PUBLIC_BASE_PATH=${BASE_PATH}
ENV REACT_APP_SENTRY_DSN=${REACT_APP_SENTRY_DSN}
ENV REACT_APP_ALLOWED_HIVE_API_NODES=${REACT_APP_ALLOWED_HIVE_API_NODES}
ENV REACT_APP_GOOGLE_DRIVE_CLIENT_ID=${REACT_APP_GOOGLE_DRIVE_CLIENT_ID}

WORKDIR /app

# LAYER CACHE OPTIMIZATION:
# 1. First copy only package.json files and lockfile
# 2. Install dependencies (cached if lockfile unchanged)
# 3. Then copy source and build (only this layer rebuilds on code changes)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Now copy source and build (this layer changes on code changes)
COPY --from=builder /app/out/full/ .
# Nothing commit-specific may reach this stage: the sidebar's version is read at
# runtime (REACT_APP_GIT_COMMIT_SHA, set in the runner), so a commit that changes
# no app input reuses this layer. When the layer does miss, the cache mounts let
# Turbopack and turbo reuse the previous build of this app.
ARG TURBO_APP_PATH
ARG TURBO_APP_NAME
RUN --mount=type=cache,id=next-${TURBO_APP_NAME},target=/app${TURBO_APP_PATH}/.next/cache \
    --mount=type=cache,id=turbo-${TURBO_APP_NAME},target=/turbo-cache \
    pnpm dlx turbo run build --filter=${TURBO_APP_SCOPE} --cache-dir=/turbo-cache
# .br/.zst next to each compressible static asset and each public/ file copy:public
# generates, for a proxy that serves them precompressed (caddy's
# `file_server { precompressed br zstd gzip }`). The server itself serves the originals.
COPY --from=builder /app/scripts/precompress-static.mjs /usr/local/lib/precompress-static.mjs
RUN node /usr/local/lib/precompress-static.mjs /app${TURBO_APP_PATH}/.next/static \
    /app${TURBO_APP_PATH}/public/auth /app${TURBO_APP_PATH}/public/locales /app${TURBO_APP_PATH}/public/smart-signer

# ============================================================================
# RUNNER: Minimal production image
# ============================================================================
FROM pure_node AS runner
ARG TURBO_APP_PATH
ARG TURBO_APP_NAME
ENV TURBO_APP_PATH=${TURBO_APP_PATH}
ENV TURBO_APP_NAME=${TURBO_APP_NAME}

WORKDIR /app

# LAYER 1: System deps + global tools (rarely changes - well cached)
# Use npm (comes with node) instead of pnpm to avoid installing pnpm runtime
RUN apk add --no-cache tini && \
    npm install -g @beam-australia/react-env@3.1.1 && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# LAYER 2: Static entrypoint script (rarely changes)
COPY --from=builder /app/docker/docker-entrypoint.sh .

# LAYER 3: Config files (change occasionally)
COPY --from=installer /app${TURBO_APP_PATH}/next.config.js .
COPY --from=installer /app${TURBO_APP_PATH}/package.json .

# Switch to non-root user before copying app files
USER nextjs

# LAYER 4: Next.js standalone output (changes on every build)
# This is the ONLY layer that changes frequently
# standalone/ includes minimal node_modules traced by Next.js
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/.next/static .${TURBO_APP_PATH}/.next/static
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/public .${TURBO_APP_PATH}/public
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/li[b]/markdown[s]/ .${TURBO_APP_PATH}/lib/markdowns/

ENV BLOG_PORT=3000
ENV WALLET_PORT=4000
ENV AUTH_PORT=5000

EXPOSE 3000 4000
EXPOSE $BLOG_PORT
EXPOSE $WALLET_PORT
EXPOSE $AUTH_PORT

# Limit V8 heap to fail-fast instead of slow OOM degradation (denser#886).
# Default: 1536 MB — override via NODE_OPTIONS env var if needed.
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Image labels, and the commit the sidebar shows (written to __ENV.js by
# react-env at startup). Declared last: an ARG is in the environment of every
# later RUN, so declaring the per-commit ARGs earlier would rebuild LAYER 1 on
# every commit.
ARG BUILD_TIME
ARG GIT_COMMIT_SHA
ARG GIT_CURRENT_BRANCH
ARG GIT_LAST_LOG_MESSAGE
ARG GIT_LAST_COMMITTER
ARG GIT_LAST_COMMIT_DATE
LABEL org.opencontainers.image.created="$BUILD_TIME"
LABEL org.opencontainers.image.url="https://hive.io/"
LABEL org.opencontainers.image.documentation="https://gitlab.syncad.com/hive/denser"
LABEL org.opencontainers.image.source="https://gitlab.syncad.com/hive/denser"
LABEL org.opencontainers.image.revision="$GIT_COMMIT_SHA"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.ref.name="Denser $TURBO_APP_NAME"
LABEL org.opencontainers.image.title="Denser $TURBO_APP_NAME Image"
LABEL org.opencontainers.image.description="Runs Denser $TURBO_APP_NAME application"
LABEL io.hive.image.branch="$GIT_CURRENT_BRANCH"
LABEL io.hive.image.commit.log_message="$GIT_LAST_LOG_MESSAGE"
LABEL io.hive.image.commit.author="$GIT_LAST_COMMITTER"
LABEL io.hive.image.commit.date="$GIT_LAST_COMMIT_DATE"
ENV REACT_APP_GIT_COMMIT_SHA=${GIT_COMMIT_SHA}

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "node .${TURBO_APP_PATH}/server.js"]
