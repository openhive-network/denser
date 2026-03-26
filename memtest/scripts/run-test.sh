#!/bin/bash
# run-test.sh — Run a single memory leak isolation test
#
# Usage: ./run-test.sh <test_name> <k6_script> [extra_k6_env_args] [-- container_env_args]
# Example: ./run-test.sh f1-baseline blog-crawler.js -- NODE_OPTIONS="--expose-gc"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMTEST_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${MEMTEST_DIR}/results"
K6_DIR="${MEMTEST_DIR}/k6"
K6_BIN="${K6_BIN:-/tmp/k6-v0.56.0-linux-amd64/k6}"

RPS="${RPS:-10}"
DURATION="${DURATION:-10m}"
BLOG_PORT=3000
BASE_URL="http://localhost:${BLOG_PORT}"
IMAGE="${IMAGE:-denser-memtest:latest}"
SAMPLE_INTERVAL=5
WARMUP=30
COOLDOWN="${COOLDOWN:-120}"

TEST_NAME="$1"
K6_SCRIPT="$2"
shift 2

# Parse: k6 env args before --, container envs after --
K6_EXTRA_ARGS=()
CONTAINER_ENVS=()
parsing_k6=true
for arg in "$@"; do
  if [ "$arg" = "--" ]; then
    parsing_k6=false
    continue
  fi
  if $parsing_k6; then
    K6_EXTRA_ARGS+=("$arg")
  else
    CONTAINER_ENVS+=("$arg")
  fi
done

mkdir -p "$RESULTS_DIR"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "=========================================="
log "TEST: ${TEST_NAME}"
log "=========================================="

# Start container
docker rm -f "$TEST_NAME" 2>/dev/null || true
ENV_ARGS=()
for env in "${CONTAINER_ENVS[@]}"; do
  ENV_ARGS+=(-e "$env")
done

log "Starting container..."
docker run -d --name "$TEST_NAME" -p "${BLOG_PORT}:3000" "${ENV_ARGS[@]}" "$IMAGE"

# Wait for app
log "Waiting for app..."
elapsed=0
while [ "$elapsed" -lt 120 ]; do
  if curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/debug/mem" 2>/dev/null | grep -q "200"; then
    log "App ready (${elapsed}s)"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

# Warmup
log "Warming up ${WARMUP}s..."
sleep "$WARMUP"

# Take baseline memory reading
log "Baseline:"
curl -s "${BASE_URL}/api/debug/mem" | jq -c .

# Start memory sampler
CSV_FILE="${RESULTS_DIR}/${TEST_NAME}.csv"
echo "timestamp,rss_mb,heapTotal_mb,heapUsed_mb,external_mb,arrayBuffers_mb" > "$CSV_FILE"
(
  while true; do
    DATA=$(curl -s "${BASE_URL}/api/debug/mem" 2>/dev/null)
    if [ -n "$DATA" ] && echo "$DATA" | jq -e '.timestamp' > /dev/null 2>&1; then
      TS=$(echo "$DATA" | jq -r '.timestamp')
      RSS=$(echo "$DATA" | jq -r '.rss_mb')
      HT=$(echo "$DATA" | jq -r '.heapTotal_mb')
      HU=$(echo "$DATA" | jq -r '.heapUsed_mb')
      EXT=$(echo "$DATA" | jq -r '.external_mb')
      AB=$(echo "$DATA" | jq -r '.arrayBuffers_mb')
      echo "${TS},${RSS},${HT},${HU},${EXT},${AB}" >> "$CSV_FILE"
    fi
    sleep "$SAMPLE_INTERVAL"
  done
) &
SAMPLER_PID=$!

# Run k6 load
log "Starting k6: ${K6_SCRIPT} (RPS=${RPS}, duration=${DURATION})"
"$K6_BIN" run \
  --env BASE_URL="$BASE_URL" \
  --env RPS="$RPS" \
  --env DURATION="$DURATION" \
  "${K6_EXTRA_ARGS[@]}" \
  "${K6_DIR}/${K6_SCRIPT}" 2>&1 | grep -E "http_req|checks|iteration|✓|✗|running|scenarios" | tail -15
log "k6 load complete"

# Cooldown
log "Cooldown: ${COOLDOWN}s..."
sleep "$COOLDOWN"

# Final reading
log "Final:"
curl -s "${BASE_URL}/api/debug/mem" | jq -c .

# Stop sampler
kill "$SAMPLER_PID" 2>/dev/null || true
wait "$SAMPLER_PID" 2>/dev/null || true

# Stop container
docker stop "$TEST_NAME" > /dev/null 2>&1 || true
docker rm "$TEST_NAME" > /dev/null 2>&1 || true

log "Test ${TEST_NAME} complete. CSV: ${CSV_FILE}"
log "Data points: $(wc -l < "$CSV_FILE")"
echo
