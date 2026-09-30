#!/usr/bin/env bash
# Run fixture specs against the live dev stack (.aidev/dev-stack.compose.yml),
# i.e. against `next dev` of the working tree, with hot reload — no build.
#
#   .aidev/dev-stack-spec.sh playwright/tests/fixture/postDetail.spec.ts [playwright args...]
#
# Spec paths are relative to apps/blog, as for `playwright test`. Arguments go to
# `playwright test` unchanged (-g, --headed is not available, --repeat-each ...).
#
# Playwright runs in the project's pinned test image, inside the stack's network
# namespace, so the topology is exactly the fixture suite's: the blog on
# localhost:3000 and the fixture proxy on localhost:8200. For the run, the
# stack's proxy relays to the fixture proxy each Playwright worker starts for its
# spec (on :8201), so the app's server side and the browser read the same
# recording with shared call counters; afterwards the proxy goes back to the
# recording it served before.
#
# Needs: docker, and the stack's compose project and daemon-side checkout —
# DENSER_DEV_STACK_PROJECT and DENSER_DEV_CHECKOUT, which sandbox.dev.env hands an
# AIDEV implement session (see .aidev/README.md); by hand, pass them yourself:
#   DENSER_DEV_STACK_PROJECT=denser-dev DENSER_DEV_CHECKOUT=$PWD .aidev/dev-stack-spec.sh ...
set -euo pipefail

cd "$(dirname "$0")/.."

project="${DENSER_DEV_STACK_PROJECT:-${AIDEV_DEV_STACK_PROJECT:?DENSER_DEV_STACK_PROJECT: the dev stack compose project}}"
checkout="${DENSER_DEV_CHECKOUT:-${AIDEV_HOST_CHECKOUT:-$PWD}}"
image="$(sed -n 's/^x-image: &image //p' .aidev/dev-stack.compose.yml)"

proxy="$(docker ps -q --filter "label=com.docker.compose.project=$project" --filter label=com.docker.compose.service=fixture-proxy | head -1)"
[ -n "$proxy" ] || { echo "dev-stack-spec: no running fixture-proxy in compose project $project" >&2; exit 2; }

in_stack() {
    docker run --rm --network "container:$proxy" --user "$(id -u):$(id -g)" \
        -v "$checkout:/work" -w /work/apps/blog "$image" "$@"
}

control() { # METHOD PATH [BODY]
    in_stack node -e '
const [m, p, b] = process.argv.slice(1);
fetch("http://127.0.0.1:8200" + p, { method: m, body: b || undefined })
  .then(async (r) => { const t = await r.text(); console.log(t); process.exit(r.ok ? 0 : 1); }, (e) => { console.error(String(e)); process.exit(1); });
' "$@"
}

before="$(control GET /__aidev/status)"
restore() {
    local set
    set="$(printf '%s' "$before" | sed -n 's/.*"fixtureSet":"\([^"]*\)".*/\1/p')"
    if [ -n "$set" ]; then control PUT "/__aidev/fixture-set/$set" > /dev/null || true
    else control DELETE /__aidev/upstream > /dev/null || true; fi
}
trap restore EXIT

control POST /__aidev/upstream '{"url":"http://127.0.0.1:8201"}' > /dev/null

status=0
# Traces go to test-results/dev-stack at the checkout root: anything written under
# apps/ or packages/ is inside next's watched tree and triggers a recompile.
in_stack env CI=1 DENSER_BLOG_URL=http://localhost:3000 DENSER_FIXTURE_WORKER_PORT=8201 \
    DENSER_PLAYWRIGHT_OUTPUT_DIR=/work/test-results/dev-stack \
    pnpm exec playwright test --config=../../.aidev/playwright.fixture-stack.config.ts \
    --tsconfig=tsconfig.json --reporter=list "$@" || status=$?
exit "$status"
