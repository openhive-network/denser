#!/usr/bin/env bash
# The `blog_build` suite of the full slot: a production build of the blog, the
# standalone server .aidev/test-stack.compose.yml serves to the suites after it
# (fixture_e2e, live_e2e). It runs before the stack starts — AIDEV brings the
# stack up lazily, right before the first suite declaring `stack: true` — so the
# stack serves this tree's build and no image is ever built for it.
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
