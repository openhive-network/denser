#!/usr/bin/env bash
# The blog's fixture-replay Playwright suite (apps/blog/playwright/tests/fixture),
# the `fixture_e2e` suite of the full slot: a production build of the blog served
# against the fixture proxy on :8200, which answers every Hive API call from the
# committed recordings, so the suite needs no network. The live-API e2e specs run
# only as the advisory live_e2e (.aidev/run-live-e2e.sh); smoke and mirrornet are
# not bound. The wallet's fixture suite is its own full-slot suite,
# wallet_fixture (.aidev/run-wallet-fixture-e2e.sh), so it gets its own wall.
#
# Self-contained by default, as `pnpm test:fixture`: build, then
# playwright.fixture.config.ts's webServer serves the build here. (CI shards the
# suite over the testenv image's build instead; see blog-fixture-tests.)
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
#   profile up, both given the same DENSER_FIXTURE_PROXY_TOKEN (the stack proxy's
#   control token, fixture-proxy-serve.mjs) — the stack's `blog` serves the build, its `fixture-proxy` relays
#   the server side's API calls to this container's workers, and the browser
#   reaches the blog as localhost:3000 (the seeder's cookie domain,
#   fixture-auth/seeder.ts:49) through a forwarder. Measured equal to the
#   default path on the same tree (247 passed / 2 skipped either way).
#
# Arguments are passed to `playwright test`, so a run can be narrowed:
#
#   .aidev/run-fixture-e2e.sh playwright/tests/fixture/13-profile
#
# AIDEV's flake layers re-run failing tests the same way (the `rerun:` of the
# full binding in .aidev/project.yaml): `chatNative.spec.ts::A › B` arrives as
#
#   .aidev/run-fixture-e2e.sh playwright/tests/fixture/chatNative.spec.ts -g 'A B'
#
# A run without arguments also runs the @basepath specs a second time against a
# build served under /blog, as subdirectory deployments (the integration site, API
# nodes' `ui` profile) serve it; production (hive.blog) is the root pass. That
# build is made first and moved to test-results/blog-basepath-next: `next build`
# empties apps/blog/.next, and the root build must be the one left there for the
# test stack's blog-live. Its cases join junit.xml as suite `basepath › <spec>`.
#
# Each pass also writes Playwright's JSON report, which records every attempt of
# a retried test where the junit keeps only the last: test-results/fixture/
# playwright.json, the `reports:` entry of the full binding (format
# playwright-json, ids `<spec>::<describe › … › title>` as in junit.xml), and
# basepath-playwright.json for the basepath pass, which is not declared: its ids
# would not carry the `basepath › ` prefix junit.xml gives them.
#
# Shards (#1429): DENSER_FIXTURE_SHARD=<k>/<n> runs shard k of n, one suite of the
# full slot each (.aidev/project.yaml), side by side on the same checkout. The
# spec files are split as CI splits them (CI_NODE_INDEX/CI_NODE_TOTAL, see
# playwright.fixture.config.ts): whole files, balanced by recorded durations, each
# in exactly one shard. Shard 1 is the `fixture_e2e` suite and the builder: it
# makes both builds as above, a copy of the root build for each other shard
# (every pass's server rewrites its build's static files and public/ as it starts,
# so two passes cannot serve one build), publishes the outcome in
# test-results/fixture-shard-builds/state, then runs its share and the basepath
# pass, writing test-results/fixture/ as before. Shard k > 1 waits for a state
# written after it started (named timeout fixture-shard-build), runs its share
# against its copy and writes test-results/fixture-shard-<k>/. A run with
# arguments (a re-run) is unsharded in every shard: it builds and runs what it
# was given, as without DENSER_FIXTURE_SHARD.
set -euo pipefail

started_at="$(date +%s)"
cd "$(dirname "$0")/.."

shard_index=1
shard_total=1
if [ -n "${DENSER_FIXTURE_SHARD:-}" ]; then
    if ! [[ "$DENSER_FIXTURE_SHARD" =~ ^([1-9][0-9]*)/([1-9][0-9]*)$ ]] \
        || [ "${BASH_REMATCH[1]}" -gt "${BASH_REMATCH[2]}" ]; then
        echo "DENSER_FIXTURE_SHARD=$DENSER_FIXTURE_SHARD is not <k>/<n> with 1 <= k <= n" >&2
        exit 2
    fi
    shard_index="${BASH_REMATCH[1]}"
    shard_total="${BASH_REMATCH[2]}"
fi
suite_name=fixture_e2e
[ "$shard_index" -eq 1 ] || suite_name="fixture_e2e_shard_$shard_index"
shard_builds="$PWD/test-results/fixture-shard-builds"
shard_state="$shard_builds/state"

# The shard state, written whole: `ok`, or why the other shards have no build.
publish_shard_state() {
    mkdir -p "$shard_builds"
    printf '%s\n' "$1" > "$shard_state.tmp"
    mv -f "$shard_state.tmp" "$shard_state"
}

