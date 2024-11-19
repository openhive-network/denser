#!/bin/bash

set -e

SCRIPT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit 1; pwd -P )"
SRC_DIR="$SCRIPT_DIR/.."

BLOCK_LOG_UTIL_PATH="${HOME}/hive-utils/block_log_util"
ENV_PATH="${SRC_DIR}/stack/mirrornet-stack.env"

echo "Updating Git submodules..."
git submodule update --init --recursive

echo "Stopping and deleting the previous stack if present..."
./scripts/stop-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser || true
rm -f "${ENV_PATH}"
sudo rm -rf /srv/haf-pool/haf-datadir
sudo rm -rf /srv/haf-pool/haf-datadir.bak
docker volume rm mirrornet-api-stack_haf-datadir || true
docker volume rm mirrornet-api-stack_docker-certs-client || true
docker volume rm mirrornet-api-stack_docker-certs-server || true
docker volume rm mirrornet-api-stack_docker-certs-ca || true

echo "Downloading and installing block_log_util..."
mkdir -p "${HOME}/hive-utils"
curl --location --output "${BLOCK_LOG_UTIL_PATH}" "https://gitlab.syncad.com/api/v4/projects/323/jobs/artifacts/develop/raw/haf-mirrornet-binaries/block_log_util/?job=haf_image_build_mirrornet"
chmod +x "${BLOCK_LOG_UTIL_PATH}"

echo "Downloading and extracting block_log and accompanying files..."
./haf/hive/scripts/ci-helpers/export-data-from-docker-image.sh registry.gitlab.syncad.com/hive/hive/extended-block-log:42bf3ac5 "${HOME}/mirrornet-blockchain" --image-path=/blockchain/

echo "Building Denser..."
./scripts/build_instance.sh --app-name="auth" --tag="local"
./scripts/build_instance.sh --app-name="blog" --tag="local"
./scripts/build_instance.sh --app-name="wallet" --tag="local"

echo "Setting up the mirrornet stack..."
./scripts/setup-stack.sh --block-log-source="${HOME}/mirrornet-blockchain" --block-log-util-path="${BLOCK_LOG_UTIL_PATH}"
sed -i.bak "s#ARGUMENTS=.*#ARGUMENTS=--chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n --replay-blockchain --stop-at-block $(cat /tmp/head_block_number) --alternate-chain-spec=/home/hived/datadir/blockchain/alternate-chain-spec.json#" "${ENV_PATH}"

echo "Starting the mirrornet stack..."
./scripts/start-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser
./scripts/wait-for-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser --wait-for-sync="$(cat /tmp/head_block_number)"

echo "Stopping the mirrornet stack..."
./scripts/stop-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser

echo "Creating data directory backup..."
sudo cp --recursive --preserve /srv/haf-pool/haf-datadir{,.bak}

echo "Restarting the mirrornet stack..."
sed -i.bak "s#ARGUMENTS=.*#ARGUMENTS=--chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n --alternate-chain-spec=/home/hived/datadir/blockchain/alternate-chain-spec.json#" "${ENV_PATH}"
rm -f /tmp/head_block_number
./scripts/start-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser
./scripts/wait-for-stack.sh --env-files="${ENV_PATH}" --project-name=mirrornet-api-stack --profiles=denser