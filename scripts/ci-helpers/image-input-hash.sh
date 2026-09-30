#!/bin/bash
# Print the content hash of everything that goes into an app's Docker image
# (Dockerfile + build scripts, the workspace manifests and lockfile, the app and
# the shared packages, minus tests), plus the build arguments that change its
# output. Two commits with the same hash produce the same image, so CI reuses
# the image tagged `inputs-<hash>` instead of rebuilding it (denser#969).
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
  # docker-bake.hcl build args that change the image (labels/version.json excluded:
  # they name the commit that built the image).
  for var in TURBO_APP_SCOPE TURBO_APP_PATH TURBO_APP_NAME BASE_PATH \
             REACT_APP_SENTRY_DSN REACT_APP_ALLOWED_HIVE_API_NODES \
             REACT_APP_GOOGLE_DRIVE_CLIENT_ID IMAGE_INPUT_SALT; do
    printf '%s=%s\n' "$var" "${!var:-}"
  done
} | sha256sum | cut -c1-32
