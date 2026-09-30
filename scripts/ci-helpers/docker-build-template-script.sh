#!/bin/bash

set -e

echo -e "\e[0Ksection_start:$(date +%s):tag[collapsed=true]\r\e[0KDetermining tag for the new image..."

# Determine the TAG value based on branch or tag
if [[ -n "${CI_COMMIT_TAG}" ]]; then
  # For tags, use the actual tag name (not the slug which converts dots to hyphens)
  echo "Running on tag '${CI_COMMIT_TAG}': tag = ${CI_COMMIT_TAG}"
  export TAG="${CI_COMMIT_TAG}"
elif [[ -n "${CI_COMMIT_BRANCH}" ]]; then
  if [[ "${CI_COMMIT_BRANCH}" == "${CI_DEFAULT_BRANCH}" ]]; then
    echo "Running on default branch '${CI_DEFAULT_BRANCH}': tag = 'latest'"
    export TAG="latest"
  elif [[ "${CI_COMMIT_BRANCH}" == "develop" ]]; then
    echo "Running on develop branch: tag = 'develop'"
    export TAG="develop"
  else
    echo "Running on branch '${CI_COMMIT_BRANCH}': tag = ${CI_COMMIT_REF_SLUG}"
    export TAG="${CI_COMMIT_REF_SLUG}"
  fi
else
  echo "Unable to determine ref type, using commit SHA"
  export TAG="${CI_COMMIT_SHORT_SHA}"
fi

echo -e "\e[0Ksection_end:$(date +%s):tag\r\e[0K"

git config --global --add safe.directory "${CI_PROJECT_DIR:?}"
IMAGE_REPO="${CI_REGISTRY_IMAGE:?}/${TURBO_APP_NAME:?}"

# Reuse the image built from identical inputs (denser#969): the `inputs-<hash>` tag
# is pushed only after a successful build, so re-tagging it is a registry-side
# manifest copy, no build. Release tags always build (they also push to hive.blog).
INPUT_HASH="$("${CI_PROJECT_DIR:?}/scripts/ci-helpers/image-input-hash.sh" "${TURBO_APP_PATH:-apps/${TURBO_APP_NAME}}")"
INPUT_TAG="${IMAGE_REPO}:inputs-${INPUT_HASH}"
echo "Image input hash: ${INPUT_HASH}"
if [[ -z "${CI_COMMIT_TAG}" && "${FORCE_IMAGE_BUILD:-false}" != "true" ]] \
    && docker buildx imagetools inspect "${INPUT_TAG}" >/dev/null 2>&1; then
  echo "Inputs unchanged: reusing ${INPUT_TAG} as :${TAG} and :${CI_COMMIT_SHORT_SHA:?} (no docker build)"
  docker buildx imagetools create --tag "${IMAGE_REPO}:${TAG}" --tag "${IMAGE_REPO}:${CI_COMMIT_SHORT_SHA}" "${INPUT_TAG}"
else
  echo -e "\e[0Ksection_start:$(date +%s):build[collapsed=true]\r\e[0KBaking image \"${IMAGE_REPO}:${TAG:?}\"..."
  "${CI_PROJECT_DIR:?}/scripts/build_instance.sh" --progress=plain "${CI_PROJECT_DIR:?}"
  docker buildx imagetools create --tag "${INPUT_TAG}" "${IMAGE_REPO}:${CI_COMMIT_SHORT_SHA:?}"
  echo -e "\e[0Ksection_end:$(date +%s):build\r\e[0K"
fi
APP_NAME="${TURBO_APP_NAME:?}"
# Replace hyphens with underscores for the environment variable name (GitLab dotenv only allows letters, digits, and underscores)
ENV_VAR_NAME="${APP_NAME//-/_}"
echo "${ENV_VAR_NAME^^}_IMAGE_NAME=${CI_REGISTRY_IMAGE:?}/${APP_NAME}:${CI_COMMIT_SHORT_SHA:?}" > "${APP_NAME}-docker-build.env"
echo "Unique image tag:"
cat "${APP_NAME}-docker-build.env"