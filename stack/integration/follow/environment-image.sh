#!/usr/bin/env bash
# Prints the image follow mode builds and serves in: DENSER_FOLLOW_IMAGE when set,
# otherwise `environment.image` of the checkout's .aidev/project.yaml (the image the
# project's suites run in: Node, pnpm and the store of this pnpm-lock.yaml, so a
# lockfile change arrives together with the image that installs it).
set -euo pipefail
profile="$(dirname "$0")/../../../.aidev/project.yaml"
image=${DENSER_FOLLOW_IMAGE:-$(sed -n '/^environment:/,/^[^ #]/s/^  image: *"\{0,1\}\([^"]*\)"\{0,1\} *$/\1/p' "$profile")}
[ -n "$image" ] || { echo "no DENSER_FOLLOW_IMAGE and no environment.image in $profile" >&2; exit 1; }
echo "$image"
