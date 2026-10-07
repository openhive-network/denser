#!/usr/bin/env bash
# Follow mode's builder: bring each app's served release up to the checkout's tree.
# Runs in the project's environment image (`environment.image` in .aidev/project.yaml)
# with the checkout at /src and the releases at /releases (compose.follow.yml).
#
#   follow.sh once             # one pass; upgrade.sh runs it after each fast-forward
#   follow.sh watch [SECONDS]  # a pass every SECONDS (default 20), for session stacks
#
# Per app in FOLLOW_APPS ("<app>:<base path>" pairs):
#   - The build key is Turbo's hash of the app's build task (the app's sources, the
#     workspace packages it depends on, the lockfile's resolution of its externals,
#     turbo.json, the NEXT_PUBLIC_* environment), plus the image and the root
#     workspace files. A commit that touches nothing the app's build reads leaves its
#     key, and its served release, as they are.
#   - A new key: `next build` in the checkout (.next/cache stays there between
#     builds), the standalone output copied into /releases/<app>/<release>, started
#     once on a scratch port, and only then `current` repointed at it. serve.sh, which
#     serves `current`, restarts onto it; the old release serves until then.
#   - A failed install, build or start leaves `current` where it was and records
#     ROLLED-BACK (FAILED when there is no earlier release) with the log in state.json.
#     `once` builds that key again on its next run; `watch` waits for the tree to move.
#
# Exit (once): 0 every app serves the tree's key; 1 an app could not be brought to it.
set -euo pipefail

FOLLOW_FORMAT=follow-1
apps=${FOLLOW_APPS:-blog:/blog wallet:/wallet}
releases=${FOLLOW_RELEASES:-/releases}
status_dir=${FOLLOW_STATUS:-/status}
src=${FOLLOW_SOURCE_DIR:-/src}
# Smoke starts bind 127.0.0.1 inside this container, never a served port.
smoke_port=3990
smoke_timeout=120
# How long releases/<app>/static keeps a file no newer release published.
static_keep_days=${FOLLOW_STATIC_KEEP_DAYS:-7}

cd "$src"

_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# The checkout's commit, or empty where its git metadata is outside the mount (a
# worktree); the release is then named after its key alone.
_commit() { git rev-parse HEAD 2>/dev/null || true; }

_json_str() { if [ -n "$1" ]; then printf '"%s"' "$1"; else printf null; fi; }