# Set before anything can fail, so the other shards never wait out their timeout
# for a builder that has stopped.
builds_for_shards=0
if [ "$shard_index" -eq 1 ] && [ "$shard_total" -gt 1 ] && [ "$#" -eq 0 ] \
    && [ "${DENSER_FIXTURE_VIA_STACK:-}" != 1 ]; then
    builds_for_shards=1
    rm -rf "$shard_builds"
    trap '[ -f "$shard_state" ] || publish_shard_state "the fixture_e2e suite ended before its build was ready"' EXIT
fi

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh
# shellcheck source=junit-helpers.sh
source .aidev/junit-helpers.sh

results=test-results/fixture
[ "$shard_index" -eq 1 ] || results="test-results/fixture-shard-$shard_index"
results_dir="$PWD/$results"
rm -rf "$results_dir"
mkdir -p "$results_dir"
junit="$results_dir/junit.xml"
basepath_junit="$results_dir/basepath-junit.xml"
json_report="$results_dir/playwright.json"
basepath_json_report="$results_dir/basepath-playwright.json"
basepath_next="$PWD/test-results/blog-basepath-next"
basepath=/blog

# CI=1: forbid test.only, one retry, and always start a fresh server (the
# config's reuseExistingServer would otherwise attach to anything on :3000).
export CI=1

# Playwright can fail the run outside any test: the replay MISS baseline
# (fixture-misses/global-teardown.ts) throws from globalTeardown, which runs
# before the junit reporter writes, so the junit shows no failure. Record such
# a run as a failing case in the junit.
#
#   run_playwright JUNIT JSON SUITE PLAYWRIGHT_ARGS...
miss_error='new fixture MISS'
run_playwright() {
    local junit="$1" json="$2" suite="$3" log status=0
    shift 3
    log="$(mktemp)"
    PLAYWRIGHT_JUNIT_OUTPUT_NAME="$junit" PLAYWRIGHT_JSON_OUTPUT_NAME="$json" \
        pnpm exec playwright test --reporter=list,junit,json "$@" < /dev/null 2>&1 | tee "$log" || status=${PIPESTATUS[0]}
    if [ "$status" -ne 0 ]; then
        if grep -q "$miss_error" "$log"; then
            junit_add_unreported_failure "$junit" "$suite" "fixture MISS baseline" "$log" "$status" "$miss_error"
        else
            junit_add_unreported_failure "$junit" "$suite" "$suite run" "$log" "$status"
        fi
    fi
    rm -f "$log"
    return "$status"
}


# Chained: run under `||`, a function does not stop on a failing command.
build_basepath_blog() {
    rm -rf "$basepath_next" \
        && (cd apps/blog && NEXT_PUBLIC_BASE_PATH="$basepath" pnpm build < /dev/null) \
        && mkdir -p "$basepath_next" \
        && mv apps/blog/.next/standalone apps/blog/.next/static "$basepath_next/"
}

run_basepath_fixture() {
    (cd apps/blog && FIXTURE_BASE_PATH="$basepath" FIXTURE_NEXT_DIR="$basepath_next" \
        run_playwright "$basepath_junit" "$basepath_json_report" fixture_e2e_basepath --config=playwright.fixture.config.ts \
        --grep @basepath --output=test-results/basepath)
}

# Merges the basepath pass's junit into junit.xml; its exit status is the pass's.
finish_basepath_fixture() {
    local status="$1"
    junit_merge_prefixed "$junit" "$basepath_junit" basepath
    rm -rf "$basepath_next"
    return "$status"
}

# Run by the builder once the root build is in apps/blog/.next, before its own
# pass starts a server on it.
copy_build_for_shards() {
    local k
    for ((k = 2; k <= shard_total; k++)); do
        mkdir -p "$shard_builds/$k" \
            && cp -a apps/blog/.next/standalone apps/blog/.next/static "$shard_builds/$k/" \
            || return 1
    done
}

