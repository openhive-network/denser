#!/usr/bin/env bash
# Bring the integration site to the tip of its branch. Run every 2 minutes by
# systemd/denser-integration-upgrade@.timer; safe to run by hand.
#
#   ./upgrade.sh            # upgrade, rewrite status/deployed.json, check the blog's
#                           # OAuth2 provider (status/oauth.json)
#   ./upgrade.sh --quiet    # print nothing when nothing changed (the timer's mode)
#
# DENSER_MODE in .env picks how:
#   follow (default)  fast-forward this checkout to DENSER_SOURCE_BRANCH (default
#                     aidev/integration), rebuild the apps whose build inputs moved
#                     (follow/follow.sh) and serve those builds (compose.follow.yml).
#                     A dirty or diverged checkout is REFUSED and nothing changes; a
#                     build that fails leaves the previous one serving (ROLLED-BACK)
#                     and is tried again on the next run. Less free space on the
#                     checkout's filesystem than DENSER_MIN_FREE_GB (default 5) skips
#                     the run (DISK-LOW) and the current release keeps serving; a
#                     successful run removes the follow images no release needs.
#   images            pull the published images at DENSER_TAG (compose.yml alone).
#
# Either way caddy then loads a changed caddy/ (caddy-apply.sh): validated first,
# and a config it refuses leaves the previous one serving. DENSER_HTML_CACHE=varnish
# in .env adds the shared HTML cache (compose.cache.yml), which loads a changed
# varnish/ the same way (varnish-apply.sh).
#
# The Lighthouse check of a deployed tip is not part of a run: lighthouse.sh has its
# own unit (systemd/denser-integration-lighthouse@.timer), so a deploy never waits
# for a measurement.
#
# Exit: 0 upgraded or nothing to do; 1 an app could not be brought to the tip
# (ROLLED-BACK); 3 the checkout was REFUSED; 4 caddy refused the checkout's caddy/;
# 5 varnish refused the checkout's varnish/; 6 too little free disk to build (DISK-LOW).
set -euo pipefail
cd "$(dirname "$0")"

quiet=false
[ "${1:-}" = --quiet ] && quiet=true
say() { $quiet || echo "$@"; }
quiet_args=()
$quiet && quiet_args+=(--quiet)

env_value() { sed -n "s/^$1=//p" .env 2>/dev/null | tail -n 1; }

mode=$(env_value DENSER_MODE)
mode=${mode:-follow}
branch=$(env_value DENSER_SOURCE_BRANCH)
branch=${branch:-aidev/integration}
apps="blog:/blog wallet:/wallet"
# Images mode's repositories; follow mode removes the ones no container uses.
subdirectory_repos="registry.gitlab.syncad.com/hive/denser/blog-subdirectory registry.gitlab.syncad.com/hive/denser/wallet-subdirectory"
caddy_rc=0
varnish_rc=0

html_cache=$(env_value DENSER_HTML_CACHE)
case "${html_cache:-off}" in
    off) cache_compose="" ;;
    varnish) cache_compose=:compose.cache.yml ;;
    *) echo "upgrade: DENSER_HTML_CACHE=$html_cache is neither varnish nor off" >&2; exit 64 ;;
esac

# Loads a changed varnish/ when the cache runs.
apply_varnish() {
    [ -z "$cache_compose" ] || ./varnish-apply.sh "${quiet_args[@]}" || varnish_rc=5
}

# Before compose up: caddy bind-mounts status/, and docker would create it root-owned.
mkdir -p status releases
exec 8>status/.upgrade.lock
flock -n 8 || { say "upgrade: another upgrade is running"; exit 0; }

# --ff-only: a hand edit here stops the pull rather than being merged over.
images_sync_checkout() {
    git fetch -q origin "$branch"
    if ! git merge-base --is-ancestor HEAD "origin/$branch"; then
        echo "upgrade: this checkout has diverged from origin/$branch; not pulling" >&2
    else
        before_head=$(git rev-parse HEAD)
        git merge -q --ff-only "origin/$branch"
        [ "$before_head" = "$(git rev-parse HEAD)" ] || say "upgrade: checkout $before_head -> $(git rev-parse HEAD)"
    fi
}

