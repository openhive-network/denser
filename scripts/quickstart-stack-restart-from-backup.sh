#!/bin/bash

set -e

SCRIPT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit 1; pwd -P )"
SRC_DIR="$SCRIPT_DIR/.."

ENV_PATH="${SRC_DIR}/stack/mirrornet-stack.env"

echo "Stopping stack if running..."
./scripts/stop-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser || true
docker volume rm mirrornet-api-stack_haf-datadir || true
docker volume rm mirrornet-api-stack_docker-certs-client || true
docker volume rm mirrornet-api-stack_docker-certs-server || true
docker volume rm mirrornet-api-stack_docker-certs-ca || true

echo "Building Denser..."
scripts/build_instance.sh --app-name="auth" --tag="local"
scripts/build_instance.sh --app-name="blog" --tag="local"
scripts/build_instance.sh --app-name="wallet" --tag="local"

echo "Restoring the mirrornet stack from backup..."
sudo rm -rf /srv/haf-pool/haf-datadir
sudo cp --recursive --preserve /srv/haf-pool/haf-datadir{.bak,}

echo "Starting the mirrornet stack..."
./scripts/start-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser
./scripts/wait-for-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser