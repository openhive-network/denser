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

# junit_add_unreported_failure JUNIT SUITE CASE LOG STATUS [ANCHOR]
#   For a run that exited STATUS (non-zero) while JUNIT shows no failing test,
#   e.g. Playwright failing the run from globalTeardown after every test passed.
#   Adds testcase CASE to JUNIT (creating it if missing) and bumps the root
#   tests/failures counts, so a junit reader sees the failure. The failure text
#   is LOG from the line containing ANCHOR up to its stack trace, or LOG's tail
#   when ANCHOR is not given. Does nothing if JUNIT already reports a failure.
junit_add_unreported_failure() {
    JUNIT="$1" SUITE="$2" CASE="$3" LOG="$4" STATUS="$5" ANCHOR="${6:-}" node -e '
const fs = require("fs");
const { JUNIT, SUITE, CASE, LOG, STATUS, ANCHOR } = process.env;
const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" })[c]);
const existing = fs.existsSync(JUNIT) ? fs.readFileSync(JUNIT, "utf8") : "";
if (/<(failure|error)\b/.test(existing)) process.exit(0);

const lines = fs.readFileSync(LOG, "utf8")
  .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
  .split("\n");
const start = ANCHOR ? lines.findIndex((l) => l.includes(ANCHOR)) : -1;
let message = `${SUITE} exited ${STATUS} with no failing test in its report`;
let details = lines.slice(-60);
if (start >= 0) {
  const after = lines.slice(start, start + 200);
  const stack = after.findIndex((l) => /^\s+at\s/.test(l));
  details = stack > 0 ? after.slice(0, stack) : after;
  message = details[0].trim();
}
const testsuite =
  `<testsuite name="${esc(SUITE)}" tests="1" failures="1" errors="0" skipped="0">\n` +
  `<testcase classname="${esc(SUITE)}" name="${esc(CASE)}">` +
  `<failure message="${esc(message)}">${esc(details.join("\n"))}</failure></testcase>\n</testsuite>\n`;

let xml;
if (/<\/testsuites>/.test(existing)) {
  xml = existing
    .replace(/<testsuites\b[^>]*>/, (tag) =>
      tag.replace(/\b(tests|failures)="(\d*)"/g, (_, attr, n) => `${attr}="${(Number(n) || 0) + 1}"`))
    .replace(/<\/testsuites>/, `${testsuite}</testsuites>`);
} else {
  const body = existing.replace(/^<\?xml[^>]*\?>\s*/, "");
  xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites>\n${body}${testsuite}</testsuites>\n`;
}
fs.mkdirSync(require("path").dirname(JUNIT), { recursive: true });
fs.writeFileSync(JUNIT, xml);
console.error(`junit: ${JUNIT}: added failing case "${CASE}" (${SUITE} exited ${STATUS} with no failing test reported)`);
' < /dev/null
}
