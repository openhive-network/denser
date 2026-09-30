#!/usr/bin/env bash
# A production build of the blog (`pnpm build`), run by .aidev/run-fixture-e2e.sh.
# The same standalone build is what .aidev/test-stack.compose.yml's blog-live
# serves to live_e2e, which runs after fixture_e2e — AIDEV starts the stack
# right before the first `stack: true` suite — so no image is ever built for it.
#
# The marker written last, apps/blog/.next/aidev-build-complete, is what the
# stack's blog services wait for; `next build` empties .next first, so a failed
# build leaves none behind and the suites after it report the missing build
# instead of testing a stale one.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

cd apps/blog
pnpm build < /dev/null
date -u +%Y-%m-%dT%H:%M:%SZ > .next/aidev-build-complete
