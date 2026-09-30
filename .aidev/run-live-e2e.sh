#!/usr/bin/env bash
# The advisory `live_e2e` suite of the full slot (#967): runs only the live-API
# e2e specs the candidate changed, against the test stack's `blog-live` (this
# tree's production build talking to api.hive.blog), so an edit to
# apps/blog/playwright/tests/e2e is executed by AIDEV at all.
#
# ADVISORY: it always exits 0. The live specs judge mainnet data as much as the
# change, so their verdict must not gate; their per-test results are recorded
# from test-results/live-e2e/junit.xml and the log shows them.
#
# Selection: `git diff --name-only --diff-filter=d <base>...HEAD` over
# apps/*/playwright/tests/e2e, where <base> is $DENSER_LIVE_E2E_BASE, else the
# first of origin/aidev/integration, aidev/integration, origin/develop that
# exists. Each selected spec runs --repeat-each=3 --retries=0 on chromium.
# Nothing selected — or no git metadata to select with — is reported as a
# skipped "not applicable" testcase naming why.
#
#   .aidev/run-live-e2e.sh                          # select from the diff
#   .aidev/run-live-e2e.sh apps/blog/playwright/tests/e2e/faqPage.spec.ts   # these specs
set -uo pipefail

cd "$(dirname "$0")/.."

out=test-results/live-e2e
rm -rf "$out"
mkdir -p "$out"
junit="$PWD/$out/junit.xml"

# One-case junit for an outcome that is not a Playwright run.
report() { # STATUS(skipped|failure) NAME MESSAGE
    JUNIT="$junit" KIND="$1" NAME="$2" MESSAGE="$3" node -e '
const fs = require("fs");
const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" })[c]);
const { JUNIT, KIND, NAME, MESSAGE } = process.env;
const body = KIND === "skipped" ? `<skipped message="${esc(MESSAGE)}"/>` : `<failure message="${esc(MESSAGE)}"/>`;
fs.writeFileSync(JUNIT, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="live_e2e" tests="1" failures="${KIND === "failure" ? 1 : 0}" skipped="${KIND === "skipped" ? 1 : 0}">\n<testcase classname="live_e2e" name="${esc(NAME)}">${body}</testcase>\n</testsuite>\n`);
' < /dev/null
    echo "live_e2e: $2: $3" >&2
}

not_applicable() { report skipped "live_e2e not applicable" "$1"; exit 0; }

# ---- which specs --------------------------------------------------------------

if [ "$#" -gt 0 ]; then
    specs=("$@")
else
    git rev-parse --git-dir > /dev/null 2>&1 \
        || not_applicable "no git metadata in the workspace, so the candidate's changed specs cannot be determined"
    base="${DENSER_LIVE_E2E_BASE:-}"
    if [ -z "$base" ]; then
        for ref in origin/aidev/integration aidev/integration origin/develop; do
            git rev-parse --verify -q "$ref^{commit}" > /dev/null && { base=$ref; break; }
        done
    fi
    [ -n "$base" ] || not_applicable "no base ref (origin/aidev/integration, origin/develop) to diff against"
    mapfile -t specs < <(git diff --name-only --diff-filter=d "$base...HEAD" -- \
        'apps/*/playwright/tests/e2e/*.spec.ts' 'apps/*/playwright/tests/e2e/**/*.spec.ts' | sort -u)
    [ "${#specs[@]}" -gt 0 ] || not_applicable "the candidate changes no e2e spec (diff against $base)"
    echo "live_e2e: specs changed since $base: ${specs[*]}" >&2
fi

blog_specs=()
for spec in "${specs[@]}"; do
    case "$spec" in
        apps/blog/playwright/tests/e2e/*) blog_specs+=("${spec#apps/blog/}") ;;
        *) echo "live_e2e: $spec: not run, the stack serves only the blog" >&2 ;;
    esac
done
[ "${#blog_specs[@]}" -gt 0 ] || not_applicable "the changed e2e specs are not the blog's (${specs[*]}); the stack serves only the blog"

# ---- the server -------------------------------------------------------------

[ "${DENSER_TEST_STACK:-}" = 1 ] || not_applicable "no test stack (DENSER_TEST_STACK is not 1): live_e2e runs only in AIDEV's full slot"
if ! node -e "fetch('http://blog-live:3000/favicon.ico').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" < /dev/null; then
    [ -f apps/blog/.next/aidev-build-complete ] \
        && report failure "live_e2e stack" "the test stack's blog-live does not answer" \
        || report failure "live_e2e stack" "no blog build to serve (the blog_build suite failed)"
    exit 0
fi

# ---- run ------------------------------------------------------------------------

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

cd apps/blog
status=0
CI=1 DENSER_URL=http://blog-live:3000 PLAYWRIGHT_JUNIT_OUTPUT_NAME="$junit" \
    pnpm exec playwright test --config=playwright.config.ts --project=chromium \
    --repeat-each=3 --retries=0 --reporter=list,junit "${blog_specs[@]}" < /dev/null || status=$?
[ -s "$junit" ] || report failure "live_e2e run" "playwright exited $status without a report"
echo "live_e2e: advisory; playwright exited $status" >&2
exit 0
