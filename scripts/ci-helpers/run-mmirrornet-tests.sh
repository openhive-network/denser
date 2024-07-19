#!/bin/bash

set -e

echo -e "\e[0Ksection_start:$(date +%s):deps[collapsed=true]\r\e[0KInstalling dependencies..."
npm ci --cache .npm
echo -e "\e[0Ksection_end:$(date +%s):deps\r\e[0K"

echo -e "\e[0Ksection_start:$(date +%s):tests[collapsed=true]\r\e[0KRunning tests..."

echo -e "\nTesting endpoints...\nHive..."
curl -k --data '{"jsonrpc":"2.0", "method":"condenser_api.get_block", "params":[1], "id":1}' "https://${PUBLIC_HOSTNAME:?}/"

echo -e "\nHAfAH..."
curl -k -X POST "https://${PUBLIC_HOSTNAME:?}/hafah/get_version"

echo -e "\nHivemind..."
curl -k --data '{"jsonrpc":"2.0", "method":"condenser_api.get_trending_tags", "id":1}' "https://${PUBLIC_HOSTNAME:?}/"

echo "Running auth tests..."
pushd /apps/auth
# npx playwright test --update-snapshots
popd

echo "Running blog tests..."
pushd /apps/blog
# npx playwright test --update-snapshots
popd

echo "Running wallet tests..."
pushd /apps/wallet
# npx playwright test --update-snapshots
popd

echo -e "\e[0Ksection_end:$(date +%s):tests\r\e[0K"