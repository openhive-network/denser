#!/usr/bin/env bash
# Check the shared HTML cache (varnish/default.vcl, compose.cache.yml): which requests
# are stored, bypassed and shared, from its X-Cache header and the bodies it returns.
#
#   ./test-cache.sh              # a throwaway caddy (caddy/, Caddyfile.session) and
#                                # varnish in front of a stub blog that marks every
#                                # page public and echoes what it was sent
#   ./test-cache.sh BASE_URL     # a running stack with the cache, e.g.
#                                # https://denser.discuss.peerverity.info
#
# Against a real blog a page's body is unique per render (its CSP nonce), so "same
# body" means served from one cached object. Each run uses a fresh query value, so
# its first request is never already cached. The checks of a non-200 and of a
# Set-Cookie response need the stub's pages and run only on the throwaway stack.
# Needs docker and the caddy:2.10.0-alpine and varnish:7.7-alpine images for that.
#
# Exit: 0 every check passed; 1 one failed, or the throwaway stack did not start.
set -euo pipefail
cd "$(dirname "$0")"

failed=0
check() { # check NAME WANT GOT
    if [ "$2" = "$3" ]; then
        echo "ok   $1"
    else
        echo "FAIL $1: want $2, got $3"
        failed=1
    fi
}

holds() { # holds NAME TEST-ARGS...
    local name=$1
    shift
    if test "$@"; then echo "ok   $name"; else echo "FAIL $name"; failed=1; fi
}

