# syntax=docker/dockerfile:1.5
FROM node:20-alpine AS base

FROM base AS builder
ARG TURBO_APP_SCOPE
RUN apk add --no-cache libc6-compat
RUN apk update

## Set working directory for an App
WORKDIR /app
RUN npm i -g turbo
COPY . .
## prepare files only for docker and optimise
RUN turbo prune --scope=${TURBO_APP_SCOPE} --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
ARG TURBO_APP_SCOPE
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

# First install the dependencies (as they change less often)
RUN npm i -g turbo
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Build the project
COPY --from=builder /app/out/full/ .
RUN npm run lint
RUN turbo run build --filter=${TURBO_APP_SCOPE}

FROM base AS runner
ARG TURBO_APP_PATH
WORKDIR /app

RUN npm i -g @beam-australia/react-env@3.1.1
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