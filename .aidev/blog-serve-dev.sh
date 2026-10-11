#!/usr/bin/env bash
# Command of the `blog` service in .aidev/dev-stack.compose.yml: installs
# node_modules (.aidev/pnpm-deps.sh), then runs `pnpm dev` (react-env + next dev
# on :3000), and starts it again in the same container when it ends.
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
# Every start writes a new id to .next/aidev-dev-boot (the blog_next volume);
# blog-ready (.aidev/blog-ready.sh) warms the routes again for each new id.
set -uo pipefail

cd "$(dirname "$0")/.."

# On a restart (the pnpm-lock.yaml reload rule restarts both) fixture-proxy may be
# installing; pnpm-deps.sh waits on its lock, then verifies the tree.
# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh || exit 1
cd apps/blog

readonly BOOT_FILE=.next/aidev-dev-boot
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
    echo "blog-serve-dev: next dev ended with status $status after ${ran}s; OOM kills in this container: ${oom_before:-?} before, $(oom_kills) now" >&2

    if [ "$ran" -lt "$MIN_RUN_S" ]; then quick=$((quick + 1)); else quick=0; fi
    if [ "$quick" -ge "$QUICK_ENDS" ]; then
        echo "blog-serve-dev: next dev ended within ${MIN_RUN_S}s $QUICK_ENDS times in a row; giving up" >&2
        exit 1
    fi
    echo "blog-serve-dev: starting next dev again" >&2
    sleep 2
done
