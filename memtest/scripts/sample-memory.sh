#!/bin/bash
# scripts/sample-memory.sh — Polls /api/debug/mem and writes CSV
BASE_URL="${1:-http://localhost:3000}"
OUTFILE="${2:-mem-samples.csv}"
INTERVAL="${3:-5}"

echo "timestamp,rss_mb,heapTotal_mb,heapUsed_mb,external_mb,arrayBuffers_mb" > "$OUTFILE"

while true; do
  DATA=$(curl -s "${BASE_URL}/api/debug/mem" 2>/dev/null)
  if [ -n "$DATA" ] && echo "$DATA" | jq -e '.timestamp' > /dev/null 2>&1; then
    TS=$(echo "$DATA" | jq -r '.timestamp')
    RSS=$(echo "$DATA" | jq -r '.rss_mb')
    HT=$(echo "$DATA" | jq -r '.heapTotal_mb')
    HU=$(echo "$DATA" | jq -r '.heapUsed_mb')
    EXT=$(echo "$DATA" | jq -r '.external_mb')
    AB=$(echo "$DATA" | jq -r '.arrayBuffers_mb')
    echo "${TS},${RSS},${HT},${HU},${EXT},${AB}" >> "$OUTFILE"
    echo "[$(date +%H:%M:%S)] RSS=${RSS}MB  heap=${HU}MB  ext=${EXT}MB"
  else
    echo "[$(date +%H:%M:%S)] Waiting for app..."
  fi
  sleep "$INTERVAL"
done
