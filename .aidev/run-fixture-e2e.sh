#!/usr/bin/env bash
# The blog's fixture-replay Playwright suite (apps/blog/playwright/tests/fixture),
# the `fixture_e2e` suite of the full slot: a production build of the blog served
# against the fixture proxy on :8200, which answers every Hive API call from the
# committed recordings. The live-API e2e suites run only as the advisory live_e2e
# (.aidev/run-live-e2e.sh); smoke and mirrornet are not bound.
#
# Two ways to get the server:
#
#   the test stack (#967) — DENSER_TEST_STACK=1 (the full slot's binding sets it)
#     and the stack reachable: the build the blog_build suite made
#     (.aidev/run-blog-build.sh) is served by .aidev/test-stack.compose.yml's
#     `blog`, reached here as localhost:3000 through a forwarder. The stack's
#     fixture proxy relays the server side's API calls to the proxy each
#     Playwright worker starts here, so both sides read the spec's recording.
#   standalone — anything else (no stack, a run by hand): build here and let
#     playwright.fixture.config.ts's webServer start the server, as CI does.
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
# shellcheck source=junit-helpers.sh
source .aidev/junit-helpers.sh

rm -rf test-results/fixture
mkdir -p test-results/fixture
junit="$PWD/test-results/fixture/junit.xml"

# CI=1: forbid test.only, one retry, and always start a fresh server (the
# config's reuseExistingServer would otherwise attach to anything on :3000).
export CI=1
export PLAYWRIGHT_JUNIT_OUTPUT_NAME="$junit"

stack_up() {
    [ "${DENSER_TEST_STACK:-}" = 1 ] || return 1
    node -e "fetch('http://fixture-proxy:8200/__aidev/status').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" < /dev/null
}

if ! stack_up; then
    [ "${DENSER_TEST_STACK:-}" = 1 ] && echo "fixture_e2e: DENSER_TEST_STACK=1 but the test stack is unreachable; building and serving the blog here" >&2
    cd apps/blog
    pnpm build < /dev/null
    exec pnpm exec playwright test --config=playwright.fixture.config.ts --reporter=list,junit "$@" < /dev/null
fi

echo "fixture_e2e: against the test stack (.aidev/test-stack.compose.yml)" >&2

# The blog_build suite normally built already; build here when it did not run
# (a narrowed `aidev test` run, say). The stack's blog starts on the marker.
[ -f apps/blog/.next/aidev-build-complete ] || .aidev/run-blog-build.sh

# The seeder's session cookie is scoped to `localhost`, so the browser must reach
# the blog as localhost:3000.
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
