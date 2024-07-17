#!/bin/bash

set -e

echo "Performing additional configuration..."
cp "${CI_PROJECT_DIR:?}/stack/mirrornet_haf_config.ini" "${REPLAY_DIRECTORY:?}/config.ini"