#!/usr/bin/env bash
# The `dev_stack` suite of the full slot (#996): boots the live dev stack
# (.aidev/dev-stack.compose.yml) from the candidate, as no other suite does, and
# checks it serves. #990 (Next 16) passed every other gate while an existing dev
# stack broke on it (#995).
#
# Applicable only when the candidate changes what the dev stack is made of (see
# applies() below); otherwise one skipped "not applicable" case, at no cost. The
# change comes from $AIDEV_CHANGED_FILES_FILE, else from git: the working tree
# against the merge base with $AIDEV_BASE_REF, $DENSER_DEV_STACK_BASE or the first
# of origin/aidev/integration, aidev/integration, origin/develop (that revision
# itself when a shallow history holds no merge base).
#
# Two scenarios, each in its own scratch copy under test-results/dev-stack-work
# and its own compose project (ephemeral ports, `down -v` afterwards):
#   cold     the candidate tree with no node_modules.
#   upgrade  the base revision's tree with node_modules installed from its own
#            lockfile in its own image, switched to the candidate (node_modules
#            kept, as a checkout keeps them) and given the marker the cold run's
#            install wrote — the state #995 hit on 2026-10-01: a Next 16 lockfile
#            over a Next 14 install whose marker claims it is current. The
#            candidate's stack must find that out and reinstall.
# Each boots within sandbox.dev.readiness_timeout, then: /trending, a post and a
# community answer 200 with recorded titles in the server-rendered HTML; a
# browser that opens the post at 127.0.0.1, the host DENSER_DEV_BLOG_URL names,
# hydrates it — its client calls the API, and next dev logs no "Blocked
# cross-origin request" (allowedDevOrigins, #999); postDetail's ANON-POST-01
# passes through .aidev/dev-stack-spec.sh; and each
# memory-limited container uses at most 90% of its mem_limit (recorded as junit
# properties).
#
# Needs a docker daemon that sees the checkout (AIDEV_HOST_CHECKOUT or
# DENSER_DEV_CHECKOUT when its path there differs from $PWD) and git. AIDEV runs
# a container project's suites under `docker run --network none` with no docker
# socket, so there the suite reports a skipped case saying it could not run;
# run it on a docker host:
#
#   .aidev/run-dev-stack.sh
#   DENSER_DEV_STACK_BASE=origin/develop .aidev/run-dev-stack.sh
set -uo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=junit-helpers.sh
source .aidev/junit-helpers.sh

out=test-results/dev-stack-suite
work=test-results/dev-stack-work
rm -rf "$out" "$work"
mkdir -p "$out"
junit="$PWD/$out/junit.xml"
cases="$PWD/$out/cases.tsv"
: > "$cases"

finish() { junit_write_cases "$junit" dev_stack "$cases"; }
record() { # NAME pass|fail|skip SECONDS MESSAGE [LOG]
    printf 'case\t%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "${4//$'\t'/ }" "${5:-}" >> "$cases"
    echo "dev_stack: $1: $2${4:+ — $4}" >&2
}
property() { printf 'property\t%s\t%s\n' "$1" "$2" >> "$cases"; }
not_run() { record "dev_stack not run" skip 0 "$1"; finish; exit 0; }

# ---- applicable? ----------------------------------------------------------------

applies() {
    grep -E -x 'pnpm-lock\.yaml|(.+/)?package\.json|apps/[^/]+/next\.config\.js|packages/middleware/.+|\.aidev/dev-stack.*|\.aidev/runtime/.+|\.aidev/(pnpm-deps\.sh|check-node-modules\.mjs|fixture-proxy-serve\.mjs|blog-ready\.sh|run-dev-stack\.sh)'
}

base=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    ref="${AIDEV_BASE_REF:-${DENSER_DEV_STACK_BASE:-}}"
    if [ -z "$ref" ]; then
        for r in origin/aidev/integration aidev/integration origin/develop; do
            git rev-parse --verify -q "$r^{commit}" > /dev/null && { ref=$r; break; }
        done
    fi
    # A shallow history may hold no merge base; the named revision then is the base.
    [ -n "$ref" ] && base="$(git merge-base "$ref" HEAD 2> /dev/null || git rev-parse --verify -q "$ref^{commit}")"
fi

if [ -n "${AIDEV_CHANGED_FILES_FILE:-}" ] && [ -r "$AIDEV_CHANGED_FILES_FILE" ]; then
    source_desc="AIDEV_CHANGED_FILES_FILE"
    mapfile -t relevant < <(sed 's/^D\t//' "$AIDEV_CHANGED_FILES_FILE" | applies | sort -u)
