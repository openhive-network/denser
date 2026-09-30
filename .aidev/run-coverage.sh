#!/usr/bin/env bash
# The `coverage` slot: the mocha unit suites of packages/renderer and
# packages/transaction (the same tests as .aidev/run-unit-tests.sh) under nyc,
# which renderer already depends on (hoisted to the root node_modules/.bin).
# Writes, per package, junit and a text summary plus Cobertura XML to
# test-results/coverage/<package>/.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh
# shellcheck source=junit-helpers.sh
source .aidev/junit-helpers.sh

rm -rf test-results/coverage
nyc="$PWD/node_modules/.bin/nyc"

status=0
for pkg in renderer transaction; do
    case "$pkg" in
        renderer) src=src ;;
        transaction) src=lib ;;
    esac
    out="$PWD/test-results/coverage/$pkg"
    mkdir -p "$out"
    echo "== nyc mocha packages/$pkg" >&2
    run_with_junit_fallback "$out/junit.xml" "$pkg" \
    env -C "packages/$pkg" TS_NODE_PROJECT=tsconfig.test.json "$nyc" \
        --extension .ts --include "$src/**/*.ts" \
        --exclude "$src/**/*.test.ts" --exclude "$src/__test-stubs__/**" \
        --reporter text-summary --reporter cobertura \
        --report-dir "$out" --temp-dir "${TMPDIR:-/tmp}/nyc-$pkg" \
        pnpm exec mocha "$src/**/*.test.ts" \
            --reporter xunit --reporter-option "output=$out/junit.xml" < /dev/null || status=1
done
exit "$status"