images_upgrade() {
    export COMPOSE_FILE=compose.yml$cache_compose
    images_sync_checkout

    ids() { docker compose images --format json 2>/dev/null | python3 -c '
import json, sys
raw = sys.stdin.read().strip()
rows = json.loads(raw) if raw.startswith("[") else [json.loads(l) for l in raw.splitlines() if l]
print(" ".join(sorted(r.get("ID", "") for r in rows)))'; }

    before=$(ids)
    # A tag not published yet (first boot, or a failed publish) keeps the running or
    # locally built image instead of stopping the upgrade.
    docker compose pull -q --ignore-pull-failures || true
    docker compose up -d --remove-orphans --wait --wait-timeout 300 >/dev/null 2>&1 || {
        echo "upgrade: compose up did not reach healthy; see 'docker compose ps' and logs" >&2
        docker compose ps >&2
    }
    after=$(ids)
    ./caddy-apply.sh "${quiet_args[@]}" || caddy_rc=4
    apply_varnish
    # A new image serves only its own build's /_next/static, so a cached page of the
    # previous build would load chunks that are gone. (Follow mode keeps them.)
    if [ -n "$cache_compose" ] && [ "$before" != "$after" ]; then
        docker compose exec -T varnish varnishadm ban 'obj.status != 0' > /dev/null \
            || echo "upgrade: purging the HTML cache failed; cached pages expire within their s-maxage + stale-if-error" >&2
    fi

    python3 - "$(git rev-parse HEAD)" <<'EOF' > status/deployed.json.tmp
import json, subprocess, sys, datetime
checkout = sys.argv[1]
env = {}
for line in open(".env"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k] = v
services = {}
for svc in ("blog", "wallet"):
    cid = subprocess.run(["docker", "compose", "ps", "-q", svc], capture_output=True, text=True).stdout.strip()
    if not cid:
        services[svc] = None
        continue
    info = json.loads(subprocess.run(["docker", "inspect", cid], capture_output=True, text=True).stdout)[0]
    image = json.loads(subprocess.run(["docker", "image", "inspect", info["Image"]], capture_output=True, text=True).stdout)[0]
    labels = image.get("Config", {}).get("Labels") or {}
    services[svc] = {
        "image": info["Config"]["Image"],
        "digest": (image.get("RepoDigests") or [None])[0],
        "revision": labels.get("org.opencontainers.image.revision"),
        "started_at": info["State"].get("StartedAt"),
        "health": (info["State"].get("Health") or {}).get("Status"),
    }
print(json.dumps({
    "site": env.get("SITE_HOST"),
    "network": env.get("DENSER_NETWORK", "mainnet"),
    "mode": "images",
    "tag": env.get("DENSER_TAG", "integration"),
    "stack_checkout": checkout,
    "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "services": services,
}, indent=2))
EOF
    mv status/deployed.json.tmp status/deployed.json

    if [ "$before" != "$after" ]; then
        echo "upgrade: images changed; status/deployed.json rewritten"
    else
        say "upgrade: no image change"
    fi
}

# Fast-forwards to origin/$branch, or sets `refused` and changes nothing.
follow_sync_checkout() {
    local current dirty before
    refused=""
    current=$(git symbolic-ref -q --short HEAD || echo "a detached HEAD")
    if [ "$current" != "$branch" ]; then
        refused="the checkout is on $current, not $branch"
        return
    fi
    dirty=$(git status --porcelain --untracked-files=normal | head -n 5)
    if [ -n "$dirty" ]; then
        refused="the checkout has local changes: $(echo "$dirty" | tr '\n' ' ')"
        return
    fi
    if ! git fetch -q origin "$branch"; then
        echo "upgrade: fetching origin/$branch failed; staying on $(git rev-parse --short HEAD)" >&2
        return
    fi
    if ! git merge-base --is-ancestor HEAD "origin/$branch"; then
        refused="origin/$branch is not a fast-forward of $(git rev-parse --short HEAD)"
        return
    fi
    before=$(git rev-parse HEAD)
    git merge -q --ff-only "origin/$branch"
    [ "$before" = "$(git rev-parse HEAD)" ] || say "upgrade: checkout $before -> $(git rev-parse HEAD)"
}

# true when every app has a release to serve, i.e. the follow services can start.
follow_all_released() {
    local entry
    for entry in $apps; do
        [ -e "releases/${entry%%:*}/current/release.json" ] || return 1
    done
}

# Waits (up to 2 minutes) for each server to run the release follow.sh swapped in.
follow_wait_serving() {
    local deadline=$((SECONDS + 120)) entry app pending
    while true; do
        pending=""
        for entry in $apps; do
            app=${entry%%:*}
            [ "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("release",""))' "releases/$app/serving.json" 2>/dev/null)" \
                = "$(readlink "releases/$app/current")" ] || pending="$pending $app"
        done
        [ -z "$pending" ] && return 0
        [ $SECONDS -lt $deadline ] || { echo "upgrade: still not serving the current release:$pending" >&2; return 1; }
        sleep 3
    done
}

follow_write_status() {
    python3 follow/deployed.py --releases releases --apps "$apps" --source "follow:$branch" \
        --checkout "$(git rev-parse HEAD)" --upgrade-status "$1" --upgrade-detail "${2:-}" \
        --site "$(env_value SITE_HOST)" --network "$(env_value DENSER_NETWORK | grep . || echo mainnet)" \
        --disk-free-bytes "$disk_free" --disk-min-free-bytes "$disk_min_free" \
        > status/deployed.json.tmp \
        && mv status/deployed.json.tmp status/deployed.json
}

follow_image() { DENSER_FOLLOW_IMAGE=$(env_value DENSER_FOLLOW_IMAGE) follow/environment-image.sh; }

# Bytes available on the checkout's filesystem: builds, releases and git's index.
free_bytes() { df -P -B1 . | awk 'NR == 2 { print $4 }'; }

# status/.follow-images: the last two follow images a run completed with, newest
# last. Every image change rebuilds every app, so they are the images the current
# and the previous releases were built and served in.
follow_record_image() {
    [ "$(tail -n 1 status/.follow-images 2>/dev/null)" = "$1" ] && return 0
    { tail -n 1 status/.follow-images 2>/dev/null || true; echo "$1"; } > status/.follow-images.tmp \
        && mv status/.follow-images.tmp status/.follow-images
}

# Removes the images of the follow image's repository other than those of
# status/.follow-images (and $1), and images mode's -subdirectory images. An image a
# container uses, running or stopped, of any stack, stays; no other repository is
# looked at.
follow_prune_images() {
    local repo ref id keep refs=() errors failed
    repo=${1%%@*}
    [[ "${repo##*/}" != *:* ]] || repo=${repo%:*}
    keep=$( { { cat status/.follow-images 2>/dev/null || true; echo "$1"; } | while read -r ref; do
                docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true
            done
            docker ps -aq | xargs -r docker inspect --format '{{.Image}}' 2>/dev/null || true
        } | tr '\n' ' ')
    keep=" $keep "
    while read -r id ref; do
        [ -n "$id" ] && [[ "$keep" != *" $id "* ]] || continue
        # An untagged image (a digest-pinned pull, or a tag that moved) goes by its ID.
        if [[ "$ref" == *:"<none>" ]]; then refs+=("$id"); else refs+=("$ref"); fi
    done < <(for ref in "$repo" $subdirectory_repos; do
            docker image ls --no-trunc --format '{{.ID}} {{.Repository}}:{{.Tag}}' "$ref" || true
        done | sort -u)
    [ ${#refs[@]} -gt 0 ] || return 0
    errors=$(docker image rm "${refs[@]}" 2>&1 > /dev/null) || true
    failed=$(grep -c . <<< "$errors" || true)
    echo "upgrade: removed $((${#refs[@]} - failed)) superseded images of ${repo##*/}, blog-subdirectory and wallet-subdirectory"
    [ -z "$errors" ] || { echo "upgrade: $failed were not removed:" >&2; head -n 5 <<< "$errors" >&2; }
}

# Sets disk_free and disk_min_free. A filesystem below the minimum is first given
# back the superseded images, then measured again.
follow_check_disk() {
    local min_gb
    min_gb=$(env_value DENSER_MIN_FREE_GB)
    min_gb=${min_gb:-5}
    [[ "$min_gb" =~ ^[0-9]+$ ]] || { echo "upgrade: DENSER_MIN_FREE_GB=$min_gb is not a whole number of GB" >&2; exit 64; }
    disk_min_free=$((min_gb * 1000000000))
    disk_free=$(free_bytes)
    [ "$disk_free" -lt "$disk_min_free" ] || return 0
    follow_prune_images "$(follow_image)" || true
    disk_free=$(free_bytes)
}

# Posts to RC_WEBHOOK_URL (a Rocket.Chat incoming webhook), at most once per UTC day.
disk_low_notify() {
    local url day
    url=${RC_WEBHOOK_URL:-$(env_value RC_WEBHOOK_URL)}
    [ -n "$url" ] || return 0
    day=$(date -u +%F)
    [ "$(cat status/.disk-low-notified 2>/dev/null)" != "$day" ] || return 0
    if python3 -c 'import json, sys; print(json.dumps({"text": sys.argv[1]}))' \
            ":warning: denser integration site $(env_value SITE_HOST): $1" \
        | curl -fsS --max-time 30 -H 'Content-Type: application/json' --data-binary @- "$url" > /dev/null; then
        echo "$day" > status/.disk-low-notified || true
    else
        echo "upgrade: posting the low-disk warning to RC_WEBHOOK_URL failed" >&2
    fi
}

follow_upgrade() {
    local image build_rc=0
    export COMPOSE_FILE=compose.yml:compose.follow.yml$cache_compose
    export DENSER_SOURCE_BRANCH=$branch DENSER_UID DENSER_GID
    DENSER_UID=$(id -u)
    DENSER_GID=$(id -g)

    # Before git, which a full disk fails too (its index.lock).
    follow_check_disk
    if [ "$disk_free" -lt "$disk_min_free" ]; then
        local detail="$((disk_free / 1000000)) MB free on the checkout's filesystem, under DENSER_MIN_FREE_GB=$((disk_min_free / 1000000000)); nothing pulled or built, the current release keeps serving"
        echo "upgrade: DISK-LOW: $detail" >&2
        follow_write_status DISK-LOW "$detail" || echo "upgrade: could not write status/deployed.json" >&2
        disk_low_notify "$detail"
        exit 6
    fi

    follow_sync_checkout
    if [ -n "$refused" ]; then
        echo "upgrade: REFUSED: $refused; nothing changed" >&2
        follow_write_status REFUSED "$refused"
        exit 3
    fi

    image=$(follow_image)
    export DENSER_FOLLOW_IMAGE=$image
    docker image inspect "$image" > /dev/null 2>&1 || docker pull -q "$image" > /dev/null

    # A run that finds the tip and the image unchanged since a pass that brought
    # every app to them starts nothing. A failed pass is not recorded, so the next
    # run tries again.
    followed="$(git rev-parse HEAD) $image"
    if ! follow_all_released || [ "$(cat status/.followed 2>/dev/null)" != "$followed" ]; then
        docker compose --progress quiet run --rm --no-deps -T follower \
            bash stack/integration/follow/follow.sh once || build_rc=$?
        [ "$build_rc" != 0 ] || echo "$followed" > status/.followed
    fi

    if follow_all_released; then
        # A no-op once the follow services run; the first time, it replaces the
        # image-mode containers (which served throughout the first builds).
        docker compose up -d --remove-orphans --wait --wait-timeout 300 > /dev/null 2>&1 || {
            echo "upgrade: compose up did not reach healthy; see 'docker compose ps' and logs" >&2
            docker compose ps >&2
        }
        follow_wait_serving || true
    else
        echo "upgrade: not every app has a build yet; the running containers keep serving" >&2
    fi
    follow_write_status OK
    ./caddy-apply.sh "${quiet_args[@]}" || caddy_rc=4
    apply_varnish
    if [ "$build_rc" = 0 ] && follow_all_released; then
        { follow_record_image "$image" && follow_prune_images "$image"; } \
            || echo "upgrade: removing superseded images failed" >&2
    fi
    if [ "$build_rc" != 0 ]; then
        echo "upgrade: ROLLED-BACK: an app could not be built or started at $(git rev-parse --short HEAD); see status/deployed.json" >&2
        exit 1
    fi
}

# The blog's OAuth2 provider must send a signed-out user to its sign-in page under
# /blog. Checked once per checkout revision, and again on every run while it fails;
# the result goes to status/oauth.json.
oauth_check() {
    local revision url headers http_code location result=fail
    revision=$(git rev-parse HEAD)
    python3 -c 'import json, sys; d = json.load(open("status/oauth.json")); sys.exit(d.get("revision") != sys.argv[1] or d.get("status") != "ok")' \
        "$revision" 2> /dev/null && return 0
    url="https://$(env_value SITE_HOST)/blog/api/oauth/authorize?response_type=code&client_id=denser&redirect_uri=https%3A%2F%2Fopenhive.chat%2F_oauth%2Fdenser"
    headers=$(curl -s -o /dev/null -D - --max-time 30 "$url" | tr -d '\r') || true
    http_code=$(sed -n '1s/^HTTP\/[0-9.]* \([0-9]*\).*/\1/p' <<< "$headers")
    location=$(sed -n 's/^[Ll]ocation: //p' <<< "$headers" | tail -n 1)
    [ "$http_code" = 302 ] && [[ "$location" == *"/blog/login?oauth_return=true" ]] && result=ok
    python3 - "$revision" "$result" "$http_code" "$location" <<'EOF' > status/oauth.json.tmp
import datetime, json, sys
revision, status, http_code, location = sys.argv[1:]
print(json.dumps({
    "revision": revision,
    "status": status,
    "http_code": int(http_code) if http_code else None,
    "location": location or None,
    "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}, indent=2))
EOF
    mv status/oauth.json.tmp status/oauth.json
    if [ "$result" = ok ]; then
        say "upgrade: oauth check ok at $revision"
        return 0
    fi
    echo "upgrade: oauth check failed: authorize answered ${http_code:-nothing}, Location ${location:-none}" >&2
    return 1
}

case "$mode" in
    follow) follow_upgrade ;;
    images) images_upgrade ;;
    *) echo "upgrade: DENSER_MODE=$mode is neither follow nor images" >&2; exit 64 ;;
esac

# Advisory: a failed check is reported in status/oauth.json and here, never by
# failing the upgrade or rolling it back.
oauth_check || echo "upgrade: see status/oauth.json" >&2

# After the check, which a refused caddy/ or varnish/ does not stop: the apps may
# have moved.
[ "$caddy_rc" != 0 ] && exit "$caddy_rc"
exit "$varnish_rc"