elif [ -n "$base" ]; then
    source_desc="git diff against $base"
    mapfile -t relevant < <({ git diff --name-only --no-renames "$base"; git ls-files --others --exclude-standard; } | applies | sort -u)
else
    not_run "not applicable: no change information available (no AIDEV_CHANGED_FILES_FILE, no git base)"
fi
[ "${#relevant[@]}" -gt 0 ] || not_run "not applicable: the candidate changes nothing the dev stack is built from ($source_desc)"
echo "dev_stack: applicable ($source_desc): ${relevant[*]}" >&2

docker info > /dev/null 2>&1 && docker compose version > /dev/null 2>&1 \
    || not_run "applicable (${relevant[*]}) but could not run: no docker daemon reachable from this environment; run .aidev/run-dev-stack.sh on a docker host"
[ -n "$base" ] || not_run "applicable (${relevant[*]}) but could not run: no git base revision to build the trees from"

# ---- setup ----------------------------------------------------------------------

image="$(sed -n 's/^x-image: &image //p' .aidev/dev-stack.compose.yml)"
host_root="${AIDEV_HOST_CHECKOUT:-${DENSER_DEV_CHECKOUT:-$PWD}}"
uid="$(id -u)" gid="$(id -g)"
readiness_timeout="$(awk '/^  dev:/{d=1; next} d && /^  [^ ]/{d=0} d && $1 == "readiness_timeout:" {print $2; exit}' .aidev/project.yaml)"
readiness_timeout="${readiness_timeout:-600}"
project_prefix="denser-devstack-suite-$$"
subnet=""
property base "$base"
property readiness_timeout "$readiness_timeout"

projects=()
cleanup() {
    for p in "${projects[@]}"; do
        docker compose -p "$p" down -v --remove-orphans > /dev/null 2>&1 || true
    done
    rm -rf "$work"
}
trap cleanup EXIT
mkdir -p "$work"

copy_candidate() { # DIR — the working tree as it is, tracked and untracked, without ignored files
    git ls-files -z --cached --others --exclude-standard \
        | tar --null --ignore-failed-read -T - -cf - 2> /dev/null | tar -xf - -C "$1"
}

in_image() { # IMAGE DIR CMD... — CMD in IMAGE over DIR as /work, offline
    local img="$1" dir="$2"
    shift 2
    docker run --rm --network none --user "$uid:$gid" -v "$host_root/$dir:/work" -w /work "$img" "$@"
}

# The checkout as the daemon sees it must be this one, or every mount is empty.
mkdir -p "$work/probe" && touch "$work/probe/seen"
in_image "$image" "$work/probe" test -f seen \
    || not_run "applicable but could not run: the docker daemon does not see this checkout at $host_root (set AIDEV_HOST_CHECKOUT)"

# ---- one scenario's stack -------------------------------------------------------

compose() { # DIR PROJECT ARGS...
    local dir="$1" project="$2"
    shift 2
    AIDEV_HOST_CHECKOUT="$host_root/$dir" AIDEV_PORT_BLOG=0 AIDEV_PORT_FIXTURE=0 \
        AIDEV_UID="$uid" AIDEV_GID="$gid" AIDEV_STACK_SUBNET="$subnet" \
        DENSER_DEV_FIXTURE_SET=ssrChecks DENSER_DEV_API_ENDPOINT= \
        docker compose -f "$dir/.aidev/dev-stack.compose.yml" -p "$project" "$@"
}

# Ready within the declared timeout; a subnet another network holds is retried.
boot() { # DIR PROJECT LOG
    local attempt
    for attempt in 1 2 3; do
        subnet="172.29.$((128 + RANDOM % 126)).0/24"
        compose "$1" "$2" up -d --wait --wait-timeout "$readiness_timeout" >> "$3" 2>&1 && return 0
        grep -q -i 'overlap' "$3" || return 1
        compose "$1" "$2" down -v --remove-orphans >> "$3" 2>&1
    done
    return 1
}

# Server-rendered HTML through the stack's own network, as the probes need no
# published port. The community page renders its posts only in the browser, so
# its probe is the recorded community's title.
probe_pages() { # PROXY_CONTAINER
    docker run --rm --network "container:$1" --user "$uid:$gid" "$image" node -e '
const probes = [
  ["/trending", "The Critical Role of Digital Preservation in Gaming History"],
  ["/test/@guest4test1/test-ako-post", "Test ako post"],
  ["/trending/hive-160391", "Blockchain Wizardry"],
];
(async () => {
  let failed = 0;
  for (const [path, text] of probes) {
    let line;
    try {
      const r = await fetch("http://127.0.0.1:3000" + path, { signal: AbortSignal.timeout(280000) });
      const html = await r.text();
      const ok = r.status === 200 && html.includes(text);
      line = `${path}: ${r.status}, ${html.includes(text) ? "has" : "lacks"} "${text}"`;
      if (!ok) failed++;
    } catch (e) {
      line = `${path}: ${e}`;
      failed++;
    }
    console.log(line);
  }
  process.exit(failed ? 1 : 0);
})();
'
}

