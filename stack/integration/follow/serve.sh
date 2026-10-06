#!/usr/bin/env bash
# Follow mode's server: serve /releases/<app>/current, the release follow.sh last
# swapped in, and move onto the next one when follow.sh repoints `current`.
#
#   serve.sh APP
#
# The server starts the way the production image starts it (react-env writing
# public/__ENV.js from this container's REACT_APP_* environment, then the standalone
# server.js), from the release directory rather than from the checkout, so a build
# in the checkout never touches what is being served. A server that exits ends this
# script, and the container's restart policy starts the current release again.
# /releases/<app>/serving.json names the release being served.
set -euo pipefail

app=${1:?usage: serve.sh APP}
dir=${FOLLOW_RELEASES:-/releases}/$app
react_env=${FOLLOW_SOURCE_DIR:-/src}/apps/$app/node_modules/.bin/react-env

until [ -e "$dir/current/release.json" ]; do
    [ -n "${waiting:-}" ] || { echo "serve: $app: waiting for the first release (follow.sh builds it)"; waiting=1; }
    sleep 5
done

pid=""
stop() { [ -z "$pid" ] || { kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; }; }
trap 'stop; exit 0' TERM INT

while true; do
    release=$(readlink "$dir/current")
    echo "serve: $app: starting $release"
    (cd "$dir/$release/apps/$app" && exec setsid "$react_env" -- node server.js) &
    pid=$!
    printf '{"release":"%s","since":"%s"}\n' "$release" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$dir/serving.json.tmp"
    mv -f "$dir/serving.json.tmp" "$dir/serving.json"
    while sleep 3; do
        if ! kill -0 "$pid" 2>/dev/null; then
            wait "$pid" && rc=0 || rc=$?
            echo "serve: $app: $release exited $rc" >&2
            exit 1
        fi
        [ "$(readlink "$dir/current")" = "$release" ] || break
    done
    echo "serve: $app: $release replaced by $(readlink "$dir/current")"
    stop
done
