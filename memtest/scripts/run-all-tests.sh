#!/bin/bash
# run-all-tests.sh — Master orchestrator for memory leak isolation tests
# Runs all F1-F7 tests sequentially, each in a fresh container
#
# Prerequisites:
#   - Docker image "denser-memtest:latest" built
#   - URL corpus at /tmp/urls-all.txt
#   - k6 installed (or available via docker)
#   - jq, curl available
#
# Usage: ./scripts/run-all-tests.sh [BASE_URL] [RPS] [DURATION]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMTEST_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${MEMTEST_DIR}/results"
K6_DIR="${MEMTEST_DIR}/k6"

RPS="${1:-10}"
DURATION="${2:-10m}"
DURATION_SEC="${3:-600}"
BLOG_PORT=3000
BASE_URL="http://localhost:${BLOG_PORT}"
IMAGE="denser-memtest:latest"

# Container memory limit
MEM_LIMIT="4g"

# Sampling interval (seconds)
SAMPLE_INTERVAL=5

# Warmup time before starting load (seconds)
WARMUP=30

# Cooldown after load stops (seconds)
COOLDOWN=120

mkdir -p "$RESULTS_DIR"

# ============================================================================
# Helper functions
# ============================================================================

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

wait_for_app() {
  local url="$1"
  local max_wait="${2:-120}"
  local elapsed=0
  log "Waiting for app at ${url}..."
  while [ "$elapsed" -lt "$max_wait" ]; do
    if curl -s -o /dev/null -w "%{http_code}" "${url}/api/debug/mem" 2>/dev/null | grep -q "200"; then
      log "App is ready (took ${elapsed}s)"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  log "ERROR: App not ready after ${max_wait}s"
  return 1
}

take_snapshot() {
  local label="$1"
  local result
  result=$(curl -s "${BASE_URL}/api/debug/mem?action=snapshot" 2>/dev/null)
  if echo "$result" | jq -e '.snapshot' > /dev/null 2>&1; then
    log "Snapshot ${label}: $(echo "$result" | jq -r '.snapshot')"
  else
    log "Snapshot ${label}: $(echo "$result" | jq -c '.')"
  fi
}

start_sampler() {
  local outfile="$1"
  bash "${SCRIPT_DIR}/sample-memory.sh" "$BASE_URL" "$outfile" "$SAMPLE_INTERVAL" &
  echo $!
}

