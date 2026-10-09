#!/usr/bin/env bash
# The wallet's fixture-replay Playwright suite (apps/wallet/playwright/tests/fixture),
# the `wallet_fixture` suite of the full slot: a production build of the wallet
# (NEXT_PUBLIC_BASE_PATH=/wallet) and playwright.fixture.config.ts against the
# recorded API responses, so it needs no network.
#
# Split out of .aidev/run-fixture-e2e.sh on 2026-10-09. Run inside fixture_e2e, the
# wallet build and pass came after two blog builds, the blog pass and the basepath
# pass. On a loaded host (steem-5: blog pass 747 s) the shared 900 s suite wall
# expired during the wallet build, so no wallet case ran and junit held only the
# blog's (denser#1093, #799). A suite of its own gets its own wall, and a slow blog
# pass can no longer starve it.
#
# Arguments are passed to `playwright test`, so a run can be narrowed:
#
#   .aidev/run-wallet-fixture-e2e.sh playwright/tests/fixture/transferMemoSecret.spec.ts
set -euo pipefail
cd "$(dirname "$0")/.."
source .aidev/pnpm-deps.sh
source .aidev/junit-helpers.sh

rm -rf test-results/wallet-fixture
mkdir -p test-results/wallet-fixture
junit="$PWD/test-results/wallet-fixture/junit.xml"
export CI=1

cd apps/wallet
PLAYWRIGHT_JUNIT_OUTPUT_NAME="$junit" run_with_junit_fallback "$junit" wallet_fixture \
    sh -c 'NEXT_PUBLIC_BASE_PATH=/wallet pnpm build < /dev/null && pnpm exec playwright test --config=playwright.fixture.config.ts --reporter=list,junit "$@" < /dev/null' sh "$@"
