#!/bin/bash

set -e
      
"${CI_PROJECT_DIR:?}/haf/scripts/ci-helpers/export-data-from-docker-image.sh" \
    "${EXTENDED_BLOCK_LOG_IMAGE:?}" \
    "${BLOCK_LOG_DIRECTORY:?}" \
    --image-path=/blockchain/

sudo chown -R hived:users "${BLOCK_LOG_DIRECTORY:?}"
sudo chmod 777 "${BLOCK_LOG_DIRECTORY:?}"
sudo chmod -R g+w "${BLOCK_LOG_DIRECTORY:?}"

ls -lah "${BLOCK_LOG_DIRECTORY:?}"