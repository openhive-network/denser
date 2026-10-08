#!/usr/bin/env bash
# The integration site's follow-mode stack on this checkout, for a session: blog and
# wallet production builds behind caddy's /blog and /wallet routing, on one loopback
# port, against the live Hive API. The follower rebuilds what a commit changes (the
# site's rules, follow/follow.sh) once the checkout moves, so run it on a checkout
# that follows the session branch. See README.md, "A session's stack".
#
#   stack/integration/session-stack.sh up       # start, or apply changed settings
#   stack/integration/session-stack.sh status   # services and status/deployed.json
#   stack/integration/session-stack.sh logs [SERVICE...]
#   stack/integration/session-stack.sh down
#
# Settings (environment):
#   DENSER_SESSION_PORT  the loopback port (default: a free one, kept in status/)
#   DENSER_NETWORK       mainnet (default) or mirrornet; see networks/
#   DENSER_SOURCE_DIR    the checkout as the docker daemon sees it (default:
#                        $DENSER_DEV_CHECKOUT, $AIDEV_HOST_CHECKOUT, or this checkout)
#   DENSER_SESSION_PROJECT  the compose project (default: one per checkout)
set -euo pipefail
cd "$(dirname "$0")"

repo=$(cd ../.. && pwd)
mkdir -p status releases

port_file=status/.session-port
if [ -z "${DENSER_SESSION_PORT:-}" ]; then
    DENSER_SESSION_PORT=$(cat "$port_file" 2>/dev/null || python3 -c '
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])')
fi
echo "$DENSER_SESSION_PORT" > "$port_file"

# Generated once per checkout: the stack only listens on loopback, and a new value
# on every `up` would log everyone out.
cookie_file=status/.session-cookie-password
[ -s "$cookie_file" ] || (umask 077 && python3 -c 'import secrets; print(secrets.token_hex(32))' > "$cookie_file")

export DENSER_SESSION_PORT
export DENSER_SOURCE_DIR=${DENSER_SOURCE_DIR:-${DENSER_DEV_CHECKOUT:-${AIDEV_HOST_CHECKOUT:-$repo}}}
export DENSER_SOURCE_BRANCH=${DENSER_SOURCE_BRANCH:-$(git -C "$repo" symbolic-ref -q --short HEAD || echo checkout)}
export DENSER_UID=${DENSER_UID:-$(stat -c %u "$repo")}
export DENSER_GID=${DENSER_GID:-$(stat -c %g "$repo")}
export DENSER_SERVER_SECRET_COOKIE_PASSWORD=${DENSER_SERVER_SECRET_COOKIE_PASSWORD:-$(cat "$cookie_file")}
# No client uses a session stack's OAuth provider; a throwaway secret registers it.
export DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET=${DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET:-$(python3 -c 'import secrets; print(secrets.token_hex(32))')}
DENSER_FOLLOW_IMAGE=$(follow/environment-image.sh)
export DENSER_FOLLOW_IMAGE
export COMPOSE_FILE=compose.yml:compose.follow.yml:compose.session.yml
export COMPOSE_PROFILES=watch
export COMPOSE_PROJECT_NAME=${DENSER_SESSION_PROJECT:-denser-session-$(printf %s "$DENSER_SOURCE_DIR" | sha256sum | cut -c1-8)}
# compose.yml's site settings, which compose.session.yml replaces.
export SITE_HOST=127.0.0.1:$DENSER_SESSION_PORT
export CLOUDFLARE_API_TOKEN=unused-by-session-stacks
export PROXY_NETWORK=bridge

url=http://127.0.0.1:$DENSER_SESSION_PORT

case "${1:-}" in
    up)
        docker image inspect "$DENSER_FOLLOW_IMAGE" > /dev/null 2>&1 || docker pull -q "$DENSER_FOLLOW_IMAGE" > /dev/null
        docker compose up -d --remove-orphans
        echo "session stack $COMPOSE_PROJECT_NAME: $url/blog, $url/wallet, $url/status/deployed.json"
        echo "The first builds take several minutes; follow them with: $0 logs follower"
        ;;
    status)
        docker compose ps
        python3 - status/deployed.json <<'EOF'
import json, sys
try:
    deployed = json.load(open(sys.argv[1]))
except (OSError, ValueError):
    sys.exit("no status/deployed.json yet: the follower writes it after its first pass")
for app, svc in (deployed.get("services") or {}).items():
    failed = svc.get("failed") or {}
    note = f" (failed {failed.get('stage')}: {failed.get('log')})" if failed else ""
    print(f"{app}: {svc.get('status')} {svc.get('release') or '-'}{note}")
EOF
        echo "$url/blog"
        ;;
    logs)
        shift
        docker compose logs --tail 100 "$@"
        ;;
    down)
        docker compose down
        ;;
    *)
        echo "usage: $0 up | status | logs [SERVICE...] | down" >&2
        exit 64
        ;;
esac
