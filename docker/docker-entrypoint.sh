#!/bin/sh

set -e

# point default .env file
ln -sf "${APP_ENV_FILE_PATH}" /app${TURBO_APP_PATH}/.env

echo "Contents of /app${TURBO_APP_PATH}/.env"
cat "/app${TURBO_APP_PATH}/.env"

echo "Setting environment..."
DIR=$(pwd)
cd ".${TURBO_APP_PATH}"
react-env
cd "$DIR"

echo "Running app..."
exec "$@"
