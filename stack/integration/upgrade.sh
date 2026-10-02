#!/usr/bin/env bash
# Bring the integration site to the latest published `integration` images and to the
# tip of aidev/integration for this directory's compose files. Run every 5 minutes
# by systemd/denser-integration-upgrade@.timer; safe to run by hand.
#
#   ./upgrade.sh            # pull, recreate what changed, rewrite status/deployed.json
#   ./upgrade.sh --quiet    # print nothing when nothing changed (the timer's mode)
set -euo pipefail
cd "$(dirname "$0")"

quiet=false
[ "${1:-}" = --quiet ] && quiet=true
say() { $quiet || echo "$@"; }

# The compose files follow the branch the images come from. --ff-only: a hand edit
# here stops the pull rather than being merged over.
git fetch -q origin aidev/integration
if ! git merge-base --is-ancestor HEAD origin/aidev/integration; then
    echo "upgrade: this checkout has diverged from origin/aidev/integration; not pulling" >&2
else
    before_head=$(git rev-parse HEAD)
    git merge -q --ff-only origin/aidev/integration
    [ "$before_head" = "$(git rev-parse HEAD)" ] || say "upgrade: checkout $before_head -> $(git rev-parse HEAD)"
fi

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

mkdir -p status
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
