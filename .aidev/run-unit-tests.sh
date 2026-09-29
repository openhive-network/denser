#!/usr/bin/env bash
# The mocha unit suites of packages/renderer and packages/transaction: the
# `baseline` slot and the `unit` suite of the quick, full and canary slots.
# No I/O, no server. Each package writes junit (mocha's built-in xunit reporter)
# to test-results/unit/, the per-test evidence AIDEV reads from the binding's
# `artifacts:` path; the exit code is the verdict.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

# Last-run-wins: a report left by an earlier run must not be read as this one's.
rm -rf test-results/unit
mkdir -p test-results/unit

status=0
for pkg in renderer transaction; do
    echo "== mocha packages/$pkg" >&2
    pnpm --filter "@hive/$pkg" test --reporter xunit \
        --reporter-option "output=$PWD/test-results/unit/$pkg.xml" < /dev/null || status=1
done
exit "$status"