# fetch PATH [CURL ARGS...]: sets status, x_cache, age and body.
fetch() {
    local path=$1 response headers
    shift
    response=$(curl -s -D - "$@" "$base$path" | tr -d '\r')
    headers=${response%%$'\n\n'*}
    body=${response#*$'\n\n'}
    status=$(sed -n '1s/^HTTP\/[0-9.]* \([0-9]*\).*/\1/p' <<< "$headers")
    x_cache=$(sed -n 's/^[Xx]-[Cc]ache: //p' <<< "$headers" | tail -n 1)
    age=$(sed -n 's/^[Aa]ge: //p' <<< "$headers" | tail -n 1)
}

start_stub_stack() {
    local tag=denser-test-cache-$$ dir
    network=$tag
    containers=("$tag-blog" "$tag-caddy" "$tag-varnish")
    trap 'docker rm -f "${containers[@]}" > /dev/null 2>&1 || true; docker network rm "$network" > /dev/null 2>&1 || true' EXIT
    docker network create "$network" > /dev/null

    # The stub blog: every page public, with the page's own s-maxage, and a body naming
    # the render, the URL and the cookies it got. /blog/sets-cookie sets a cookie and
    # /blog/error is a 500; both still say public.
    dir=$(mktemp -d)
    cat > "$dir/Caddyfile" <<'STUB'
:80 {
	respond /blog/api/health "ok" 200
	header Content-Type "text/html; charset=utf-8"
	header Cache-Control "public, s-maxage=30, stale-while-revalidate=60, stale-if-error=300"
	header /blog/sets-cookie Set-Cookie "stub=1; Path=/"
	respond /blog/error "render={http.request.uuid}" 500
	respond "render={http.request.uuid} uri={http.request.uri} cookie={http.request.header.Cookie}" 200
}
STUB
    docker create --name "$tag-blog" --network "$network" --network-alias blog \
        caddy:2.10.0-alpine caddy run --config /etc/caddy/Caddyfile --adapter caddyfile > /dev/null
    docker cp "$dir/Caddyfile" "$tag-blog:/etc/caddy/Caddyfile"
    rm -rf "$dir"

    # Copied in rather than bind-mounted: the docker daemon may not see this directory.
    docker create --name "$tag-caddy" --network "$network" --network-alias caddy -p 127.0.0.1::80 \
        -e DENSER_STATIC_FROM=next -e DENSER_BLOG_UPSTREAM=varnish:80 \
        caddy:2.10.0-alpine caddy run --config /etc/caddy/Caddyfile.session --adapter caddyfile > /dev/null
    docker cp caddy/. "$tag-caddy:/etc/caddy/"
    docker create --name "$tag-varnish" --network "$network" --network-alias varnish \
        -e VARNISH_SIZE=64M varnish:7.7-alpine > /dev/null
    docker cp varnish/. "$tag-varnish:/etc/varnish/"

    docker start "$tag-blog" "$tag-caddy" > /dev/null
    # varnish resolves "caddy" when it loads the VCL.
    docker start "$tag-varnish" > /dev/null
    base=http://127.0.0.1:$(docker port "$tag-caddy" 80/tcp | head -1 | sed 's/.*://')

    for _ in $(seq 50); do
        [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/blog/api/health")" = 200 ] && return 0
        for c in "${containers[@]}"; do
            if [ "$(docker inspect -f '{{.State.Running}}' "$c")" != true ]; then
                echo "$c exited:" >&2
                docker logs "$c" 2>&1 | tail -20 >&2
                exit 1
            fi
        done
        sleep 0.2
    done
    echo "the throwaway stack did not answer $base/blog/api/health" >&2
    exit 1
}

stub=false
if [ -n "${1:-}" ]; then
    base=${1%/}
else
    stub=true
    start_stub_stack
fi

run=$$-$RANDOM
page="/blog/trending?cachetest=$run"

fetch "$page"
check "anonymous page, first request" "200 MISS" "$status $x_cache"
first=$body
fetch "$page"
check "anonymous page, repeated" "200 HIT" "$status $x_cache"
check "repeated: same object" "$first" "$body"
holds "repeated: Age header" -n "$age"

fetch "$page" -H 'Cookie: observer=guest4test'
check "observer cookie" BYPASS "$x_cache"
fetch "$page" -H 'Cookie: blog_session=x'
check "session cookie" BYPASS "$x_cache"
fetch "$page" -H 'RSC: 1'
check "RSC header" BYPASS "$x_cache"
fetch "$page" -H 'Next-Router-Prefetch: 1'
check "Next-Router-Prefetch header" BYPASS "$x_cache"
fetch "$page&_rsc=abc"
check "_rsc query" BYPASS "$x_cache"

fetch "$page&utm_source=x&fbclid=y"
check "campaign parameters: same object" "HIT $first" "$x_cache $body"
fetch "/blog/trending?gclid=z&cachetest=$run&utm_medium=x"
check "campaign parameters around the query: same object" "HIT $first" "$x_cache $body"
fetch "$page" -H 'Cookie: theme=dark; NEXT_LOCALE=xx; nsfw=1'
check "other cookies and an unknown locale: same object" "HIT $first" "$x_cache $body"

fetch "$page" -H 'Cookie: NEXT_LOCALE=pl'
holds "NEXT_LOCALE=pl: not the en object" "$body" != "$first"
pl=$body
pl_cache=$x_cache

if $stub; then
    fetch "/blog/trending?b=2&a=1&cachetest=$run"
    check "reordered query, first" MISS "$x_cache"
    sorted=$body
    fetch "/blog/trending?a=1&cachetest=$run&b=2"
    check "reordered query: same object" "HIT $sorted" "$x_cache $body"

    check "en: the blog got no cookie" "cookie=" "${first##* }"
    check "NEXT_LOCALE=pl: own object, first" MISS "$pl_cache"
    check "NEXT_LOCALE=pl: the blog got only the locale" "cookie=NEXT_LOCALE=pl" "${pl##* }"
    fetch "$page" -H 'Cookie: theme=dark; NEXT_LOCALE=pl'
    check "NEXT_LOCALE=pl: own object, repeated" "HIT $pl" "$x_cache $body"

    fetch "/blog/sets-cookie?cachetest=$run"
    check "Set-Cookie response, first" BYPASS "$x_cache"
    set_cookie_first=$body
    fetch "/blog/sets-cookie?cachetest=$run"
    check "Set-Cookie response is not stored" BYPASS "$x_cache"
    holds "Set-Cookie response: rendered again" "$body" != "$set_cookie_first"

    fetch "/blog/error?cachetest=$run"
    fetch "/blog/error?cachetest=$run"
    check "500 response is not stored" "500 BYPASS" "$status $x_cache"

    fetch "/blog/api/health"
    check "API route" BYPASS "$x_cache"
    fetch "$page" -X POST
    check "POST" BYPASS "$x_cache"
fi
exit "$failed"
