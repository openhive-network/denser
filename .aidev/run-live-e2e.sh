#!/usr/bin/env bash
# The advisory `live_e2e` suite of the full slot (#967): runs the live-API e2e
# specs a candidate's change reaches, against the test stack's `blog-live` (this
# tree's production build talking to api.hive.blog).
#
# ADVISORY: it always exits 0. The live specs judge mainnet data as much as the
# change, so their verdict must not gate; their per-test results are recorded
# from test-results/live-e2e/junit.xml and the log shows them.
#
# The changed files, first source that exists:
#   1. $AIDEV_CHANGED_FILES_FILE (one path per line, a deletion as D<TAB>path),
#      which AIDEV's gates publish with $AIDEV_BASE_REF (ai/aidev#14456), and
#   2. `git diff --name-only <base>...HEAD` when git works in the workspace (AIDEV's
#      runtime containers mount the worktree's git metadata read-only,
#      ai/aidev#14661), <base> = $AIDEV_BASE_REF, else $DENSER_LIVE_E2E_BASE,
#      else the first of origin/aidev/integration, aidev/integration,
#      origin/develop.
# With neither, the suite reports "not applicable: no change information".
# The selected specs, the union of:
#   - the e2e specs (apps/*/playwright/tests/e2e) changed, or importing a changed
#     file directly or through other modules: a page object, a helper,
#     playwright/support (.aidev/live-e2e-importers.mjs);
#   - SMOKE_SPECS of each app whose source changed (apps/<app>/** outside
#     playwright/; packages/** counts for every app).
# They run --retries=0 on chromium, --repeat-each=3, or SMOKE_REPEAT_EACH when
# only the smoke set is selected. None selected is a skipped "not applicable"
# testcase naming why.
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

# The live specs every app-source change runs, per app: the ones driving the main
# page objects (the feed's post cards, the post page), so a markup change that
# breaks their locators is caught even when no test file changed. Kept small and
# to specs stable against mainnet data. Nothing but this set selected runs it
# $SMOKE_REPEAT_EACH time(s): it checks locators, not flakiness, and the blog's at
# --repeat-each=3 took 2.7 min (210 tests) on almost every candidate. The wallet
# has none: the stack serves only the blog.
declare -A SMOKE_SPECS=(
    [blog]="apps/blog/playwright/tests/e2e/mainTimeline.spec.ts apps/blog/playwright/tests/e2e/postPage.spec.ts"
)
SMOKE_REPEAT_EACH=1
CHANGED_REPEAT_EACH=3

# The smoke specs an app-source change selects: apps/<app>/** outside playwright/
# selects that app's set, packages/** every app's.
smoke_specs() { # < changed paths
    local f app
    declare -A apps=()
    while read -r f; do
        case "$f" in
            packages/*) for app in "${!SMOKE_SPECS[@]}"; do apps[$app]=1; done ;;
            apps/*/playwright/*) ;;
            apps/*/*) app=${f#apps/}; apps[${app%%/*}]=1 ;;
        esac
    done
    for app in "${!apps[@]}"; do
        [ -n "${SMOKE_SPECS[$app]:-}" ] && printf '%s\n' ${SMOKE_SPECS[$app]}
    done
    return 0
}

if [ "$#" -gt 0 ]; then
    specs=("$@")
    repeat_each=$CHANGED_REPEAT_EACH
else
    if [ -n "${AIDEV_CHANGED_FILES_FILE:-}" ] && [ -r "$AIDEV_CHANGED_FILES_FILE" ]; then
        source_desc="AIDEV_CHANGED_FILES_FILE"
        mapfile -t changed < <(sed 's/^D\t//' "$AIDEV_CHANGED_FILES_FILE")
    else
        git rev-parse --git-dir > /dev/null 2>&1 \
            || not_applicable "no change information available (no AIDEV_CHANGED_FILES_FILE, no git metadata in the workspace)"
        base="${AIDEV_BASE_REF:-${DENSER_LIVE_E2E_BASE:-}}"
        if [ -z "$base" ]; then
            for ref in origin/aidev/integration aidev/integration origin/develop; do
                git rev-parse --verify -q "$ref^{commit}" > /dev/null && { base=$ref; break; }
            done
        fi
        [ -n "$base" ] || not_applicable "no change information available (git works but no base ref)"
        source_desc="git diff against $base"
        mapfile -t changed < <(git diff --name-only "$base...HEAD")
    fi
    mapfile -t affected < <(printf '%s\n' "${changed[@]}" | node .aidev/live-e2e-importers.mjs)
    mapfile -t smoke < <(printf '%s\n' "${changed[@]}" | smoke_specs | sort -u)
    [ "${#affected[@]}" -gt 0 ] && echo "live_e2e: e2e specs changed or importing a changed file ($source_desc): ${affected[*]}" >&2
    [ "${#smoke[@]}" -gt 0 ] && echo "live_e2e: smoke specs for the changed app source ($source_desc): ${smoke[*]}" >&2
    mapfile -t specs < <(printf '%s\n' "${affected[@]}" "${smoke[@]}" | grep . | sort -u)
    [ "${#specs[@]}" -gt 0 ] || not_applicable "the candidate changes no e2e spec, nothing one imports and no app source ($source_desc)"
    repeat_each=$CHANGED_REPEAT_EACH
    [ "${#affected[@]}" -gt 0 ] || repeat_each=$SMOKE_REPEAT_EACH
    echo "live_e2e: selected e2e specs, --repeat-each=$repeat_each: ${specs[*]}" >&2
fi

blog_specs=()
for spec in "${specs[@]}"; do
    case "$spec" in
        apps/blog/playwright/tests/e2e/*) blog_specs+=("${spec#apps/blog/}") ;;
        *) echo "live_e2e: $spec: not run, the stack serves only the blog" >&2 ;;
    esac
done
[ "${#blog_specs[@]}" -gt 0 ] || not_applicable "the selected e2e specs are not the blog's (${specs[*]}); the stack serves only the blog"

# ---- the server -------------------------------------------------------------

[ "${DENSER_TEST_STACK:-}" = 1 ] || not_applicable "no test stack (DENSER_TEST_STACK is not 1): live_e2e runs only in AIDEV's full slot"
if ! node -e "fetch('http://blog-live:3000/favicon.ico').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" < /dev/null; then
    [ -f apps/blog/.next/aidev-build-complete ] \
        && report failure "live_e2e stack" "the test stack's blog-live does not answer" \
        || report failure "live_e2e stack" "no blog build to serve (the fixture_e2e build failed or did not run)"
    exit 0
fi

# ---- run ------------------------------------------------------------------------

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

cd apps/blog
status=0
CI=1 DENSER_URL=http://blog-live:3000 PLAYWRIGHT_JUNIT_OUTPUT_NAME="$junit" \
    pnpm exec playwright test --config=playwright.config.ts --project=chromium \
    --repeat-each="$repeat_each" --retries=0 --reporter=list,junit "${blog_specs[@]}" < /dev/null || status=$?
[ -s "$junit" ] || report failure "live_e2e run" "playwright exited $status without a report"
echo "live_e2e: advisory; playwright exited $status" >&2
exit 0
