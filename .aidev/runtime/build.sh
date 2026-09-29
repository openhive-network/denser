#!/usr/bin/env bash
# Build (and with --push, publish) the test runtime image of .aidev/runtime/Dockerfile
# and print the digest-pinned reference to put in .aidev/project.yaml's
# `environment.image`. Run it whenever pnpm-lock.yaml or packageManager changes,
# and commit the new digest together with the lockfile.
#
#   .aidev/runtime/build.sh           # build locally, print the local image id
#   .aidev/runtime/build.sh --push    # build, push, print repo@sha256:<digest>
set -euo pipefail

cd "$(dirname "$0")/../.."

REPOSITORY="${AIDEV_RUNTIME_REPOSITORY:-registry.gitlab.syncad.com/hive/denser/aidev-tests}"
TAG="$(sha256sum pnpm-lock.yaml | cut -c1-12)"

# Only the files the Dockerfile copies: the repository root holds node_modules.
context="$(mktemp -d)"
trap 'rm -rf "$context"' EXIT
cp package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc "$context/"

docker build --pull -f .aidev/runtime/Dockerfile -t "$REPOSITORY:$TAG" "$context" >&2

if [ "${1:-}" != "--push" ]; then
    echo "$REPOSITORY:$TAG"
    exit 0
fi

docker push "$REPOSITORY:$TAG" >&2
docker image inspect "$REPOSITORY:$TAG" --format '{{range .RepoDigests}}{{println .}}{{end}}' \
    | grep -m1 "^$REPOSITORY@sha256:"
