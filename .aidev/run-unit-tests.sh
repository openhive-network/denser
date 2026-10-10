#!/usr/bin/env bash
# The mocha unit suites of packages/renderer and packages/transaction, and the
# node:test suites of scripts/ci-helpers, playwright/support, packages/ui, packages/smart-signer,
# apps/blog and apps/wallet (run through node's TypeScript type stripping): the `baseline` slot
# and the `unit` suite of the quick, full and canary slots.
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

echo "== node --test playwright/support" >&2
junit="$PWD/test-results/unit/playwright-support.xml"
run_with_junit_fallback "$junit" playwright-support node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    playwright/support/timeouts.test.ts playwright/support/broadcast/operations.test.ts < /dev/null || status=1

echo "== node --test packages/ui" >&2
junit="$PWD/test-results/unit/ui.xml"
run_with_junit_fallback "$junit" ui node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    packages/ui/lib/time-ago.test.ts packages/ui/lib/server-query-cache.test.ts \
    packages/ui/lib/site-url.test.ts packages/ui/lib/operation-mutation.test.ts \
    packages/ui/lib/account-name-rules.test.ts \
    packages/ui/lib/memo-secret-check.test.ts \
    packages/ui/lib/storage-with-ttl-notify.test.ts < /dev/null || status=1
echo "== node --test packages/smart-signer" >&2
junit="$PWD/test-results/unit/smart-signer.xml"
run_with_junit_fallback "$junit" smart-signer node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    packages/smart-signer/lib/oauth/return-url.test.ts \
    packages/smart-signer/lib/condenser-migration.test.ts \
    packages/smart-signer/lib/validators/key-role.test.ts < /dev/null || status=1
echo "== node --test packages/middleware" >&2
junit="$PWD/test-results/unit/middleware.xml"
run_with_junit_fallback "$junit" middleware node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    packages/middleware/lib/matcher.test.ts < /dev/null || status=1
echo "== node --test apps/blog" >&2
junit="$PWD/test-results/unit/blog.xml"
run_with_junit_fallback "$junit" blog node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    apps/blog/lib/canonical-url.test.ts \
    apps/blog/features/layouts/user-profile/lib/social-links.test.ts \
    apps/blog/features/activity-log/lib/merge-notifications.test.ts \
    apps/blog/features/post-editor/lib/scroll-sync-anchors.test.ts \
    apps/blog/features/votes/hooks/logged-user-contexts.test.ts < /dev/null || status=1
echo "== node --test apps/wallet" >&2
junit="$PWD/test-results/unit/wallet.xml"
run_with_junit_fallback "$junit" wallet node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    apps/wallet/lib/history-filter.test.ts \
    apps/wallet/feature/delegations/lib/incoming-delegations.test.ts \
    apps/wallet/playwright/tests/support/walletOperations.test.ts < /dev/null || status=1
exit "$status"
