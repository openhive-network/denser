#!/bin/bash

set -e

echo "Performing additional configuration..."

echo "Copying config.ini file..."
cp "${CI_PROJECT_DIR:?}/stack/mirrornet_haf_config.ini" "${REPLAY_DIRECTORY:?}/config.ini"

if [[ -e "${BLOCK_LOG_SOURCE_DIR:?}/alternate-chain-spec.json" ]]
then
    echo "Copying alternate-chain-spec.json file..." 
    cp "${BLOCK_LOG_SOURCE_DIR:?}/alternate-chain-spec.json" "${REPLAY_DIRECTORY:?}/blockchain/alternate-chain-spec.json"
fi