# The post in a browser at http://127.0.0.1, not the localhost the specs use:
# next dev serves its dev resources only to localhost and allowedDevOrigins, and
# a page whose /_next/hmr is refused never makes its client-side API calls.
probe_browser() { # PROXY_CONTAINER DIR
    docker run --rm --network "container:$1" --user "$uid:$gid" -v "$host_root/$2:/work" -w /work/apps/blog "$image" node -e '
const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const api = [];
    page.on("request", (r) => { if (new URL(r.url()).port === "8200") api.push(r.url()); });
    const r = await page.goto("http://127.0.0.1:3000/test/@guest4test1/test-ako-post", { timeout: 280000 });
    if (!api.length) await page.waitForEvent("request", { predicate: (q) => new URL(q.url()).port === "8200", timeout: 60000 }).catch(() => {});
    console.log(`status ${r.status()}, ${api.length} client API request(s)`);
    process.exitCode = r.status() === 200 && api.length > 0 ? 0 : 1;
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log(String(e)); process.exit(1); });
'
}

# Usage as `docker stats` counts it (memory.current less inactive file cache),
# for every container of the project with a memory limit; fails past 90% of it.
check_memory() { # SCENARIO DIR PROJECT LOG
    local scenario="$1" dir="$2" project="$3" log="$4" service cid usage limit over=0 measured=0
    for service in $(compose "$dir" "$project" ps --services 2> /dev/null); do
        cid="$(compose "$dir" "$project" ps -q "$service" 2> /dev/null | head -1)"
        [ -n "$cid" ] || continue
        read -r usage limit < <(docker exec "$cid" sh -c '
            [ -r /sys/fs/cgroup/memory.max ] || exit 1
            current=$(cat /sys/fs/cgroup/memory.current)
            inactive=$(awk "\$1 == \"inactive_file\" {print \$2}" /sys/fs/cgroup/memory.stat)
            echo "$((current - ${inactive:-0})) $(cat /sys/fs/cgroup/memory.max)"' 2>> "$log") || continue
        [ "$limit" = max ] && continue
        measured=1
        property "memory.$scenario.$service.bytes" "$usage"
        property "memory.$scenario.$service.limit_bytes" "$limit"
        echo "$service: $((usage / 1048576)) MiB of $((limit / 1048576)) MiB" >> "$log"
        [ $((usage * 10)) -le $((limit * 9)) ] || { over=1; echo "$service: over 90% of mem_limit" >> "$log"; }
    done
    [ "$measured" = 1 ] || { echo "no memory-limited container could be measured (cgroup v2 needed)" >> "$log"; return 2; }
    return "$over"
}

run_stack() { # SCENARIO DIR
    local scenario="$1" dir="$2" project="$project_prefix-$1" log t proxy status
    projects+=("$project")
    log="$PWD/$out/$scenario.log"

    t=$SECONDS
    if ! boot "$dir" "$project" "$log"; then
        compose "$dir" "$project" logs --no-color --tail 200 > "$out/$scenario-compose.log" 2>&1
        record "$scenario: ready" fail $((SECONDS - t)) "the dev stack was not ready within ${readiness_timeout}s (compose log in $out/$scenario-compose.log)" "$out/$scenario-compose.log"
        for step in pages browser ANON-POST-01 memory; do record "$scenario: $step" skip 0 "not run: the stack is not ready"; done
        compose "$dir" "$project" down -v --remove-orphans >> "$log" 2>&1
        return 1
    fi
    record "$scenario: ready" pass $((SECONDS - t)) ""
    property "ready_seconds.$scenario" $((SECONDS - t))
    proxy="$(compose "$dir" "$project" ps -q fixture-proxy | head -1)"

    t=$SECONDS
    if probe_pages "$proxy" > "$out/$scenario-pages.log" 2>&1; then
        record "$scenario: pages" pass $((SECONDS - t)) ""
    else
        record "$scenario: pages" fail $((SECONDS - t)) "$(grep -v -E ': 200, has' "$out/$scenario-pages.log" | head -1)" "$out/$scenario-pages.log"
    fi

    t=$SECONDS
    probe_browser "$proxy" "$dir" > "$out/$scenario-browser.log" 2>&1
    status=$?
    compose "$dir" "$project" logs --no-color blog 2>&1 | grep 'Blocked cross-origin request' >> "$out/$scenario-browser.log" && status=1
    if [ "$status" = 0 ]; then
        record "$scenario: browser" pass $((SECONDS - t)) ""
    else
        record "$scenario: browser" fail $((SECONDS - t)) "a browser at 127.0.0.1 got no client API calls or a blocked dev resource: $(tail -1 "$out/$scenario-browser.log")" "$out/$scenario-browser.log"
    fi

    # Judged by the test's own result, not playwright's exit status: the fixture
    # MISS baseline (globalTeardown) is fixture_e2e's contract for the production
    # build, and next dev's sidebar requests land in it or not by timing.
    t=$SECONDS
    DENSER_DEV_STACK_PROJECT="$project" DENSER_DEV_CHECKOUT="$host_root/$dir" \
        "$dir/.aidev/dev-stack-spec.sh" playwright/tests/fixture/postDetail.spec.ts -g ANON-POST-01 --retries=0 \
        < /dev/null > "$out/$scenario-spec.log" 2>&1
    if sed 's/\x1b\[[0-9;]*m//g' "$out/$scenario-spec.log" | grep -q -E '^ +1 passed' \
        && ! sed 's/\x1b\[[0-9;]*m//g' "$out/$scenario-spec.log" | grep -q -E '^ +[0-9]+ (failed|flaky)'; then
        record "$scenario: ANON-POST-01" pass $((SECONDS - t)) ""
    else
        record "$scenario: ANON-POST-01" fail $((SECONDS - t)) "postDetail.spec.ts -g ANON-POST-01 failed against the dev stack" "$out/$scenario-spec.log"
    fi

    t=$SECONDS
    status=0
    check_memory "$scenario" "$dir" "$project" "$log" || status=$?
    case "$status" in
        0) record "$scenario: memory" pass $((SECONDS - t)) "" ;;
        2) record "$scenario: memory" skip $((SECONDS - t)) "container memory could not be read" ;;
        *) record "$scenario: memory" fail $((SECONDS - t)) "a container uses more than 90% of its mem_limit" "$log" ;;
    esac

    compose "$dir" "$project" logs --no-color --tail 200 > "$out/$scenario-compose.log" 2>&1
    compose "$dir" "$project" down -v --remove-orphans >> "$log" 2>&1
}

