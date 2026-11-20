# The i18n checks of the fixture suites (#1696), sourced by .aidev/run-fixture-e2e.sh and
# .aidev/run-wallet-fixture-e2e.sh: two Playwright projects of each app's
# playwright.fixture.config.ts that exist only with DENSER_I18N_CHECKS=1.
#
#   i18n-layout  key routes and dialogs in the pseudo-locale and in Polish, at 1280x900, 844x390
#                and 390x844, in DejaVu Sans: no text bypassing the translations, none cut off,
#                no sideways page scroll (playwright/support/i18n-layout.ts, i18nLayout*.spec.ts)
#   pl-locale    existing specs that hold in any language, run again with NEXT_LOCALE=pl
#
# Advisory: a run without arguments runs them after the suite's own pass, and their result never
# changes the suite's exit status or its junit.xml. They report in the log and in
# <results>/i18n/playwright.json. Make them blocking once they have had a week of clean runs: run
# them inside the suite's pass (drop the env gate and the separate pass) and list their cases in
# junit.xml.
#
# A run whose arguments name one of the projects (`--project=i18n-layout`), or an
# i18nLayout*.spec.ts file that only those projects run (the gate's repeat of new tests names
# files, not projects), runs just what it names, as any narrowed run, and is judged by it.

I18N_PROJECTS=(i18n-layout pl-locale)

# i18n_checks_named ARGS... — whether ARGS name an i18n project or an i18n-layout spec file.
i18n_checks_named() {
    local arg project
    for arg in "$@"; do
        case "${arg##*/}" in
            i18nLayout*.spec.ts) return 0 ;;
        esac
        for project in "${I18N_PROJECTS[@]}"; do
            [ "$arg" != "--project=$project" ] || return 0
        done
    done
    return 1
}

# run_i18n_checks RESULTS_DIR PLAYWRIGHT_ARGS... — the advisory pass, from the app's directory
# against the build its config serves. Always returns 0.
run_i18n_checks() {
    local results="$1" status=0 log
    shift
    rm -rf "$results"
    mkdir -p "$results"
    log="$results/log.txt"
    echo "== i18n checks (advisory, #1696): ${I18N_PROJECTS[*]}" >&2
    DENSER_I18N_CHECKS=1 PLAYWRIGHT_JSON_OUTPUT_NAME="$results/playwright.json" \
        pnpm exec playwright test --reporter=list,json "${I18N_PROJECTS[@]/#/--project=}" "$@" < /dev/null 2>&1 \
        | tee "$log" || status=${PIPESTATUS[0]}
    if [ "$status" -eq 0 ]; then
        echo "i18n checks (advisory): passed" >&2
    else
        echo "i18n checks (advisory): FAILED (exit $status), which does not fail this suite; see $log" >&2
    fi
    return 0
}
