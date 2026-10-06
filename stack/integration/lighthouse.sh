#!/usr/bin/env bash
# Median-of-3 Lighthouse check of this site, once per revision of aidev/integration.
# Run by upgrade.sh after it rewrites status/deployed.json; safe to run by hand.
#
# It measures only when every app in status/deployed.json runs this checkout's HEAD
# (the promoted tip) and that revision has no result yet, so one promote costs one
# check of 3 runs per route, one Chrome at a time, CPU-capped: the host serves other
# sites too. In follow mode a commit that changes no app's build (docs, tests) leaves
# every app on builds an earlier revision was measured with, and those builds are
# not measured again. The check itself is scripts/ci-helpers/lighthouse-integration-check.js.
#
# Results, served at https://$SITE_HOST/status/lighthouse/:
#   <revision>.json and latest.json  ("status": "pass" | "breach")
#
#   ./lighthouse.sh            # measure the tip if it is deployed and not yet measured
#   ./lighthouse.sh --quiet    # print nothing when there is nothing to measure
#   ./lighthouse.sh --force    # measure the deployed tip again
#
# Exit: 0 measured within thresholds, or nothing to measure; 2 a threshold breached;
#       anything else, the check could not measure.
set -euo pipefail
cd "$(dirname "$0")"

# Chrome + Lighthouse 13.5 + Node 24, the image the GitLab CI lighthouse jobs use.
LIGHTHOUSE_IMAGE=registry.gitlab.com/gitlab-ci-utils/lighthouse@sha256:b9d544ecc3196357d82ce434826c51ccbd57a117e16891570883b937b1713358
OUT=status/lighthouse

quiet=false
force=false
for arg in "$@"; do
    case "$arg" in
        --quiet) quiet=true ;;
        --force) force=true ;;
        *) echo "lighthouse: unknown argument $arg" >&2; exit 64 ;;
    esac
done
say() { $quiet || echo "$@"; }

revision=$(git rev-parse HEAD)
site_host=$(sed -n 's/^SITE_HOST=//p' .env | tail -n 1)
[ -n "$site_host" ] || { echo "lighthouse: SITE_HOST is not set in .env" >&2; exit 1; }

# "yes <builds>" when every app serves $revision, <builds> naming what they serve
# (follow mode's releases, or the images' digests).
served=$(python3 - "$revision" <<'EOF'
import hashlib, json, sys
services = json.load(open("status/deployed.json")).get("services") or {}
revisions = {name: (svc or {}).get("revision") for name, svc in services.items()}
if revisions and all(r == sys.argv[1] for r in revisions.values()):
    builds = sorted(f"{name}={svc.get('release') or svc.get('digest')}" for name, svc in services.items())
    print("yes", hashlib.sha256(" ".join(builds).encode()).hexdigest()[:16])
else:
    print(revisions)
EOF
)
if [ "${served%% *}" != yes ]; then
    say "lighthouse: the site does not serve $revision yet ($served); nothing measured"
    exit 0
fi
builds=${served#yes }
if [ -e "$OUT/$revision.json" ] && ! $force; then
    say "lighthouse: $revision already measured ($OUT/$revision.json)"
    exit 0
fi
if [ -e "$OUT/builds/$builds" ] && ! $force; then
    say "lighthouse: $revision serves the builds $(cat "$OUT/builds/$builds") was measured with; nothing measured"
    exit 0
fi

mkdir -p "$OUT/builds"
exec 9>"$OUT/.lock"
flock -n 9 || { say "lighthouse: another check is running"; exit 0; }

echo "lighthouse: measuring $revision on https://$site_host"
rc=0
docker run --rm --cpus 2 --memory 2g \
    --user "$(id -u):$(id -g)" -e HOME=/tmp \
    -v "$PWD/../../scripts/ci-helpers:/check:ro" \
    -v "$PWD/$OUT:/out" \
    -w /check \
    "$LIGHTHOUSE_IMAGE" \
    node lighthouse-integration-check.js \
        --site "https://$site_host" --revision "$revision" --out /out --wait-timeout 300 || rc=$?
# 0 within thresholds, 2 a breach: either way these builds have their result.
if [ "$rc" = 0 ] || [ "$rc" = 2 ]; then
    echo "$revision" > "$OUT/builds/$builds"
fi
exit "$rc"