# ---- the base install (in the background while the cold stack boots) -----------

cold="$work/cold" upgrade="$work/upgrade"
mkdir -p "$cold" "$upgrade"
copy_candidate "$cold"

install_base() {
    local base_image
    git archive "$base" | tar -xf - -C "$upgrade" || return 1
    base_image="$(sed -n 's/^x-image: &image //p' "$upgrade/.aidev/dev-stack.compose.yml" 2> /dev/null)"
    [ -n "$base_image" ] || { echo "the base revision has no .aidev/dev-stack.compose.yml"; return 1; }
    echo "base $base: installing its lockfile in $base_image"
    in_image "$base_image" "$upgrade" bash -c 'source .aidev/pnpm-deps.sh'
}
install_base > "$out/upgrade-base-install.log" 2>&1 &
base_pid=$!

run_stack cold "$cold"

# ---- upgrade: switch the base install to the candidate --------------------------

t=$SECONDS
if ! wait "$base_pid"; then
    record "upgrade: base install" fail $((SECONDS - t)) "node_modules could not be installed from the base revision's lockfile" "$out/upgrade-base-install.log"
    finish
    exit 1
fi
record "upgrade: base install" pass $((SECONDS - t)) ""

t=$SECONDS

# As a checkout switch: every file is the candidate's, the ignored node_modules stay.
find "$upgrade" -name node_modules -prune -o ! -type d -print0 | xargs -0 rm -f
copy_candidate "$upgrade"
if [ -f "$cold/node_modules/.aidev-pnpm-lock-sha256" ]; then
    cp "$cold/node_modules/.aidev-pnpm-lock-sha256" "$upgrade/node_modules/"
else
    echo "dev_stack: the cold install wrote no marker; the upgrade starts from the base's own" >&2
fi
property "switch_seconds" $((SECONDS - t))

run_stack upgrade "$upgrade"

finish
awk -F'\t' '$1 == "case" && $3 == "fail" {found = 1} END {exit !found}' "$cases" && exit 1
exit 0
