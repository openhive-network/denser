#!/bin/bash

set -e

echo "Performing additional configuration..."

if [[ "${USE_ALTERNATE_HAPROXY_CONFIG:-}" == "true" ]]; then
  echo "Using alternate HAproxy configuration"
  sed -i.bak -e 's#source: ./haproxy/haproxy.cfg#source: ./haproxy/haproxy-alternate.cfg#' /haf-api-node/haproxy.yaml
fi

if [[ -n "${FAKETIME:-}" ]]; then
  echo "Enabling faketime for HAF"
  mv /haf-api-node/faketime.yaml /haf-api-node/compose.override.yml
fi

echo "Copying config.ini file..."
cp "${CI_PROJECT_DIR:?}/stack/mirrornet_haf_config.ini" "${REPLAY_DIRECTORY:?}/config.ini"

if [[ -e "${BLOCK_LOG_SOURCE_DIR:?}/alternate-chain-spec.json" ]]
then
    echo "Copying alternate-chain-spec.json file..." 
    cp "${BLOCK_LOG_SOURCE_DIR:?}/alternate-chain-spec.json" "${REPLAY_DIRECTORY:?}/blockchain/alternate-chain-spec.json"
    chown 1000:100 "${REPLAY_DIRECTORY:?}/blockchain/alternate-chain-spec.json"
fi

echo "Inspecting replay directory..."
ls -lah "${REPLAY_DIRECTORY:?}"
ls -lah "${REPLAY_DIRECTORY:?}/blockchain"
cat "${REPLAY_DIRECTORY:?}/blockchain/alternate-chain-spec.json"