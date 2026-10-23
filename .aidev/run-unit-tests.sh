#!/usr/bin/env bash
# The mocha unit suites of packages/renderer and packages/transaction, and the
# node:test suites of scripts/ci-helpers, .aidev, scripts/check-*-translations (with scripts/korean-translations), scripts/check-beekeeper-lockfile, playwright/support, packages/ui, packages/smart-signer, packages/common-hiveio-packages,
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

echo "== node --test .aidev" >&2
junit="$PWD/test-results/unit/aidev.xml"
run_with_junit_fallback "$junit" aidev node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    .aidev/run-live-e2e.test.mjs .aidev/base-path-front.test.mjs < /dev/null || status=1

echo "== node --test scripts/check-*-translations" >&2
junit="$PWD/test-results/unit/translations.xml"
run_with_junit_fallback "$junit" translations node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    scripts/check-wallet-translations.test.js scripts/check-blog-translations.test.js \
    scripts/check-smart-signer-translations.test.js scripts/korean-translations.test.js < /dev/null || status=1

echo "== node --test scripts/check-beekeeper-lockfile" >&2
junit="$PWD/test-results/unit/beekeeper-lockfile.xml"
run_with_junit_fallback "$junit" beekeeper-lockfile node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    scripts/check-beekeeper-lockfile.test.js < /dev/null || status=1

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
    packages/ui/lib/account-name-rules.test.ts packages/ui/lib/asset-math.test.ts \
    packages/ui/lib/memo-secret-check.test.ts \
    packages/ui/lib/storage-with-ttl-notify.test.ts packages/ui/lib/app-api-path.test.ts \
    packages/ui/lib/locale-cookie.test.ts packages/ui/lib/month-year.test.ts \
    packages/ui/lib/session-time.test.ts packages/ui/lib/user-cancelled.test.ts \
    packages/ui/config/chat.test.ts < /dev/null || status=1
echo "== node --test packages/smart-signer" >&2
junit="$PWD/test-results/unit/smart-signer.xml"
run_with_junit_fallback "$junit" smart-signer node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    packages/smart-signer/lib/oauth/return-url.test.ts \
    packages/smart-signer/lib/oauth/config.test.ts \
    packages/smart-signer/lib/oauth/handlers.test.ts \
    packages/smart-signer/lib/google-drive-urls.test.ts \
    packages/smart-signer/lib/condenser-migration.test.ts \
    packages/smart-signer/lib/validators/key-role.test.ts \
    packages/smart-signer/lib/memo-crypto.test.ts \
    packages/smart-signer/lib/signer/keychain-memo-crypto.test.ts \
    packages/smart-signer/lib/signer/binary-challenge.test.ts \
    packages/smart-signer/lib/storage-mixin.test.ts \
    packages/smart-signer/lib/signer/credential-storage.test.ts \
    packages/smart-signer/lib/signer/safe-storage-registration.test.ts \
    packages/smart-signer/lib/auth/accounts.test.ts \
    packages/smart-signer/lib/auth/chat-session.test.ts \
    packages/smart-signer/lib/auth/matrix-devices.test.ts \
    packages/smart-signer/lib/api-handlers/auth/logout.test.ts \
    packages/smart-signer/lib/auth/auth-storage-desync.test.ts \
    packages/smart-signer/lib/auth/login-authority.test.ts \
    packages/smart-signer/lib/auth/sign-in-lock.test.ts \
    packages/smart-signer/lib/fetch-json.test.ts \
    packages/smart-signer/lib/signer/unlock-hint.test.ts \
    packages/smart-signer/lib/signer/google-drive-missing-key.test.ts < /dev/null || status=1
echo "== node --test packages/common-hiveio-packages" >&2
junit="$PWD/test-results/unit/common-hiveio-packages.xml"
run_with_junit_fallback "$junit" common-hiveio-packages node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    packages/common-hiveio-packages/src/hb-auth/safe-storage-generation.test.ts \
    packages/common-hiveio-packages/src/hb-auth/hbauth-service.test.ts \
    packages/common-hiveio-packages/src/hb-auth/worker-release.test.ts < /dev/null || status=1
echo "== node --test packages/middleware" >&2
junit="$PWD/test-results/unit/middleware.xml"
run_with_junit_fallback "$junit" middleware node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    packages/middleware/lib/matcher.test.ts packages/middleware/lib/csp.test.ts < /dev/null || status=1
echo "== node --test apps/blog" >&2
junit="$PWD/test-results/unit/blog.xml"
run_with_junit_fallback "$junit" blog node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    apps/blog/lib/canonical-url.test.ts \
    apps/blog/lib/in-app-redirect-url.test.ts \
    apps/blog/lib/post-summary.test.ts \
    apps/blog/lib/chat-eligibility.test.ts \
    apps/blog/components/hooks/use-chat-token-request.test.ts \
    apps/blog/features/layouts/user-profile/lib/social-links.test.ts \
    apps/blog/features/activity-log/lib/merge-notifications.test.ts \
    apps/blog/features/post-editor/lib/scroll-sync-anchors.test.ts \
    apps/blog/features/post-editor/lib/image-markdown.test.ts \
    apps/blog/features/votes/hooks/logged-user-contexts.test.ts \
    apps/blog/features/post-rendering/lib/votes-before-payout.test.ts \
    apps/blog/features/post-rendering/lib/votes-after-payout.test.ts \
    apps/blog/features/post-rendering/lib/paginate-threads.test.ts < /dev/null || status=1
echo "== node --test apps/wallet" >&2
junit="$PWD/test-results/unit/wallet.xml"
run_with_junit_fallback "$junit" wallet node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=junit --test-reporter-destination="$junit" \
    apps/wallet/lib/history-filter.test.ts \
    apps/wallet/feature/delegations/lib/incoming-delegations.test.ts \
    apps/wallet/feature/transfers-page/lib/rc-amount.test.ts \
    apps/wallet/playwright/tests/support/walletOperations.test.ts \
    apps/wallet/lib/encrypted-memo.test.ts \
    apps/wallet/lib/min-delegation.test.ts \
    apps/wallet/lib/scam-transfer-filter.test.ts \
    apps/wallet/lib/market-order-form.test.ts \
    apps/wallet/lib/financial-report.test.ts \
    apps/wallet/lib/dhf-funding.test.ts \
    apps/wallet/lib/proposals-list.test.ts \
    apps/wallet/playwright/tests/support/contrast.test.ts < /dev/null || status=1
exit "$status"
