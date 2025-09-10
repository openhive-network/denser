#!/bin/bash

set -e

echo -e "\e[0Ksection_start:$(date +%s):tag[collapsed=true]\r\e[0KDetermining tag for the new image..."
if [[ "${CI_COMMIT_BRANCH:?}" == "${CI_DEFAULT_BRANCH:?}" ]]; then
  echo "Running on default branch '${CI_DEFAULT_BRANCH}': tag = 'latest'"
  export TAG="latest"
else
  echo "Running on branch '${CI_COMMIT_BRANCH:?}': tag = ${CI_COMMIT_REF_SLUG:?}"
  export TAG="${CI_COMMIT_REF_SLUG:?}"
fi
echo -e "\e[0Ksection_end:$(date +%s):tag\r\e[0K"

echo -e "\e[0Ksection_start:$(date +%s):build[collapsed=true]\r\e[0KBaking image \"${CI_REGISTRY_IMAGE:?}/${TURBO_APP_NAME:?}:${TAG:?}\"..."
git config --global --add safe.directory "${CI_PROJECT_DIR:?}"
"${CI_PROJECT_DIR:?}/scripts/build_instance.sh" --progress=plain "${CI_PROJECT_DIR:?}"
APP_NAME="${TURBO_APP_NAME:?}"
# Replace hyphens with underscores for the environment variable name (GitLab dotenv only allows letters, digits, and underscores)
ENV_VAR_NAME="${APP_NAME//-/_}"
echo "${ENV_VAR_NAME^^}_IMAGE_NAME=${CI_REGISTRY_IMAGE:?}/${APP_NAME}:${CI_COMMIT_SHORT_SHA:?}" > "${APP_NAME}-docker-build.env"
echo "Unique image tag:"
cat "${APP_NAME}-docker-build.env"
echo -e "\e[0Ksection_end:$(date +%s):build\r\e[0K"