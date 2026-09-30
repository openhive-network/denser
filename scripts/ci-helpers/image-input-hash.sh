#!/bin/bash
# Print the content hash of everything that goes into an app's Docker image
# (Dockerfile + build scripts, the workspace manifests and lockfile, the app and
# the shared packages, minus tests), plus the build arguments that change its
# output (read from docker-bake.hcl's `args`), and the ISO week, so a reused image
# is rebuilt at least weekly. Two commits with the same hash produce the same
# image, so CI reuses the image tagged `inputs-<hash>` instead of rebuilding it
# (denser#969).
#
#   scripts/ci-helpers/image-input-hash.sh apps/blog
#
# Hashes committed content (`git ls-files -s`: path, mode, blob id), so it is
# fast and ignores untracked files. Build-argument values are hashed, never
# printed.
set -euo pipefail

APP_PATH="${1:?usage: $0 <app path, e.g. apps/blog>}"
APP_PATH="${APP_PATH#/}"

cd "$(git rev-parse --show-toplevel)"

INPUTS=(
  Dockerfile docker-bake.hcl .dockerignore
  package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc
  docker/docker-entrypoint.sh
  scripts/build_instance.sh scripts/write-version.sh
  scripts/ci-helpers/docker-build-template-script.sh
  scripts/ci-helpers/image-input-hash.sh
  "$APP_PATH"
  packages
)
# Test-only files: excluded by .dockerignore or never reached by `next build`.
EXCLUDES=(
  ':(exclude,glob)**/*.spec.ts' ':(exclude,glob)**/*.spec.tsx'
  ':(exclude,glob)**/*.test.ts' ':(exclude,glob)**/*.test.tsx'
  ":(exclude,glob)${APP_PATH}/playwright/**"
  ":(exclude,glob)${APP_PATH}/playwright*.config.ts"
  ':(exclude,glob)**/.env.testing' ':(exclude,glob)**/.env.mirrornet-testing'
  ':(exclude,glob)packages/renderer/test-data/**'
  ':(exclude,glob)packages/renderer/browser-test/**'
  ':(exclude,glob)packages/*/tsconfig.test.json'
)

{
  git ls-files -s -- "${INPUTS[@]}" "${EXCLUDES[@]}"
  # Every build arg docker-bake.hcl passes (its `args = { ... }` block), except
  # the label/version ones that name the building commit.
  bake_args="$(sed -n '/^ *args *= *{/,/^ *}/p' docker-bake.hcl | grep -oE '^ *[A-Z_][A-Z0-9_]* *=' | tr -d ' =' | sort -u)"
  [[ -n "$bake_args" ]] || { echo "no build args parsed from docker-bake.hcl" >&2; exit 1; }
  for var in $bake_args IMAGE_INPUT_SALT; do
    case "$var" in BUILD_TIME|GIT_*) continue ;; esac
    printf '%s=%s\n' "$var" "${!var:-}"
  done
  # Freshness: a new ISO week forces a rebuild, picking up base-image/apk fixes.
  printf 'WEEK=%s\n' "$(date -u +%G-W%V)"
} | sha256sum | cut -c1-32
