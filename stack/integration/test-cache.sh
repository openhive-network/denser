#!/usr/bin/env bash
# Check the shared HTML cache (varnish/default.vcl, compose.cache.yml): which requests
# are stored, bypassed and shared, from its X-Cache header and the bodies it returns.
# Then the bot gate (varnish/bot-gate.vcl, caddy/Caddyfile.bot-gate): this client is
# a LAN address, so it sees real pages, and with X-Gate-Test: 1 the challenge, the
# fingerprint's 403 and, on the throwaway stack only, the rate limit's 429 and the
# pages still served while the gate is stopped.
#
#   ./test-cache.sh              # a throwaway caddy (caddy/, Caddyfile.session with
#                                # the gate on), varnish and the gate in front of a
#                                # stub blog and wallet that mark every page public
#                                # and echo what they were sent
#   ./test-cache.sh BASE_URL     # a running stack with the cache, e.g.
#                                # https://denser.discuss.peerverity.info; with
#                                # DENSER_BOT_GATE=off in the environment, one
#                                # without the gate
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

# fetch PATH [CURL ARGS...]: sets status, x_cache, age, cache_control, retry_after and body.
fetch() {
    local path=$1 response headers
    shift
    response=$(curl -s -D - "$@" "$base$path" | tr -d '\r')
    headers=${response%%$'\n\n'*}
    body=${response#*$'\n\n'}
    status=$(sed -n '1s/^HTTP\/[0-9.]* \([0-9]*\).*/\1/p' <<< "$headers")
    x_cache=$(sed -n 's/^[Xx]-[Cc]ache: //p' <<< "$headers" | tail -n 1)
    age=$(sed -n 's/^[Aa]ge: //p' <<< "$headers" | tail -n 1)
    cache_control=$(sed -n 's/^[Cc]ache-[Cc]ontrol: //p' <<< "$headers" | tail -n 1)
    retry_after=$(sed -n 's/^[Rr]etry-[Aa]fter: //p' <<< "$headers" | tail -n 1)
}

start_stub_stack() {
    local tag=denser-test-cache-$$ dir
    network=$tag
    containers=("$tag-blog" "$tag-caddy" "$tag-varnish" "$tag-bot-gate")
    trap 'docker rm -f "${containers[@]}" > /dev/null 2>&1 || true; docker network rm "$network" > /dev/null 2>&1 || true' EXIT
    docker network create "$network" > /dev/null

    # The stub blog, and wallet: every page public, with the page's own s-maxage, and a
    # body naming the render, the URL and the cookies it got. /blog/sets-cookie sets a cookie and
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
    docker create --name "$tag-blog" --network "$network" --network-alias blog --network-alias wallet \
        caddy:2.10.0-alpine caddy run --config /etc/caddy/Caddyfile --adapter caddyfile > /dev/null
    docker cp "$dir/Caddyfile" "$tag-blog:/etc/caddy/Caddyfile"
    rm -rf "$dir"

    # Copied in rather than bind-mounted: the docker daemon may not see this directory.
    docker create --name "$tag-caddy" --network "$network" --network-alias caddy -p 127.0.0.1::80 \
        -e DENSER_STATIC_FROM=next -e DENSER_BLOG_UPSTREAM=varnish:80 -e DENSER_BOT_GATE=on \
        caddy:2.10.0-alpine caddy run --config /etc/caddy/Caddyfile.session --adapter caddyfile > /dev/null
    docker cp caddy/. "$tag-caddy:/etc/caddy/"
    docker create --name "$tag-varnish" --network "$network" --network-alias varnish \
        -e VARNISH_SIZE=64M varnish:7.7-alpine > /dev/null
    docker cp varnish/. "$tag-varnish:/etc/varnish/"
    docker create --name "$tag-bot-gate" --network "$network" --network-alias bot-gate \
        -e VARNISH_SIZE=16M -e VARNISH_VCL_FILE=/etc/varnish/bot-gate.vcl varnish:7.7-alpine > /dev/null
    docker cp varnish/. "$tag-bot-gate:/etc/varnish/"

    docker start "$tag-blog" "$tag-caddy" "$tag-bot-gate" > /dev/null
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
fetch "$page" -H 'Cookie: denser_human=1'
check "the gate's cookie: same object" "HIT $first" "$x_cache $body"

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
# The bot gate. Every X-Gate-Test request below that gets no 403 counts toward this
# address's 60 page documents a minute.
if [ "${DENSER_BOT_GATE:-on}" != off ]; then
    gate=(-H 'X-Gate-Test: 1')
    human=(-H 'Cookie: denser_human=1')
    crawler=(-H 'Sec-Fetch-Site: none' -H "Referer: $base")
    challenge_marker='document.cookie="denser_human=1'

    fetch "$page"
    holds "gate: a LAN address gets the page" "$status" = 200 -a "${body#*"$challenge_marker"}" = "$body"
    fetch "$page" "${crawler[@]}"
    check "gate: a LAN address with the crawler's headers gets the page" 200 "$status"
    fetch "/wallet/@guest4test/transfers?gatetest=$run"
    holds "gate: a LAN address gets a wallet page" "$status" = 200 -a "${body#*"$challenge_marker"}" = "$body"

    fetch "$page" "${gate[@]}" "${crawler[@]}"
    check "gate: the crawler's headers: 403 no-store" "403 no-store" "$status $cache_control"
    fetch "$page" "${gate[@]}" "${human[@]}" -H 'Sec-Fetch-Site: none' -H "Referer: $base/blog/trending"
    check "gate: typed navigation with a page Referer passes" 200 "$status"

    fetch "$page" "${gate[@]}"
    check "gate: anonymous, no cookie: challenge, no-store" "200 no-store" "$status $cache_control"
    holds "gate: the challenge sets denser_human and is noindex" "${body#*"$challenge_marker"}" != "$body" \
        -a "${body#*'content="noindex"'}" != "$body"
    fetch "/wallet/@guest4test/transfers?gatetest=$run" "${gate[@]}"
    holds "gate: a wallet page: challenge" "${body#*"$challenge_marker"}" != "$body"
    fetch "$page" "${gate[@]}" "${human[@]}"
    check "gate: denser_human=1: the cached page" "200 HIT $first" "$status $x_cache $body"
    fetch "$page" "${gate[@]}" -H 'Cookie: denser_session=x'
    check "gate: a session cookie passes" 200 "$status"
    fetch "/blog/api/health" "${gate[@]}"
    check "gate: API route not gated" "200 ok" "$status $body"
    fetch "$page" "${gate[@]}" -H 'RSC: 1'
    check "gate: RSC request not gated" "200 BYPASS" "$status $x_cache"
    fetch "/blog/robots.txt" "${gate[@]}"
    check "gate: robots.txt not gated" 200 "$status"
    fetch "/blog/trending?_rsc=abc" "${gate[@]}"
    check "gate: _rsc request not gated" 200 "$status"
    fetch "/status" "${gate[@]}"
    check "gate: /status not gated" 302 "$status"
    fetch "$page" "${gate[@]}" -X POST
    check "gate: POST not gated" 200 "$status"
fi

if $stub && [ "${DENSER_BOT_GATE:-on}" != off ]; then
    # 5 counted above (2 challenges, 3 passed page documents); fill the minute's 60.
    for _ in $(seq 55); do
        fetch "$page" "${gate[@]}" "${human[@]}"
        [ "$status" = 200 ] || break
    done
    check "gate: the 60th page document in a minute" 200 "$status"
    fetch "$page" "${gate[@]}" "${human[@]}"
    check "gate: the 61st: 429, Retry-After 300, no-store" "429 300 no-store" "$status $retry_after $cache_control"
    fetch "/blog/api/health" "${gate[@]}"
    check "gate: rate-limited, API routes still pass" 200 "$status"
    fetch "$page" "${human[@]}"
    check "gate: rate-limited, the LAN exemption still holds" 200 "$status"

    # The gate down: page documents go on to their routes (Caddyfile.bot-gate's
    # fail-open upstream), and caddy's log names each.
    docker stop "$network-bot-gate" > /dev/null
    started=$(date +%s%N)
    fetch "$page" "${gate[@]}"
    elapsed_ms=$((($(date +%s%N) - started) / 1000000))
    check "gate down: the cached page, not the challenge" "200 HIT $first" "$status $x_cache $body"
    holds "gate down: answered within 1 s (${elapsed_ms} ms)" "$elapsed_ms" -lt 1000
    fetch "/wallet/@guest4test/transfers?gatetest=$run" "${gate[@]}"
    holds "gate down: a wallet page" "$status" = 200 -a "${body#*"$challenge_marker"}" = "$body"
    fetch "/blog/error?cachetest=$run" "${gate[@]}"
    check "gate down: the app's own 500 still reaches the client" 500 "$status"
    holds "gate down: caddy logs the fail-open" \
        "$(docker logs "$network-caddy" 2>&1 | grep -c 'http.log.access.bot-gate-fail-open')" -ge 3

    # Back up, its rate counts gone: the challenge once fail_duration has run out.
    docker start "$network-bot-gate" > /dev/null
    for _ in $(seq 60); do
        fetch "$page" "${gate[@]}"
        [ "${body#*"$challenge_marker"}" != "$body" ] && break
        sleep 0.5
    done
    holds "gate back: the challenge again" "${body#*"$challenge_marker"}" != "$body"

    # The gate hung: after the 1 s response timeout, the page.
    docker pause "$network-bot-gate" > /dev/null
    started=$(date +%s%N)
    fetch "$page" "${gate[@]}"
    elapsed_ms=$((($(date +%s%N) - started) / 1000000))
    docker unpause "$network-bot-gate" > /dev/null
    check "gate hung: the cached page" "200 HIT $first" "$status $x_cache $body"
    holds "gate hung: answered within 2 s (${elapsed_ms} ms)" "$elapsed_ms" -lt 2000
fi
exit "$failed"
