#!/usr/bin/env bash
# The advisory `live_e2e` suite of the full slot (#967): runs the live-API e2e
# specs a candidate's change reaches, each app's against its test stack server:
# `blog-live` and `wallet-live`, this tree's production builds talking to
# api.hive.blog (.aidev/test-stack.compose.yml).
#
# ADVISORY: project.yaml declares it `mode: advisory`, which is what keeps its
# result (an environment failure included) out of the verdict; the script also
# exits 0. The live specs judge mainnet data as much as the
# change, so their verdict must not gate; their per-test results are recorded
# from test-results/live-e2e/junit.xml and the log shows them. The blog's cases
# keep Playwright's names; every other app's are prefixed "<app> › ".
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
# testcase naming why. An app whose server does not answer is a failure testcase.
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
report_to() { # FILE STATUS(skipped|failure) NAME MESSAGE
    JUNIT="$1" KIND="$2" NAME="$3" MESSAGE="$4" node -e '
const fs = require("fs");
const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" })[c]);
const { JUNIT, KIND, NAME, MESSAGE } = process.env;
const body = KIND === "skipped" ? `<skipped message="${esc(MESSAGE)}"/>` : `<failure message="${esc(MESSAGE)}"/>`;
fs.writeFileSync(JUNIT, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="live_e2e" tests="1" failures="${KIND === "failure" ? 1 : 0}" skipped="${KIND === "skipped" ? 1 : 0}">\n<testcase classname="live_e2e" name="${esc(NAME)}">${body}</testcase>\n</testsuite>\n`);
' < /dev/null
    echo "live_e2e: $3: $4" >&2
}
report() { report_to "$junit" "$@"; }

not_applicable() { report skipped "live_e2e not applicable" "$1"; exit 0; }

# ---- which specs --------------------------------------------------------------

# The live specs every app-source change runs, per app: the ones driving the main
# page objects (the feed's post cards, the post page), so a markup change that
# breaks their locators is caught even when no test file changed. Kept small and
# to specs stable against mainnet data. Nothing but this set selected runs it
# $SMOKE_REPEAT_EACH time(s): it checks locators, not flakiness, and the blog's at
# --repeat-each=3 took 2.7 min (210 tests) on almost every candidate.
declare -A SMOKE_SPECS=(
    [blog]="apps/blog/playwright/tests/e2e/mainTimeline.spec.ts apps/blog/playwright/tests/e2e/postPage.spec.ts"
    [wallet]="apps/wallet/playwright/tests/e2e/wallet.spec.ts"
)
# Each app's test stack server: its DENSER_URL, and the path that answers once it
# serves. The wallet's alias has no hyphen (see wallet-live in the compose file).
declare -A LIVE_URL=([blog]=http://blog-live:3000 [wallet]=http://walletlive:4000)
declare -A LIVE_SERVICE=([blog]=blog-live [wallet]=wallet-live)
declare -A PROBE_PATH=([blog]=/favicon.ico [wallet]=/api/health)
# The order the apps run in: the blog's report is junit.xml itself, as before.
LIVE_APPS=(blog wallet)
# The suite whose build each app's server serves.
declare -A BUILD_SUITE=([blog]=fixture_e2e [wallet]=wallet_fixture)
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

declare -A app_specs=()
for spec in "${specs[@]}"; do
    app=
    case "$spec" in
        apps/*/playwright/tests/e2e/*) app=${spec#apps/}; app=${app%%/*} ;;
    esac
    if [ -n "$app" ] && [ -n "${LIVE_URL[$app]:-}" ]; then
        app_specs[$app]+="${spec#apps/"$app"/} "
    else
        echo "live_e2e: $spec: not run, the stack serves no app for it (${LIVE_APPS[*]})" >&2
    fi
done
[ "${#app_specs[@]}" -gt 0 ] || not_applicable "the selected e2e specs are none of ${LIVE_APPS[*]}'s (${specs[*]}); the stack serves only those"

[ "${DENSER_TEST_STACK:-}" = 1 ] || not_applicable "no test stack (DENSER_TEST_STACK is not 1): live_e2e runs only in AIDEV's full slot"

# ---- run ------------------------------------------------------------------------

# shellcheck source=junit-helpers.sh
source .aidev/junit-helpers.sh
# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

# APP's selected specs against its stack server, reported to JUNIT_FILE: the
# Playwright run's junit, or one failure case when the server does not answer.
run_app() { # APP JUNIT_FILE
    local app=$1 file=$2 url=${LIVE_URL[$1]} service=${LIVE_SERVICE[$1]} status=0
    local -a app_spec_list
    read -r -a app_spec_list <<< "${app_specs[$app]}"
    if ! node -e "fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" "$url${PROBE_PATH[$app]}" < /dev/null; then
        if [ -f "apps/$app/.next/aidev-build-complete" ]; then
            report_to "$file" failure "live_e2e stack" "the test stack's $service does not answer"
        else
            report_to "$file" failure "live_e2e stack" "no $app build to serve (the ${BUILD_SUITE[$app]} build failed or did not run)"
        fi
        return 0
    fi
    (
        cd "apps/$app"
        CI=1 DENSER_URL=$url PLAYWRIGHT_JUNIT_OUTPUT_NAME="$file" \
            pnpm exec playwright test --config=playwright.config.ts --project=chromium \
            --repeat-each="$repeat_each" --retries=0 --reporter=list,junit "${app_spec_list[@]}" < /dev/null
    ) || status=$?
    [ -s "$file" ] || report_to "$file" failure "live_e2e run" "playwright exited $status without a report"
    echo "live_e2e: $app: advisory; playwright exited $status" >&2
}

for app in "${LIVE_APPS[@]}"; do
    [ -n "${app_specs[$app]:-}" ] || continue
    if [ "$app" = blog ]; then
        run_app "$app" "$junit"
    else
        run_app "$app" "$PWD/$out/$app.xml"
        junit_merge_prefixed "$junit" "$PWD/$out/$app.xml" "$app"
    fi
done
exit 0
