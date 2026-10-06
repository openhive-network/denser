# Test runtime AIDEV runs denser's verification suites in (the profile's
# `environment: {kind: container}`, see ai/aidev docs/operations/project-test-runtimes.md).
#
# AIDEV runs it as `docker run --rm --network none --user <uid>:<gid> -v <workspace>:/work`,
# so everything a suite needs must already be in the image:
#   - Playwright's Chromium (the base image, same tag CI's fixture job uses),
#   - Node 24.21.0, the version the production image and CI run (the base image
#     ships its own Node 24 minor, which is replaced),
#   - pnpm, prepared through corepack so no download happens at run time,
#   - every package pnpm-lock.yaml resolves, fetched into a store that
#     `pnpm install --offline` links node_modules from (.aidev/pnpm-deps.sh).
#
# The image is built from pnpm-lock.yaml, so a lockfile change needs a rebuild and
# a new digest in .aidev/project.yaml in the same commit (AIDEV refuses the lockfile
# alone). Rebuild with .aidev/runtime/build.sh.
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS node

FROM mcr.microsoft.com/playwright:v1.63.0-jammy@sha256:167d0506cfbe3c294fb214b2d11737326eeee028aa611fa1ba538e5057675847

# Node's official linux-x64 build needs glibc 2.28, which jammy (2.35) satisfies.
# corepack and npm stay the base image's, run by this node.
COPY --from=node /usr/local/bin/node /usr/bin/node

# The suite runs as an arbitrary uid with no passwd entry, so HOME must be a
# directory anyone can write. Corepack and the pnpm store live outside HOME.
ENV HOME=/tmp \
    COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_ENABLE_NETWORK=0 \
    npm_config_store_dir=/opt/pnpm-store \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    DO_NOT_TRACK=1

# package.json carries `packageManager`, which corepack prepares; pnpm-lock.yaml
# (with the workspace file and the @hiveio registry in .npmrc) is what pnpm fetches.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /tmp/pnpm-fetch/
RUN cd /tmp/pnpm-fetch \
    && corepack enable \
    && COREPACK_ENABLE_NETWORK=1 corepack install -g "$(node -p "require('./package.json').packageManager")" \
    && pnpm fetch \
    && cd / && rm -rf /tmp/pnpm-fetch \
    && chmod -R a+rwX /opt/pnpm-store /opt/corepack

# Lighthouse for the `system` slot's lighthouse_fixture suite (.aidev/run-lighthouse-fixture.sh):
# the version the integration site's check runs (stack/integration/lighthouse.sh), installed
# outside the workspace so no app depends on it. It drives Playwright's Chromium (CHROME_PATH,
# set by the suite).
RUN npm install -g --prefix /opt/lighthouse --no-fund --no-audit lighthouse@13.5.0 \
    && /opt/lighthouse/bin/lighthouse --version
ENV PATH=/opt/lighthouse/bin:$PATH
