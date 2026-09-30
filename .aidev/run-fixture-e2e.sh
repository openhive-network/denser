#!/usr/bin/env bash
# The blog's fixture-replay Playwright suite (apps/blog/playwright/tests/fixture),
# the `fixture_e2e` suite of the full slot: a production build of the blog served
# against the fixture proxy on :8200, which answers every Hive API call from the
# committed recordings, so the suite needs no network. The live-API e2e specs run
# only as the advisory live_e2e (.aidev/run-live-e2e.sh); smoke and mirrornet are
# not bound.
#
# Self-contained by default, as CI's blog-fixture-tests job (pnpm test:fixture):
# build, then playwright.fixture.config.ts's webServer serves the build here.
# The build goes through .aidev/run-blog-build.sh, whose completion marker lets
# the test stack's blog-live serve the same build to live_e2e afterwards.
#
# Why it does not use the shared test stack (#967): the fixture proxy is not a
# service but a per-spec, per-worker fixture — apps/blog/playwright/tests/support/
# fixture-proxy-test.ts:61-95 starts a replay proxy for the spec's own recording
# on :8200 inside the Playwright process, and the app's server side must read
# that same proxy. A stack server can only reach it by relaying back into the
# suite's container. That relay exists, opt-in and off by default:
#
#   DENSER_FIXTURE_VIA_STACK=1 with .aidev/test-stack.compose.yml's `fixture-relay`
#   profile up — the stack's `blog` serves the build, its `fixture-proxy` relays
#   the server side's API calls to this container's workers, and the browser
#   reaches the blog as localhost:3000 (the seeder's cookie domain,
#   fixture-auth/seeder.ts:49) through a forwarder. Measured equal to the
#   default path on the same tree (247 passed / 2 skipped either way).
#
# Arguments are passed to `playwright test`, so a run can be narrowed:
#
#   .aidev/run-fixture-e2e.sh playwright/tests/fixture/13-profile
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh
# shellcheck source=junit-helpers.sh
source .aidev/junit-helpers.sh

rm -rf test-results/fixture
mkdir -p test-results/fixture
junit="$PWD/test-results/fixture/junit.xml"

# CI=1: forbid test.only, one retry, and always start a fresh server (the
# config's reuseExistingServer would otherwise attach to anything on :3000).
export CI=1
export PLAYWRIGHT_JUNIT_OUTPUT_NAME="$junit"

if [ "${DENSER_FIXTURE_VIA_STACK:-}" != 1 ]; then
    .aidev/run-blog-build.sh
    cd apps/blog
    exec pnpm exec playwright test --config=playwright.fixture.config.ts --reporter=list,junit "$@" < /dev/null
fi

# ---- opt-in: against the test stack's `fixture-relay` services ----------------

node -e "fetch('http://fixture-proxy:8200/__aidev/status').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" < /dev/null || {
    run_with_junit_fallback "$junit" fixture_e2e sh -c 'echo "DENSER_FIXTURE_VIA_STACK=1 but the test stack fixture-proxy is unreachable (is the fixture-relay profile up?)"; exit 1'
    exit 1
}
echo "fixture_e2e: against the test stack (.aidev/test-stack.compose.yml, fixture-relay)" >&2

[ -f apps/blog/.next/aidev-build-complete ] || .aidev/run-blog-build.sh

node .aidev/fixture-proxy-serve.mjs forward 3000 blog:3000 < /dev/null &
forwarder=$!
cleanup() {
    kill "$forwarder" 2> /dev/null || true
    node -e "fetch('http://fixture-proxy:8200/__aidev/upstream',{method:'DELETE'}).catch(()=>{})" < /dev/null || true
}
trap cleanup EXIT

# Wait for the server (it may still be copying the build), then register this
# container's workers as the relay's upstream.
node -e '
const deadline = Date.now() + 180000;
(async function wait() {
  for (;;) {
    try { await fetch("http://127.0.0.1:3000/favicon.ico"); break; } catch {}
    if (Date.now() > deadline) { console.error("fixture_e2e: the stack blog did not answer within 180 s"); process.exit(1); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const r = await fetch("http://fixture-proxy:8200/__aidev/upstream?port=8200", { method: "POST" });
  console.error("fixture_e2e: stack proxy", await r.text());
  process.exit(r.ok ? 0 : 1);
})();
' < /dev/null || {
    run_with_junit_fallback "$junit" fixture_e2e sh -c 'echo "the test stack blog is not serving: see the blog service log"; exit 1'
    exit 1
}

cd apps/blog
status=0
DENSER_BLOG_URL=http://localhost:3000 \
    pnpm exec playwright test --config=../../.aidev/playwright.fixture-stack.config.ts \
    --tsconfig=tsconfig.json --reporter=list,junit "$@" < /dev/null || status=$?
exit "$status"
