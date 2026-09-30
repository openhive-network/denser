# Sourced, not executed, by the .aidev/run-*.sh scripts that write junit.
#
# run_with_junit_fallback JUNIT SUITE CMD...
#   Runs CMD, showing its output as usual. If CMD fails without leaving a
#   non-empty JUNIT behind (mocha crashed while loading the suite, e.g. a
#   TS2307 on an import, so its reporter never ran), writes a one-case junit
#   in its place: testcase "<SUITE> failed to load" with the tail of the output
#   as the failure. AIDEV then records why the suite failed instead of a failed
#   verdict with no per-test evidence. Returns CMD's exit status.
run_with_junit_fallback() {
    local junit="$1" suite="$2"
    shift 2
    local log status=0
    log="$(mktemp)"
    "$@" 2>&1 | tee "$log" || status=${PIPESTATUS[0]}
    if [ "$status" -ne 0 ] && [ ! -s "$junit" ]; then
        mkdir -p "$(dirname "$junit")"
        JUNIT="$junit" SUITE="$suite" LOG="$log" STATUS="$status" node -e '
const fs = require("fs");
const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" })[c]);
const tail = fs.readFileSync(process.env.LOG, "utf8").split("\n").slice(-60).join("\n");
const suite = esc(process.env.SUITE);
const message = esc(`${process.env.SUITE} exited ${process.env.STATUS} without writing a test report`);
fs.writeFileSync(process.env.JUNIT,
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<testsuite name="${suite}" tests="1" failures="1" errors="0" skipped="0">\n` +
  `<testcase classname="${suite}" name="${suite} failed to load">` +
  `<failure message="${message}">${esc(tail)}</failure></testcase>\n</testsuite>\n`);
' < /dev/null
        echo "junit: ${junit} written as a load failure (${suite} exited ${status} without a report)" >&2
    fi
    rm -f "$log"
    return "$status"
}
