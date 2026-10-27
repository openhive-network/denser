#!/usr/bin/env bash
# Check that every healthcheck of the site's compose files runs a program its
# service's image has: the stack is rendered with `docker compose config`, and for
# each service with a healthcheck the probe's program (and `sh` for a CMD-SHELL test)
# is looked up on the image's PATH. An image that drops the program leaves the
# container unhealthy and `compose up --wait` (upgrade.sh) failing.
#
#   ./test-healthchecks.sh           # follow mode (compose.follow.yml, the default):
#                                    # blog and wallet in follow/environment-image.sh
#   ./test-healthchecks.sh images    # the published -subdirectory images (DENSER_TAG)
#
# Pulls an image that isn't local. Needs docker with the compose plugin.
#
# Exit: 0 every probe's program is in its image; 1 one is missing.
set -euo pipefail
cd "$(dirname "$0")"

mode=${1:-follow}
files=(-f compose.yml -f compose.cache.yml)
case "$mode" in
    follow)
        files+=(-f compose.follow.yml)
        DENSER_FOLLOW_IMAGE=$(follow/environment-image.sh)
        export DENSER_FOLLOW_IMAGE
        ;;
    images) ;;
    *) echo "test-healthchecks: unknown mode '$mode' (follow or images)" >&2; exit 2 ;;
esac

# The values compose.yml requires; none of them reaches a probe.
export DENSER_SERVER_SECRET_COOKIE_PASSWORD=test-healthchecks
export DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET=test-healthchecks
export CLOUDFLARE_API_TOKEN=test-healthchecks
export SITE_HOST=test-healthchecks.invalid

# One "service<TAB>image<TAB>program..." line per probe, from the rendered config.
probes=$(docker compose --env-file /dev/null "${files[@]}" config --format json | python3 -c '
import json, sys
for name, svc in sorted(json.load(sys.stdin)["services"].items()):
    test = (svc.get("healthcheck") or {}).get("test")
    if not test or test[0] == "NONE":
        continue
    if test[0] == "CMD":
        programs = [test[1]]
    elif test[0] == "CMD-SHELL":
        programs = ["sh", test[1].split()[0]]
    else:
        sys.exit(f"{name}: healthcheck test {test!r} is neither CMD nor CMD-SHELL")
    print("\t".join([name, svc["image"], *programs]))
')
[ -n "$probes" ] || { echo "FAIL no service has a healthcheck"; exit 1; }

failed=0
while IFS=$'\t' read -r service image programs; do
    docker image inspect "$image" > /dev/null 2>&1 || docker pull -q "$image" > /dev/null
    for program in $programs; do
        if docker run --rm --entrypoint sh "$image" -c 'command -v "$1"' sh "$program" > /dev/null; then
            echo "ok   $service: $program in $image"
        else
            echo "FAIL $service: $program not in $image"
            failed=1
        fi
    done
done <<< "$probes"
exit $failed
