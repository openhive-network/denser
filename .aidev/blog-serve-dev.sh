#!/usr/bin/env bash
# Command of the `blog` and `wallet` services in .aidev/dev-stack.compose.yml:
# installs node_modules (.aidev/pnpm-deps.sh), then runs the app's `pnpm dev`
# (react-env + next dev, the blog on :3000, the wallet on :4000), and starts it
# again in the same container when it ends.
#
#   bash .aidev/blog-serve-dev.sh [blog|wallet]    (default: blog)
#
# next dev's parent process forks the server and, when that server dies by a
# signal, neither restarts it nor fails: its event loop empties and it exits 0
# (next/dist/cli/next-dev.js, the child's 'exit' handler). The signal is the
# kernel's OOM killer at the service's mem_limit — Turbopack's native memory is
# outside --max-old-space-size, so next's own heap-threshold restart does not
# prevent it. The container used to end with status 0 and the last compile as its
# last log line. Each end is now logged with the cgroup's oom_kill count and
# next dev is started again; QUICK_ENDS runs shorter than MIN_RUN_S in a row end
# the service non-zero rather than looping on a failure a restart cannot fix.
#
# Every start writes a new id to the app's .next/aidev-dev-boot (its `.next`
# volume); its ready service (.aidev/blog-ready.sh) warms the routes again for
# each new id.
#
# With DENSER_DEV_START_ON_REQUEST set (the wallet), next dev starts only once
# something connects to $PORT: until then a placeholder listens there, marked by
# .next/aidev-dev-on-request, and drops that first connection, which the edge
# (.aidev/dev-stack.Caddyfile) retries until next dev answers. Two cold next dev
# compiles at once take the stack past its admission memory; a wallet nobody
# opens costs nothing.
set -uo pipefail

cd "$(dirname "$0")/.."

app="${1:-blog}"
case "$app" in
    blog | wallet) ;;
    *) echo "blog-serve-dev: unknown app '$app' (blog or wallet)" >&2; exit 2 ;;
esac
log="$app-serve-dev"

# On a restart (the pnpm-lock.yaml reload rule restarts both) fixture-proxy may be
# installing; pnpm-deps.sh waits on its lock, then verifies the tree.
# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh || exit 1
cd "apps/$app"

readonly BOOT_FILE=.next/aidev-dev-boot
readonly ON_REQUEST_FILE=.next/aidev-dev-on-request
readonly MIN_RUN_S=120
readonly QUICK_ENDS=3

oom_kills() { awk '$1 == "oom_kill" {print $2}' /sys/fs/cgroup/memory.events 2> /dev/null; }

pid=""
stopping=""
stop() {
    stopping=1
    [ -n "$pid" ] && kill -TERM -- "-$pid" 2> /dev/null
}
trap stop TERM INT

if [ -n "${DENSER_DEV_START_ON_REQUEST:-}" ]; then
    : > "$ON_REQUEST_FILE"
    echo "$log: next dev starts on the first request to :${PORT:?}" >&2
    setsid node -e '
const server = require("net").createServer((socket) => { socket.destroy(); server.close(); });
server.listen(Number(process.argv[1]));
' "$PORT" &
    pid=$!
    wait "$pid"
    if [ -n "$stopping" ]; then
        wait "$pid"
        exit 0
    fi
    rm -f "$ON_REQUEST_FILE"
    echo "$log: first request on :$PORT; starting next dev" >&2
fi

quick=0
while :; do
    echo "$(date +%s)-$RANDOM" > "$BOOT_FILE"
    oom_before="$(oom_kills)"
    started=$SECONDS
    # Its own process group, so what the server leaves behind (Turbopack's loader
    # pool) goes with it and does not hold memory or :3000 across a restart.
    setsid pnpm dev &
    pid=$!
    status=0
    wait "$pid" || status=$?
    if [ -n "$stopping" ]; then
        wait "$pid"
        exit 0
    fi
    kill -KILL -- "-$pid" 2> /dev/null
    ran=$((SECONDS - started))
    echo "$log: next dev ended with status $status after ${ran}s; OOM kills in this container: ${oom_before:-?} before, $(oom_kills) now" >&2

    if [ "$ran" -lt "$MIN_RUN_S" ]; then quick=$((quick + 1)); else quick=0; fi
    if [ "$quick" -ge "$QUICK_ENDS" ]; then
        echo "$log: next dev ended within ${MIN_RUN_S}s $QUICK_ENDS times in a row; giving up" >&2
        exit 1
    fi
    echo "$log: starting next dev again" >&2
    sleep 2
done
