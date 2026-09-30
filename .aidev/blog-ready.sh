#!/bin/sh
# Readiness probe of the blog in AIDEV's dev stack (.aidev/dev-stack.compose.yml,
# service `blog-ready`): healthy once BASE answers and the routes specs open
# first have been compiled.
#
#   sh .aidev/blog-ready.sh http://127.0.0.1:3000
#
# `next dev` compiles a route on its first request, and a cold compile of the
# blog's pages takes longer than a spec's navigation timeout. Requesting them
# here moves that cost into the stack's readiness budget. The routes are the ones
# the default recording (ssrChecks) answers: a feed, a post and a profile — each
# stands for its dynamic segment, so other feeds/posts/profiles reuse the chunk.
#
# Any HTTP status counts as compiled (a route whose data the current recording
# lacks renders an error page, still compiled); only /trending must answer 200.
set -eu

base="${1:-http://127.0.0.1:3000}"
warmed=/tmp/blog-ready-warmed

status() {
    node -e "fetch(process.argv[1],{redirect:'manual',signal:AbortSignal.timeout(280000)}).then(r=>console.log(r.status),()=>console.log('unreachable'))" "$base$1"
}

code=$(status /trending)
if [ "$code" != 200 ]; then
    echo "blog-ready: /trending answered $code, not 200" >&2
    exit 1
fi

# Once warmed, a check is only the request above.
[ -f "$warmed" ] && exit 0

for route in /test/@guest4test1/test-ako-post /@guest4test1 /trending/hive-160391 /submit.html; do
    code=$(status "$route")
    if [ "$code" = unreachable ]; then
        echo "blog-ready: $route unreachable" >&2
        exit 1
    fi
    echo "blog-ready: $route -> $code"
done

touch "$warmed"
