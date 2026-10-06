#!/usr/bin/env bash
# Bring the integration site to the tip of its branch. Run every 2 minutes by
# systemd/denser-integration-upgrade@.timer; safe to run by hand.
#
#   ./upgrade.sh            # upgrade, rewrite status/deployed.json, then
#                           # Lighthouse-check a newly deployed tip (lighthouse.sh)
#   ./upgrade.sh --quiet    # print nothing when nothing changed (the timer's mode)
#
# DENSER_MODE in .env picks how:
#   follow (default)  fast-forward this checkout to DENSER_SOURCE_BRANCH (default
#                     aidev/integration), rebuild the apps whose build inputs moved
#                     (follow/follow.sh) and serve those builds (compose.follow.yml).
#                     A dirty or diverged checkout is REFUSED and nothing changes; a
#                     build that fails leaves the previous one serving (ROLLED-BACK)
#                     and is tried again on the next run.
#   images            pull the published images at DENSER_TAG (compose.yml alone).
#
# Exit: 0 upgraded or nothing to do; 1 an app could not be brought to the tip
# (ROLLED-BACK); 3 the checkout was REFUSED.
set -euo pipefail
cd "$(dirname "$0")"

quiet=false
[ "${1:-}" = --quiet ] && quiet=true
say() { $quiet || echo "$@"; }

env_value() { sed -n "s/^$1=//p" .env 2>/dev/null | tail -n 1; }

mode=$(env_value DENSER_MODE)
mode=${mode:-follow}
branch=$(env_value DENSER_SOURCE_BRANCH)
branch=${branch:-aidev/integration}
apps="blog:/blog wallet:/wallet"

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
    export COMPOSE_FILE=compose.yml
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
        > status/deployed.json.tmp
    mv status/deployed.json.tmp status/deployed.json
}

follow_upgrade() {
    local image build_rc=0
    export COMPOSE_FILE=compose.yml:compose.follow.yml
    export DENSER_SOURCE_BRANCH=$branch DENSER_UID DENSER_GID
    DENSER_UID=$(id -u)
    DENSER_GID=$(id -g)

    follow_sync_checkout
    if [ -n "$refused" ]; then
        echo "upgrade: REFUSED: $refused; nothing changed" >&2
        follow_write_status REFUSED "$refused"
        exit 3
    fi

    image=$(DENSER_FOLLOW_IMAGE=$(env_value DENSER_FOLLOW_IMAGE) follow/environment-image.sh)
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
    if [ "$build_rc" != 0 ]; then
        echo "upgrade: ROLLED-BACK: an app could not be built or started at $(git rev-parse --short HEAD); see status/deployed.json" >&2
        exit 1
    fi
}

case "$mode" in
    follow) follow_upgrade ;;
    images) images_upgrade ;;
    *) echo "upgrade: DENSER_MODE=$mode is neither follow nor images" >&2; exit 64 ;;
esac

# Advisory: a breach or a failed check is reported in status/lighthouse/ and here,
# never by failing the upgrade or rolling it back.
lighthouse_args=()
$quiet && lighthouse_args+=(--quiet)
./lighthouse.sh "${lighthouse_args[@]}" || echo "upgrade: lighthouse check exited $?; see status/lighthouse/latest.json" >&2
