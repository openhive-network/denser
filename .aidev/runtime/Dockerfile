# Test runtime AIDEV runs denser's verification suites in (the profile's
# `environment: {kind: container}`, see ai/aidev docs/operations/project-test-runtimes.md).
#
# AIDEV runs it as `docker run --rm --network none --user <uid>:<gid> -v <workspace>:/work`,
# so everything a suite needs must already be in the image. Node, pnpm and
# Playwright (with its Chromium headless shell) come from common-ci-configuration's
# node-test-tools image, the one CI runs; this file pins no tool version. It adds
#   - Playwright's full Chromium, which Lighthouse drives, from the base's Playwright,
#   - every package pnpm-lock.yaml resolves, fetched into a store that
#     `pnpm install --offline` links node_modules from (.aidev/pnpm-deps.sh).
#
# .aidev/runtime/build.sh builds it on the digest node-test-tools:develop names at
# the time; the result is pinned as `environment.image`. The base comes in as a
# build argument so AIDEV can build it on a followed base (`environment.base`).
ARG BASE_IMAGE=registry.gitlab.syncad.com/hive/common-ci-configuration/node-test-tools:develop
FROM ${BASE_IMAGE}

# The suite runs as an arbitrary uid with no passwd entry, so HOME must be a
# directory anyone can write. The pnpm store lives outside HOME. pnpm must not
# switch to `packageManager`'s version: that would download at run time, offline.
ENV HOME=/tmp \
    npm_config_store_dir=/opt/pnpm-store \
    npm_config_manage_package_manager_versions=false \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    DO_NOT_TRACK=1

RUN apt-get update \
    && playwright install --with-deps chromium \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && chmod -R a+rX /ms-playwright

# pnpm-lock.yaml (with the workspace file and the @hiveio registry in .npmrc) is
# what pnpm fetches. pnpm fetch refuses to run without the files package.json's
# patchedDependencies name; the glob keeps the COPY valid when there are none.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /tmp/pnpm-fetch/
COPY patche[s]/ /tmp/pnpm-fetch/patches/
RUN cd /tmp/pnpm-fetch \
    && pnpm fetch \
    && cd / && rm -rf /tmp/pnpm-fetch \
    && chmod -R a+rwX /opt/pnpm-store

# Lighthouse for the `system` slot's lighthouse_fixture suite (.aidev/run-lighthouse-fixture.sh):
# the version the integration site's check runs (stack/integration/lighthouse.sh), installed
# outside the workspace so no app depends on it. It drives Playwright's Chromium (CHROME_PATH,
# set by the suite).
RUN npm install -g --prefix /opt/lighthouse --no-fund --no-audit lighthouse@13.5.0 \
    && /opt/lighthouse/bin/lighthouse --version
ENV PATH=/opt/lighthouse/bin:$PATH
