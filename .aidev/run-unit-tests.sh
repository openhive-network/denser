#!/usr/bin/env bash
# The mocha unit suites of packages/renderer and packages/transaction, and the
# node:test suites of scripts/ci-helpers: the `baseline` slot and the `unit` suite
# of the quick, full and canary slots.
# No I/O, no server. Each package writes junit (mocha's built-in xunit reporter)
# to test-results/unit/, the per-test evidence AIDEV reads from the binding's
# `artifacts:` path; the exit code is the verdict.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh
# shellcheck source=junit-helpers.sh
source .aidev/junit-helpers.sh

# Last-run-wins: a report left by an earlier run must not be read as this one's.
rm -rf test-results/unit
mkdir -p test-results/unit

status=0
for pkg in renderer transaction; do
    echo "== mocha packages/$pkg" >&2
    junit="$PWD/test-results/unit/$pkg.xml"
    run_with_junit_fallback "$junit" "$pkg" pnpm --filter "@hive/$pkg" test --reporter xunit \
        --reporter-option "output=$junit" < /dev/null || status=1
done

echo "== node --test scripts/ci-helpers" >&2
junit="$PWD/test-results/unit/ci-helpers.xml"
run_with_junit_fallback "$junit" ci-helpers node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    scripts/ci-helpers/*.test.js < /dev/null || status=1
exit "$status"
