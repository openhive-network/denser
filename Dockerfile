# syntax=docker/dockerfile:1.4
# Build with: docker buildx bake --progress=plain local-build
# You should run container from this runner image with option `--init`.

FROM node:18.15-alpine3.17 AS base


FROM base AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /home/node/app
RUN chown node /home/node/app
USER node
RUN mkdir ~/.npm-global
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
RUN npm install -g @beam-australia/react-env@3.1.1
COPY --chown=node package.json package-lock.json* ./
RUN npm ci


FROM base AS builder

WORKDIR /home/node/app
RUN chown node /home/node/app
COPY --from=deps --chown=node /home/node/app/node_modules ./node_modules
COPY --chown=node . .
USER node
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build


FROM base AS runner

HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

WORKDIR /home/node/app
RUN chown node /home/node/app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

USER node
RUN mkdir ~/.npm-global
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

COPY --from=deps --chown=node /home/node/.npm-global /home/node/.npm-global
COPY --from=builder --chown=node /home/node/app/public ./public
COPY --from=builder --chown=node /home/node/app/.next/standalone ./
COPY --from=builder --chown=node /home/node/app/.next/static ./.next/static
COPY --from=builder --chown=node /home/node/app/docker/docker-entrypoint.sh /home/node/app/docker-entrypoint.sh
COPY --from=builder --chown=node /home/node/app/.env* ./

EXPOSE 3000
ENV PORT 3000

RUN chmod +x /home/node/app/docker-entrypoint.sh
ENTRYPOINT ["/home/node/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