_build_key() {
    local app=$1 base=$2 turbo_hash
    turbo_hash=$(NEXT_PUBLIC_BASE_PATH="$base" node_modules/.bin/turbo run build \
            --filter="@hive/$app" --dry=json --no-daemon 2>/dev/null \
        | node -e '
            let s = "";
            process.stdin.on("data", (d) => (s += d)).on("end", () => {
                const task = JSON.parse(s).tasks.find((t) => t.taskId === process.argv[1]);
                process.stdout.write(task ? task.hash : "");
            });' "@hive/$app#build") || true
    [ -n "$turbo_hash" ] || return 1
    # runtime_id (the image's pnpm store and node) comes from .aidev/pnpm-deps.sh.
    { printf '%s\n' "$FOLLOW_FORMAT" "$turbo_hash" "$runtime_id" "$base"
      sha256sum package.json pnpm-workspace.yaml; } | sha256sum | cut -c1-16
}

_release_key() { node -p 'require(process.argv[1]).key' "$1/release.json" 2>/dev/null || true; }
_state_field() { node -p 'require(process.argv[1])[process.argv[2]] ?? ""' "$1/state.json" "$2" 2>/dev/null || true; }
_failed_key() { node -p '(require(process.argv[1]).failed || {}).key ?? ""' "$1/state.json" 2>/dev/null || true; }

# state.json: what follow mode last decided for the app. `revision` is the newest
# commit the current release is the build of (its key is that commit's key).
_write_state() {
    local dir=$1 status=$2 release=$3 key=$4 revision=$5 failed=${6:-null}
    printf '{"status":"%s","release":%s,"key":%s,"revision":%s,"failed":%s,"updated_at":"%s"}\n' \
        "$status" "$(_json_str "$release")" "$(_json_str "$key")" "$(_json_str "$revision")" \
        "$failed" "$(_now)" > "$dir/state.json.tmp"
    mv -f "$dir/state.json.tmp" "$dir/state.json"
}

_record_failure() {
    local dir=$1 key=$2 revision=$3 stage=$4 log=$5 current current_revision status=ROLLED-BACK
    current=$(readlink "$dir/current" 2>/dev/null || true)
    [ -n "$current" ] || status=FAILED
    current_revision=$(_state_field "$dir" revision)
    _write_state "$dir" "$status" "$current" "$(_release_key "$dir/$current")" "$current_revision" \
        "$(printf '{"key":"%s","revision":%s,"stage":"%s","log":"%s","at":"%s"}' \
            "$key" "$(_json_str "$revision")" "$stage" "${log#"$releases"/}" "$(_now)")"
    echo "follow: $(basename "$dir"): $status — $stage failed for ${revision:-the tree} (key $key); log ${log#"$releases"/}${current:+; serving $current}" >&2
}

# Started the way serve.sh starts it, until the base path answers below 500.
_smoke_start() {
    local release=$1 app=$2 base=$3 pid code="" deadline
    (cd "$release/apps/$app" \
        && PORT=$smoke_port HOSTNAME=127.0.0.1 REACT_APP_APP_NAME=$app REACT_APP_BASE_PATH=$base \
            exec setsid "$src/apps/$app/node_modules/.bin/react-env" -- node server.js) &
    pid=$!
    deadline=$((SECONDS + smoke_timeout))
    while [ $SECONDS -lt $deadline ] && kill -0 "$pid" 2>/dev/null; do
        code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "http://127.0.0.1:$smoke_port$base" || true)
        [ "$code" != 000 ] && [ "$code" -lt 500 ] && break
        code=""
        sleep 2
    done
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    [ -n "$code" ] && echo "smoke: $base answered $code"
}

# The Dockerfile's runner stage, as a directory: standalone output, static assets
# (with their .br/.zst sidecars), public/ and lib/markdowns (read at run time,
# outside the standalone trace).
_package() {
    local app=$1 out=$2
    rm -rf "$out" \
        && cp -a "apps/$app/.next/standalone" "$out" \
        && cp -a "apps/$app/.next/static" "$out/apps/$app/.next/static" \
        && node scripts/precompress-static.mjs "$out/apps/$app/.next/static" \
        && rm -rf "$out/apps/$app/public" \
        && cp -a "apps/$app/public" "$out/apps/$app/public" \
        && if [ -d "apps/$app/lib/markdowns" ]; then
            mkdir -p "$out/apps/$app/lib" && cp -a "apps/$app/lib/markdowns" "$out/apps/$app/lib/markdowns"
        fi
}

# releases/<app>/static: every release's /_next/static files, which caddy serves
# (Caddyfile.static.releases). Filled before the swap, so the new release's pages
# never name a file caddy lacks, and kept after it, so a page of an earlier release
# still loads its lazy chunks. cp without -a stamps each file with the time it was
# last published; _prune drops what no release published for static_keep_days.
_publish_static() {
    local dir=$1 id=$2 app=$3
    mkdir -p "$dir/static" \
        && cp -R "$dir/$id/apps/$app/.next/static/." "$dir/static/" \
        && touch "$dir/$id/.static-published"
}

_swap() {
    local dir=$1 id=$2 old
    old=$(readlink "$dir/current" 2>/dev/null || true)
    if [ -n "$old" ] && [ "$old" != "$id" ]; then
        ln -sfn "$old" "$dir/previous.tmp" && mv -fT "$dir/previous.tmp" "$dir/previous"
    fi
    ln -sfn "$id" "$dir/current.tmp" && mv -fT "$dir/current.tmp" "$dir/current"
}

# Keeps the served release, the one before it (a rollback by hand is one symlink),
# the last 10 logs, and the static files some release published in the last
# static_keep_days or one of those two releases has, whatever their age.
_prune() {
    local dir=$1 app=$2 keep_current keep_previous entry
    keep_current=$(readlink "$dir/current" 2>/dev/null || true)
    keep_previous=$(readlink "$dir/previous" 2>/dev/null || true)
    for entry in "$dir"/*/; do
        entry=$(basename "$entry")
        case "$entry" in current|previous|logs|static|"$keep_current"|"$keep_previous") ;; *) rm -rf "${dir:?}/$entry" ;; esac
    done
    ls -1t "$dir/logs" 2>/dev/null | tail -n +11 | while read -r old; do rm -f "$dir/logs/$old"; done
    [ -d "$dir/static" ] || return 0
    (cd "$dir/static" && find . -type f -mtime +"$static_keep_days" -print0) \
        | while IFS= read -r -d '' entry; do
            [ -e "$dir/$keep_current/apps/$app/.next/static/$entry" ] \
                || { [ -n "$keep_previous" ] && [ -e "$dir/$keep_previous/apps/$app/.next/static/$entry" ]; } \
                || rm -f "$dir/static/$entry"
        done
    find "$dir/static" -mindepth 1 -type d -empty -delete
}

_follow_app() {
    local app=$1 base=$2 retry_failed=$3 dir key current commit id log after
    dir=$releases/$app
    mkdir -p "$dir/logs"
    commit=$(_commit)
    key=$(_build_key "$app" "$base") || { echo "follow: $app: turbo could not hash the build task" >&2; return 1; }
    current=$(readlink "$dir/current" 2>/dev/null || true)

    if [ -n "$current" ] && [ "$(_release_key "$dir/$current")" = "$key" ]; then
        # Nothing this app's build reads has changed: its release is this commit's too.
        if [ ! -e "$dir/$current/.static-published" ]; then
            # Packaged before releases/<app>/static existed: caddy serves its static
            # files only once they are there.
            log="$dir/logs/$current.static.log"
            if ! { node scripts/precompress-static.mjs "$dir/$current/apps/$app/.next/static" \
                    && _publish_static "$dir" "$current" "$app"; } > "$log" 2>&1; then
                echo "follow: $app: could not publish $current's static files; log ${log#"$releases"/}" >&2
                return 1
            fi
        fi
        if [ "$(_state_field "$dir" status)" != deployed ] || [ "$(_state_field "$dir" revision)" != "$commit" ]; then
            _write_state "$dir" deployed "$current" "$key" "$commit"
        fi
        return 0
    fi
    if ! $retry_failed && [ "$(_failed_key "$dir")" = "$key" ]; then
        return 1
    fi

    id="${commit:0:8}"; id="${id:-tree}-$key"
    log="$dir/logs/$id.log"
    echo "follow: $app: building ${commit:-the tree} (key $key${current:+, serving $current})"
    if [ ! -f "$dir/$id/release.json" ]; then
        # The commit the sidebar shows is not built in: serve.sh hands it to the
        # server as REACT_APP_GIT_COMMIT_SHA from release.json (see the Dockerfile).
        if ! ( cd "apps/$app" && NEXT_PUBLIC_BASE_PATH="$base" pnpm build < /dev/null ) > "$log" 2>&1; then
            _record_failure "$dir" "$key" "$commit" build "$log"
            return 1
        fi
        after=$(_build_key "$app" "$base") || after="(none: turbo could not hash the build task)"
        if [ "$after" != "$key" ]; then
            echo "follow: $app: the tree moved during the build (key $key, now $after); building again on the next pass" >&2
            return 1
        fi
        if ! _package "$app" "$dir/$id.tmp" >> "$log" 2>&1; then
            _record_failure "$dir" "$key" "$commit" package "$log"
            return 1
        fi
        printf '{"app":"%s","key":"%s","revision":%s,"base_path":"%s","built_at":"%s"}\n' \
            "$app" "$key" "$(_json_str "$commit")" "$base" "$(_now)" > "$dir/$id.tmp/release.json"
        rm -rf "${dir:?}/$id"
        mv "$dir/$id.tmp" "$dir/$id"
    fi
    if ! _smoke_start "$dir/$id" "$app" "$base" >> "$log" 2>&1; then
        _record_failure "$dir" "$key" "$commit" start "$log"
        return 1
    fi
    if ! _publish_static "$dir" "$id" "$app" >> "$log" 2>&1; then
        _record_failure "$dir" "$key" "$commit" package "$log"
        return 1
    fi
    _swap "$dir" "$id"
    _write_state "$dir" deployed "$id" "$key" "$commit"
    _prune "$dir" "$app"
    echo "follow: $app: serving $id"
}

_pass() {
    local retry_failed=$1 rc=0 entry
    # Installs node_modules when pnpm-lock.yaml or the image moved; sets runtime_id.
    # shellcheck source=../../../.aidev/pnpm-deps.sh
    if ! source .aidev/pnpm-deps.sh > /tmp/follow-install.log 2>&1; then
        echo "follow: pnpm install failed; every app keeps its release" >&2
        tail -n 20 /tmp/follow-install.log >&2
        return 1
    fi
    for entry in $apps; do
        _follow_app "${entry%%:*}" "${entry#*:}" "$retry_failed" || rc=1
    done
    return $rc
}

case "${1:-once}" in
    once)
        _pass true
        ;;
    watch)
        interval=${2:-20}
        while true; do
            _pass false || true
            mkdir -p "$status_dir"
            python3 "$src/stack/integration/follow/deployed.py" --releases "$releases" \
                --apps "$apps" --source "${FOLLOW_SOURCE_LABEL:-follow:checkout}" \
                --checkout "$(_commit)" > "$status_dir/deployed.json.tmp" \
                && mv -f "$status_dir/deployed.json.tmp" "$status_dir/deployed.json"
            sleep "$interval"
        done
        ;;
    *)
        echo "usage: follow.sh once | watch [SECONDS]" >&2
        exit 64
        ;;
esac