# Waits for a state the builder published after this shard started: an older one
# is a previous run's. Fails, with the reason, when it is not `ok` or none comes.
wait_for_shard_build() {
    STATE="$shard_state" SINCE_MS="$((started_at * 1000))" SHARD="$shard_index/$shard_total" node --input-type=module -e '
import fs from "node:fs";
import { testTimeout, recordTimedAction } from "./playwright/support/timeouts.ts";
const { STATE, SINCE_MS, SHARD } = process.env;
const defaultMs = 1800000;
const timeoutMs = testTimeout("fixture-shard-build", defaultMs);
const start = Date.now();
for (;;) {
  let state;
  try {
    if (fs.statSync(STATE).mtimeMs >= Number(SINCE_MS)) state = fs.readFileSync(STATE, "utf8").trim();
  } catch {}
  if (state === "ok") {
    recordTimedAction("fixture-shard-build", Date.now() - start, defaultMs);
    console.error(`fixture_e2e shard ${SHARD}: the build is ready after ${Math.round((Date.now() - start) / 1000)} s`);
    process.exit(0);
  }
  if (state !== undefined) {
    console.error(`fixture_e2e shard ${SHARD}: no build to test, the fixture_e2e suite reports: ${state}`);
    process.exit(1);
  }
  if (Date.now() - start > timeoutMs) {
    console.error(`fixture_e2e shard ${SHARD}: the fixture_e2e suite published no build within ${timeoutMs / 1000} s`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
' < /dev/null
}

# A shard after the first, without arguments: its share against its copy of the
# builder's build.
run_shard() {
    local status=0
    run_with_junit_fallback "$junit" "$suite_name" wait_for_shard_build || exit 1
    (cd apps/blog && CI_NODE_INDEX="$shard_index" CI_NODE_TOTAL="$shard_total" \
        FIXTURE_NEXT_DIR="$shard_builds/$shard_index" FIXTURE_RESULTS_DIR="$results_dir" \
        run_playwright "$junit" "$json_report" "$suite_name" --config=playwright.fixture.config.ts \
        --output="test-results/shard-$shard_index") || status=$?
    rm -rf "${shard_builds:?}/$shard_index"
    exit "$status"
}

if [ "${DENSER_FIXTURE_VIA_STACK:-}" != 1 ]; then
    [ "$shard_index" -eq 1 ] || [ "$#" -ne 0 ] || run_shard
    status=0
    basepath_status=0
    if [ "$#" -eq 0 ]; then
        run_with_junit_fallback "$basepath_junit" fixture_e2e_basepath build_basepath_blog || basepath_status=$?
    fi
    if ! .aidev/run-blog-build.sh; then
        [ "$builds_for_shards" -eq 0 ] || publish_shard_state "the blog build failed"
        exit 1
    fi
    if [ "$builds_for_shards" -eq 1 ]; then
        copy_build_for_shards || { publish_shard_state "copying the build for the shards failed"; exit 1; }
        publish_shard_state ok
    fi
    (
        cd apps/blog
        [ "$builds_for_shards" -eq 0 ] || export CI_NODE_INDEX=1 CI_NODE_TOTAL="$shard_total"
        # A re-run of a later shard keeps to that shard's directories.
        [ "$shard_index" -eq 1 ] || set -- --output="test-results/shard-$shard_index" "$@"
        FIXTURE_RESULTS_DIR="$results_dir" run_playwright "$junit" "$json_report" "$suite_name" \
            --config=playwright.fixture.config.ts "$@"
    ) || status=$?
    if [ "$#" -eq 0 ]; then
        [ "$basepath_status" -ne 0 ] || run_basepath_fixture || basepath_status=$?
        finish_basepath_fixture "$basepath_status" || status=1
    fi
    exit "$status"
fi

# The stack's one blog cannot serve several shards: the first runs every spec.
if [ "$shard_index" -gt 1 ]; then
    echo "skipped: DENSER_FIXTURE_VIA_STACK=1 runs the whole suite in shard 1" >&2
    exit 77
fi

# ---- opt-in: against the test stack's `fixture-relay` services ----------------

[ -n "${DENSER_FIXTURE_PROXY_TOKEN:-}" ] || {
    run_with_junit_fallback "$junit" fixture_e2e sh -c 'echo "DENSER_FIXTURE_VIA_STACK=1 needs DENSER_FIXTURE_PROXY_TOKEN, the token the fixture-relay profile was started with"; exit 1'
    exit 1
}
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
    node -e "fetch('http://fixture-proxy:8200/__aidev/upstream',{method:'DELETE',headers:{'x-aidev-fixture-token':process.env.DENSER_FIXTURE_PROXY_TOKEN}}).catch(()=>{})" < /dev/null || true
}
trap cleanup EXIT

# Wait for the server (it may still be copying the build), then register this
# container's workers as the relay's upstream. The wait is the named timeout
# fixture-stack-blog-ready (playwright/support/timeouts.ts).
node --input-type=module -e '
import { testTimeout, recordTimedAction } from "./playwright/support/timeouts.ts";
const defaultMs = 180000;
const timeoutMs = testTimeout("fixture-stack-blog-ready", defaultMs);
const start = Date.now();
(async function wait() {
  for (;;) {
    try { await fetch("http://127.0.0.1:3000/favicon.ico"); break; } catch {}
    if (Date.now() - start > timeoutMs) { console.error(`fixture_e2e: the stack blog did not answer within ${timeoutMs / 1000} s`); process.exit(1); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  recordTimedAction("fixture-stack-blog-ready", Date.now() - start, defaultMs);
  const r = await fetch("http://fixture-proxy:8200/__aidev/upstream?port=8200", {
    method: "POST",
    headers: { "x-aidev-fixture-token": process.env.DENSER_FIXTURE_PROXY_TOKEN },
  });
  console.error("fixture_e2e: stack proxy", await r.text());
  process.exit(r.ok ? 0 : 1);
})();
' < /dev/null || {
    run_with_junit_fallback "$junit" fixture_e2e sh -c 'echo "the test stack blog is not serving: see the blog service log"; exit 1'
    exit 1
}

status=0
(cd apps/blog && DENSER_BLOG_URL=http://localhost:3000 \
    run_playwright "$junit" "$json_report" fixture_e2e --config=../../.aidev/playwright.fixture-stack.config.ts \
    --tsconfig=tsconfig.json "$@") || status=$?
exit "$status"