stop_sampler() {
  local pid="$1"
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

run_k6() {
  local script="$1"
  shift
  log "Starting k6 load: ${script} (RPS=${RPS}, duration=${DURATION})"
  # Try native k6 first, fall back to docker
  if command -v k6 &>/dev/null; then
    k6 run \
      --env BASE_URL="$BASE_URL" \
      --env RPS="$RPS" \
      --env DURATION="$DURATION" \
      "$@" \
      "${K6_DIR}/${script}" 2>&1 | tail -20
  else
    docker run --rm --network host \
      -v /tmp/urls-all.txt:/tmp/urls-all.txt:ro \
      -v "${K6_DIR}:/scripts:ro" \
      grafana/k6 run \
      --env BASE_URL="$BASE_URL" \
      --env RPS="$RPS" \
      --env DURATION="$DURATION" \
      "$@" \
      "/scripts/${script}" 2>&1 | tail -20
  fi
  log "k6 load complete"
}

start_container() {
  local name="$1"
  shift
  local extra_envs=("$@")

  log "Starting container: ${name}"
  # Clean up any existing container with same name
  docker rm -f "$name" 2>/dev/null || true

  local env_args=()
  for env in "${extra_envs[@]}"; do
    env_args+=(-e "$env")
  done

  docker run -d --name "$name" \
    -p "${BLOG_PORT}:3000" \
    -m "$MEM_LIMIT" \
    "${env_args[@]}" \
    "$IMAGE"
}

stop_container() {
  local name="$1"
  log "Stopping container: ${name}"
  # Copy heap snapshots out before stopping
  docker cp "${name}:/tmp/" "${RESULTS_DIR}/snapshots-${name}/" 2>/dev/null || true
  docker stop "$name" 2>/dev/null || true
  docker rm "$name" 2>/dev/null || true
}

run_test() {
  # Generic test runner
  # Usage: run_test <test_name> <k6_script> <extra_k6_args...> -- <container_env...>
  local test_name="$1"
  local k6_script="$2"
  shift 2

  # Parse args: k6 args before --, container envs after --
  local k6_args=()
  local container_envs=()
  local parsing_k6=true
  for arg in "$@"; do
    if [ "$arg" = "--" ]; then
      parsing_k6=false
      continue
    fi
    if $parsing_k6; then
      k6_args+=("$arg")
    else
      container_envs+=("$arg")
    fi
  done

  log "=========================================="
  log "TEST: ${test_name}"
  log "=========================================="

  start_container "$test_name" "${container_envs[@]}"
  wait_for_app "$BASE_URL"

  # Warmup
  log "Warming up for ${WARMUP}s..."
  sleep "$WARMUP"
  take_snapshot "S1-baseline"

  # Start sampling
  local sampler_pid
  sampler_pid=$(start_sampler "${RESULTS_DIR}/${test_name}.csv")

  # Run load
  run_k6 "$k6_script" "${k6_args[@]}"

  # Mid-test snapshot was already taken by time-based sampling
  take_snapshot "S2-end-of-load"

  # Cooldown
  log "Cooldown: ${COOLDOWN}s..."
  sleep "$COOLDOWN"
  take_snapshot "S3-post-cooldown"

  stop_sampler "$sampler_pid"
  stop_container "$test_name"

  log "Test ${test_name} complete. Results: ${RESULTS_DIR}/${test_name}.csv"
  echo
}

# ============================================================================
# Pre-flight checks
# ============================================================================

log "Pre-flight checks..."

if [ ! -f /tmp/urls-all.txt ] || [ "$(wc -l < /tmp/urls-all.txt)" -lt 10 ]; then
  log "Generating URL corpus..."
  bash "${SCRIPT_DIR}/generate-url-corpus.sh"
fi

URL_COUNT=$(wc -l < /tmp/urls-all.txt)
log "URL corpus: ${URL_COUNT} URLs"

if ! docker image inspect "$IMAGE" > /dev/null 2>&1; then
  log "ERROR: Docker image ${IMAGE} not found. Build it first."
  exit 1
fi

# Check for k6
if ! command -v k6 &>/dev/null; then
  log "k6 not found locally, will use docker grafana/k6"
  docker pull grafana/k6 2>&1 | tail -2
fi

log "All pre-flight checks passed."
echo

# ============================================================================
# F1: Baseline — Full production config
# ============================================================================

run_test "f1-baseline" "blog-crawler.js" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=3072"

# ============================================================================
# F2: Node.js version comparison
# F2 is N/A in this setup — emsdk image uses Node 22.
# The Dockerfile.memtest runner stage uses node:22-alpine.
# To test Node 20.17 vs 20.15, we'd need separate Dockerfiles.
# We run F2 as a single test with the current Node 22 (the fix itself).
# ============================================================================

log "F2: Node version test — using node:22 (emsdk build). Node 20.x variants require separate images."
run_test "f2-node22" "blog-crawler.js" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=3072"

# ============================================================================
# F3: Sentry tracing isolation
# ============================================================================

# F3-a: Sentry 100% + bot UA (default config, bot user agent)
run_test "f3-sentry100-bot" "blog-crawler.js" \
  --env "USER_AGENT=Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=3072" \
  "REACT_APP_SENTRY_DSN=${REACT_APP_SENTRY_DSN:-}"

# F3-b: Sentry disabled
run_test "f3-sentry-disabled" "blog-crawler.js" \
  --env "USER_AGENT=Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=3072" \
  "REACT_APP_SENTRY_DSN="

# F3-d: Sentry 100% + real browser UA
run_test "f3-sentry100-real" "blog-crawler.js" \
  --env "USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=3072" \
  "REACT_APP_SENTRY_DSN=${REACT_APP_SENTRY_DSN:-}"

# ============================================================================
# F4: QueryClient SSR isolation
# ============================================================================

# F4-a: QueryClient — production code (no fix)
run_test "f4-queryclient-nofix" "resolve-post-only.js" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=3072"

# F4-b: Cache eviction test — 10min load + 10min cooldown (uses longer cooldown)
log "=========================================="
log "TEST: f4-cache-eviction (extended cooldown)"
log "=========================================="
COOLDOWN_ORIG=$COOLDOWN
COOLDOWN=600  # 10 minutes for cache eviction observation
run_test "f4-cache-eviction" "resolve-post-only.js" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=3072"
COOLDOWN=$COOLDOWN_ORIG

# ============================================================================
# F5: RSS vs heapUsed divergence
# Analyzed from F1 data — no separate test needed.
# Also run with constrained heap to check V8 page release behavior.
# ============================================================================

run_test "f5-constrained-heap" "blog-crawler.js" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=1536"

# ============================================================================
# F6: Next.js fetch instrumentation
# This requires code changes (raw node:http). Skip if no variant image exists.
# We test the default fetch behavior only.
# ============================================================================

log "F6: fetch instrumentation test — running with global fetch (default)"
run_test "f6-global-fetch" "blog-crawler.js" \
  -- \
  "NODE_OPTIONS=--expose-gc --max-old-space-size=3072"

# ============================================================================
# F7: serverExternalPackages effect
# This requires a rebuild with next.config.js change. Skip if no variant.
# ============================================================================

log "F7: serverExternalPackages — requires separate build with config change"
log "F7: Skipping (would need separate Dockerfile variant)"

# ============================================================================
# Analysis
# ============================================================================

log "=========================================="
log "ALL TESTS COMPLETE — Running analysis"
log "=========================================="

python3 "${SCRIPT_DIR}/analyze-test.py" "$RESULTS_DIR" --rps "$RPS" --duration "$DURATION_SEC"

log "Results saved to ${RESULTS_DIR}/"
log "Done."
