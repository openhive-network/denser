#!/usr/bin/env bash
# Check the routes of caddy/Caddyfile.routes: caddy/ is loaded, as a session stack
# loads it (Caddyfile.session, plain HTTP), into a throwaway caddy container. Each
# path in expectations must redirect (302) to the Location given, and each in
# robots_paths must answer 200, text/plain, with robots_body. Needs docker and the
# caddy:2.10.0-alpine image compose.session.yml runs.
#
#   ./test-routes.sh
#
# Exit: 0 every path answers as expected; 1 one did not, or caddy refused the config.
set -euo pipefail
cd "$(dirname "$0")"

image=caddy:2.10.0-alpine
expectations=(
    '/proposals /wallet/proposals'
    '/~witnesses /wallet/~witnesses'
    '/%7Ewitnesses /wallet/%7Ewitnesses'
    '/market /wallet/market'
    '/@guest4test/permissions /wallet/@guest4test/permissions'
    '/@guest4test/wallet /wallet/@guest4test/wallet'
    '/@guest4test/transfers /wallet/@guest4test/transfers'
    '/%40guest4test/transfers /wallet/%40guest4test/transfers'
    '/@guest4test/delegations?x=1 /wallet/@guest4test/delegations?x=1'
    '/@guest4test /blog/@guest4test'
    '/@guest4test/posts /blog/@guest4test/posts'
    '/@guest4test/communities /blog/@guest4test/communities'
    '/@guest4test/a-post /blog/@guest4test/a-post'
    '/hive-163772/@guest4test/transfers /blog/hive-163772/@guest4test/transfers'
    '/trending /blog/trending'
    '/search?q=x /blog/search?q=x'
    '/ /blog'
)
robots_paths=(/robots.txt /blog/robots.txt /wallet/robots.txt)
robots_body=$'User-agent: *\nDisallow: /'

name="denser-test-routes-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
# Copied in rather than bind-mounted: the docker daemon may not see this directory.
docker create --name "$name" -p 127.0.0.1::80 -e DENSER_STATIC_FROM=next \
    "$image" caddy run --config /etc/caddy/Caddyfile.session --adapter caddyfile >/dev/null
docker cp caddy/. "$name:/etc/caddy/"
docker start "$name" >/dev/null
port=$(docker port "$name" 80/tcp | head -1 | sed 's/.*://')

for _ in $(seq 50); do
    curl -s -o /dev/null "http://127.0.0.1:$port/" && break
    if [ "$(docker inspect -f '{{.State.Running}}' "$name")" != true ]; then
        docker logs "$name" 2>&1 | tail -20
        exit 1
    fi
    sleep 0.2
done

failed=0
for expectation in "${expectations[@]}"; do
    read -r path want <<<"$expectation"
    got=$(curl -s -o /dev/null -w '%{http_code} %header{location}' "http://127.0.0.1:$port$path")
    if [ "$got" = "302 $want" ]; then
        echo "ok   $path -> $want"
    else
        echo "FAIL $path: want 302 $want, got $got"
        failed=1
    fi
done
for path in "${robots_paths[@]}"; do
    response=$(curl -s -w '\n%{http_code} %{content_type}' "http://127.0.0.1:$port$path")
    status=${response##*$'\n'}
    body=${response%$'\n'*}
    if [ "$status" = "200 text/plain; charset=utf-8" ] && [ "$body" = "$robots_body" ]; then
        echo "ok   $path -> robots.txt"
    else
        echo "FAIL $path: want 200 text/plain disallow-all, got $status: $body"
        failed=1
    fi
done
exit "$failed"
