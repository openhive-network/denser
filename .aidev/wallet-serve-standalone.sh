#!/usr/bin/env bash
# Command of the test stack's wallet-live (.aidev/test-stack.compose.yml): serve
# the checkout's wallet production build (apps/wallet/.next/standalone, from
# wallet_fixture, .aidev/run-wallet-fixture-e2e.sh, NEXT_PUBLIC_BASE_PATH=/wallet)
# with this container's REACT_APP_* environment, on 127.0.0.1:4001 under
# /wallet, behind .aidev/base-path-front.mjs on :4000, which also answers the
# root paths the live specs open.
#
# As .aidev/blog-serve-standalone.sh: the server runs from a private copy of the
# read-only checkout, with static and public copied in and react-env writing
# __ENV.js there, and waits for the build's completion marker; a build that
# never completes leaves the service up but serving nothing, and the suite
# reports the missing build.
set -euo pipefail

wallet=/work/apps/wallet
marker="$wallet/.next/aidev-build-complete"
srv=/tmp/wallet-standalone
server_port=4001

until [ -f "$marker" ]; do
    [ -n "${waiting:-}" ] || { echo "wallet: waiting for $marker (wallet_fixture builds it)"; waiting=1; }
    sleep 2
done
echo "wallet: serving the build of $(cat "$marker")"

rm -rf "$srv"
cp -a "$wallet/.next/standalone" "$srv"
rm -rf "$srv/apps/wallet/.next/static"
cp -a "$wallet/.next/static" "$srv/apps/wallet/.next/static"
rm -rf "$srv/apps/wallet/public"
cp -a "$wallet/public" "$srv/apps/wallet/public"

node /work/.aidev/base-path-front.mjs --port "${PORT:-4000}" --upstream "$server_port" --base "$REACT_APP_BASE_PATH" &

cd "$srv/apps/wallet"
PORT=$server_port HOSTNAME=127.0.0.1 exec "$wallet/node_modules/.bin/react-env" -- node server.js
