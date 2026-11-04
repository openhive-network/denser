#!/usr/bin/env bash
# Print the control token of the live dev stack's fixture proxy
# (.aidev/dev-stack.compose.yml), which its /__aidev/ requests other than
# `GET /__aidev/status` must carry as `x-aidev-fixture-token`:
#
#   curl -s -X PUT -H "x-aidev-fixture-token: $(.aidev/dev-stack-token.sh)" \
#     "$DENSER_DEV_FIXTURE_URL/__aidev/fixture-set/<name>"
#
# The proxy generates it at start, so it changes with every restart. Exits 1 when
# the stack's proxy has none: a stack started from a tree older than the token
# takes control requests without one until it is restarted.
#
# Needs: docker and the stack's compose project (DENSER_DEV_STACK_PROJECT, as for
# .aidev/dev-stack-spec.sh).
set -euo pipefail

project="${DENSER_DEV_STACK_PROJECT:-${AIDEV_DEV_STACK_PROJECT:?DENSER_DEV_STACK_PROJECT: the dev stack compose project}}"
proxy="$(docker ps -q --filter "label=com.docker.compose.project=$project" --filter label=com.docker.compose.service=fixture-proxy | head -1)"
[ -n "$proxy" ] || { echo "dev-stack-token: no running fixture-proxy in compose project $project" >&2; exit 2; }
docker exec "$proxy" sh -c 'cat "$AIDEV_FIXTURE_TOKEN_FILE"' 2> /dev/null
