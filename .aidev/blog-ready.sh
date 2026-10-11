#!/bin/sh
# Readiness probe of the blog in AIDEV's dev stack (.aidev/dev-stack.compose.yml,
# service `blog-ready`): healthy once BASE answers and the routes specs open
# first have been compiled, and from then on while the blog answers HTTP.
#
#   sh .aidev/blog-ready.sh http://127.0.0.1:3000
#
# `next dev` compiles a route on its first request, and a cold compile of the
# blog's pages takes longer than a spec's navigation timeout. Requesting them
# here moves that cost into the stack's readiness budget. The routes are the ones
# the default recording (ssrChecks) answers: a feed, a post and a profile — each
# stands for its dynamic segment, so other feeds/posts/profiles reuse the chunk.
#
# The first warm-up of the stack needs /trending to answer 200 (a broken install
# serves it as a 500, #995); any HTTP status of the other routes counts as
# compiled. After that only an unreachable blog is unhealthy: /trending's status
# then follows the fixture proxy (another recording, or a relay left pointing at
# an interrupted spec run's proxy, answers 503), not whether the blog serves.
#
# The blog writes a new id to .next/aidev-dev-boot each time next dev starts
# (.aidev/blog-serve-dev.sh); a server restarted in place is warmed again.
set -eu

base="${1:-http://127.0.0.1:3000}"
warmed=/tmp/blog-ready-warmed
boot="$(cat apps/blog/.next/aidev-dev-boot 2> /dev/null || true)"

status() {
    node -e "fetch(process.argv[1],{redirect:'manual',signal:AbortSignal.timeout(280000)}).then(r=>console.log(r.status),()=>console.log('unreachable'))" "$base$1"
}

code=$(status /trending)
if [ "$code" = unreachable ]; then
    echo "blog-ready: /trending unreachable" >&2
    exit 1
fi

# Once this server is warmed, a check is only the request above.
[ -f "$warmed" ] && [ "$(cat "$warmed")" = "$boot" ] && exit 0

if [ ! -f "$warmed" ] && [ "$code" != 200 ]; then
    echo "blog-ready: /trending answered $code, not 200" >&2
    exit 1
fi

for route in /test/@guest4test1/test-ako-post /@guest4test1 /trending/hive-160391 /submit.html; do
    code=$(status "$route")
    if [ "$code" = unreachable ]; then
        echo "blog-ready: $route unreachable" >&2
        exit 1
    fi
    echo "blog-ready: $route -> $code"
done

echo "$boot" > "$warmed"
