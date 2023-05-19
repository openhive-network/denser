#!/bin/sh

set -e

react-env

echo "Running app..."
exec "$@"
