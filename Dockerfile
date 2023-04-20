# syntax=docker/dockerfile:1.4
# Build with: docker buildx bake --progress=plain local-build
FROM node:18.15-alpine3.17 AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_PUBLIC_API_NODE_ENDPOINT API_NODE_ENDPOINT_PLACEHOLDER
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/docker/docker-entrypoint.sh /app/docker-entrypoint.sh
USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV API_NODE_ENDPOINT api.hive.blog

RUN chmod +x /app/docker-entrypoint.sh
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]