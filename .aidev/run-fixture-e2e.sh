#!/usr/bin/env bash
# The blog's fixture-replay Playwright suite (apps/blog/playwright/tests/fixture),
# the `fixture_e2e` suite of the full slot: a production build of the blog served
# against the fixture proxy on :8200, which answers every Hive API call from the
# committed recordings, so the suite needs no network. The live-API e2e suites
# (tests/e2e, smoke, mirrornet) are deliberately not bound: they judge mainnet
# data, not the change.
#
# Same commands as CI's blog-fixture-tests job (pnpm test:fixture), plus a junit
# report in test-results/fixture/ for AIDEV. Arguments are passed to
# `playwright test`, so a run can be narrowed:
#
#   .aidev/run-fixture-e2e.sh playwright/tests/fixture/13-profile
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

rm -rf test-results/fixture
mkdir -p test-results/fixture

cd apps/blog
# CI=1: forbid test.only, one retry, and always start a fresh server (the
# config's reuseExistingServer would otherwise attach to anything on :3000).
export CI=1
export PLAYWRIGHT_JUNIT_OUTPUT_NAME="$PWD/../../test-results/fixture/junit.xml"
pnpm build < /dev/null
exec pnpm exec playwright test --config=playwright.fixture.config.ts --reporter=list,junit "$@" < /dev/null
