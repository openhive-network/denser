#!/bin/bash

set -e

echo "Current time: $(date)"

echo -e "\e[0Ksection_start:$(date +%s):deps[collapsed=true]\r\e[0KInstalling dependencies..."
# npm config set strict-ssl false
pnpm config set store-dir .pnpm-store
corepack enable
corepack prepare pnpm@9.6.0 --activate
pnpm install --frozen-lockfile
echo -e "\e[0Ksection_end:$(date +%s):deps\r\e[0K"

echo -e "\e[0Ksection_start:$(date +%s):wait[collapsed=true]\r\e[0KWaiting for API to be ready..."
sleep 3m
echo -e "\e[0Ksection_end:$(date +%s):wait\r\e[0K"

echo -e "\e[0Ksection_start:$(date +%s):tests[collapsed=true]\r\e[0KRunning tests..."
echo -e "\nTesting endpoints...\nHive..."
curl -k --data '{"jsonrpc":"2.0", "method":"condenser_api.get_block", "params":[1], "id":1}' --trace-ascii hive-output.log "https://${PUBLIC_HOSTNAME:?}/"

echo -e "\nHAfAH..."
curl -k --data '{"jsonrpc":"2.0", "method":"block_api.get_block", "params":{"block_num":1}, "id":1}' --trace-ascii hafah-output.log "https://${PUBLIC_HOSTNAME:?}/"

echo -e "\nHivemind..."
curl -k --data '{"jsonrpc":"2.0", "method":"condenser_api.get_blog", "params":["steem", 0, 1], "id":1}' --trace-ascii hivemind-output.log "https://${PUBLIC_HOSTNAME:?}/"

function check-log-for-errors() {
    local logfile="$1"
    echo -e "\nChecking file ${logfile} for errors..."
    grep -i '"error"' "${logfile}" && exit 1 || echo "No errors found!"
}
check-log-for-errors hive-output.log
check-log-for-errors hafah-output.log
check-log-for-errors hivemind-output.log

# echo "Running auth tests..."
# pushd apps/auth
# export DENSER_URL=https://caddy-auth
# # npx playwright test --update-snapshots
# popd

echo "Running blog tests..."
pushd apps/blog
export DENSER_URL=https://caddy-blog/
cp "${MIRRORNET_USER_KEYS:?}" test.env
cat test.env
npx playwright test -g "Validate that denserAutoTest3Page subscribes Photography Lovers" --project=chromium --config=playwright.stack-mirrornet-3000.config.ts --update-snapshotspopd

# echo "Running wallet tests..."
# pushd apps/wallet
# export DENSER_URL=https://caddy-wallet
# # npx playwright test --update-snapshots
# popd

echo -e "\e[0Ksection_end:$(date +%s):tests\r\e[0K"
