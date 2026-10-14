#!/bin/sh
# Readiness probe of an app in AIDEV's dev stack (.aidev/dev-stack.compose.yml,
# services `blog-ready` and `wallet-ready`): healthy once BASE answers and the
# routes a visit or a spec opens first have been compiled, and from then on while
# the app answers HTTP.
#
#   sh .aidev/blog-ready.sh http://127.0.0.1:3000 [blog]
#   sh .aidev/blog-ready.sh http://127.0.0.1:4000 wallet
#
# `next dev` compiles a route on its first request, and a cold compile of the
# blog's pages takes longer than a spec's navigation timeout. Requesting them
# here moves that cost into the stack's readiness budget. The blog's routes are
# the ones the default recording (ssrChecks) answers: a feed, a post and a
# profile — each stands for its dynamic segment, so other feeds/posts/profiles
# reuse the chunk. The wallet's are its profile pages and the two pages the
# blog's navigation links to.
#
# The first warm-up of the stack needs the app's CHECK route to answer 200 (a
# broken install serves the blog's /trending as a 500, #995); any HTTP status of
# the other routes counts as compiled. After that only an unreachable app is
# unhealthy: /trending's status then follows the fixture proxy (another
# recording, or a relay left pointing at an interrupted spec run's proxy,
# answers 503), not whether the blog serves.
#
# The app writes a new id to its .next/aidev-dev-boot each time next dev starts
# (.aidev/blog-serve-dev.sh); a server restarted in place is warmed again. An app
# whose next dev waits for its first request (.next/aidev-dev-on-request) is
# healthy without one: the probe would start it.
set -eu

base="${1:-http://127.0.0.1:3000}"
app="${2:-blog}"
case "$app" in
    blog)
        check=/trending
        routes="/test/@guest4test1/test-ako-post /@guest4test1 /trending/hive-160391 /submit.html"
        ;;
    wallet)
        # The rendered pages' status follows the recording (the default one holds
        # no wallet data); /api/health answering 200 says next dev serves.
        check=/wallet/api/health
        routes="/wallet/@gtg/transfers /wallet/proposals /wallet/~witnesses"
        ;;
    *) echo "blog-ready: unknown app '$app' (blog or wallet)" >&2; exit 2 ;;
esac
warmed="/tmp/$app-ready-warmed"
boot="$(cat "apps/$app/.next/aidev-dev-boot" 2> /dev/null || true)"
[ -f "apps/$app/.next/aidev-dev-on-request" ] && exit 0

status() {
    node -e "fetch(process.argv[1],{redirect:'manual',signal:AbortSignal.timeout(280000)}).then(r=>console.log(r.status),()=>console.log('unreachable'))" "$base$1"
}

code=$(status "$check")
if [ "$code" = unreachable ]; then
    echo "$app-ready: $check unreachable" >&2
    exit 1
fi

# Once this server is warmed, a check is only the request above.
[ -f "$warmed" ] && [ "$(cat "$warmed")" = "$boot" ] && exit 0

if [ ! -f "$warmed" ] && [ "$code" != 200 ]; then
    echo "$app-ready: $check answered $code, not 200" >&2
    exit 1
fi

for route in $routes; do
    code=$(status "$route")
    if [ "$code" = unreachable ]; then
        echo "$app-ready: $route unreachable" >&2
        exit 1
    fi
    echo "$app-ready: $route -> $code"
done

echo "$boot" > "$warmed"
