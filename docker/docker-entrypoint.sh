#!/bin/sh

set -e

echo "Testing for presence of config variables..."
test -n "$API_NODE_ENDPOINT"

echo "Configuring app..."
find /app/.next \( -type d -name .git -prune \) -o -type f -print0 | xargs -0 sed -i "s#API_NODE_ENDPOINT_PLACEHOLDER#$API_NODE_ENDPOINT#g"

echo "Running app..." 
exec "$@"