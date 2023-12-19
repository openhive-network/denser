#!/bin/sh

set -e

echo "Setting environment..."
DIR=$(pwd)
cd ".${TURBO_APP_PATH}"
react-env
cd "$DIR"

echo "Running app..."
exec "$@"
