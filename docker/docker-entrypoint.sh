#!/bin/sh

set -e

echo "Setting environment..."
DIR=$(pwd)
cd ".${TURBO_APP_PATH}"
react-env
cd "$DIR"

if [ -n "${FAKETIME:-}" ]; then
  echo "Enabling faketime..."
  export FAKETIME
  export LD_PRELOAD="/lib/faketime.so"
  export FAKETIME_DONT_FAKE_MONOTONIC=1
  export FAKETIME_DONT_RESET=1
  export TZ="UTC"
fi

echo "Running app..."
exec "$@"
