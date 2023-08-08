FROM node:18-alpine AS base

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
RUN npm i -g @beam-australia/react-env@3.1.1
RUN npm i -g turbo
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Build the project
COPY --from=builder /app/out/full/ .
RUN turbo run build --filter=${TURBO_APP_SCOPE}

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer /app/apps/blog/next.config.js .
COPY --from=installer /app/apps/blog/package.json .
COPY --from=installer /app/node_modules ./node_modules

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/blog/public ./apps/blog/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/blog/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/blog/.next/static ./apps/blog/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/blog/.env* ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/blog/lib/markdowns ./apps/blog/lib/markdowns

CMD node apps/blog/server.js