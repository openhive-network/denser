#!/usr/bin/env bash
# Prints the image follow mode builds and serves in: DENSER_FOLLOW_IMAGE when set,
# otherwise the image of the checkout's .aidev/project.yaml that holds the pnpm store
# of its pnpm-lock.yaml: `environment.fallback` of a `kind: shared` environment (the
# shared `environment.image` is a tag with no store), else `environment.image`. A
# lockfile change arrives together with the image that installs it.
#
#   follow/environment-image.sh [PROFILE]   # PROFILE: another project.yaml, - for stdin
set -euo pipefail
profile=${1:-"$(dirname "$0")/../../../.aidev/project.yaml"}
image=${DENSER_FOLLOW_IMAGE:-}
if [ -z "$image" ]; then
    environment=$(sed -n '/^environment:/,/^[^ #]/p' "$profile")
    field() { sed -n 's/^  '"$1"': *"\{0,1\}\([^"]*\)"\{0,1\} *$/\1/p' <<< "$environment"; }
    image=$(field fallback)
    [ -n "$image" ] || image=$(field image)
fi
[ -n "$image" ] || { echo "no DENSER_FOLLOW_IMAGE and no environment.fallback or environment.image in $profile" >&2; exit 1; }
echo "$image"
