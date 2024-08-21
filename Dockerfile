# syntax=docker/dockerfile:1.5
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
ARG TURBO_APP_SCOPE
RUN apk add --no-cache libc6-compat
RUN apk update
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm add -g turbo@^2

## Set working directory for an App
WORKDIR /app
COPY . .
## prepare files only for docker and optimise
RUN turbo prune --scope=${TURBO_APP_SCOPE} --docker

# Add lockfile and package.json's of isolated subworkspace
# TODO: Remove python3 installation after getting rid of dhive
FROM base AS installer
ARG TURBO_APP_SCOPE
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm run lint
RUN turbo run build --filter=${TURBO_APP_SCOPE}

FROM base AS runner
ARG TURBO_APP_PATH
ARG TURBO_APP_NAME
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
#LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.revision="$GIT_COMMIT_SHA"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.ref.name="Denser $TURBO_APP_NAME"
LABEL org.opencontainers.image.title="Denser $TURBO_APP_NAME Image"
LABEL org.opencontainers.image.description="Runs Denser $TURBO_APP_NAME application"
LABEL io.hive.image.branch="$GIT_CURRENT_BRANCH"
LABEL io.hive.image.commit.log_message="$GIT_LAST_LOG_MESSAGE"
LABEL io.hive.image.commit.author="$GIT_LAST_COMMITTER"
LABEL io.hive.image.commit.date="$GIT_LAST_COMMIT_DATE"

WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm add -g @beam-australia/react-env@3.1.1
RUN apk add --no-cache tini

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/docker/docker-entrypoint.sh .
COPY --from=installer /app${TURBO_APP_PATH}/next.config.js .
COPY --from=installer /app${TURBO_APP_PATH}/package.json .
COPY --from=installer /app/node_modules ./node_modules

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/public .${TURBO_APP_PATH}/public
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/.next/static .${TURBO_APP_PATH}/.next/static
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/.env* ./
COPY --from=installer --chown=nextjs:nodejs /app${TURBO_APP_PATH}/li[b]/markdown[s]/ .${TURBO_APP_PATH}/lib/markdowns/

# Expose ports 3000 and 4000 for the sake of GitLab CI healthcheck
EXPOSE 3000
EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD node .${TURBO_APP_PATH}/server.js