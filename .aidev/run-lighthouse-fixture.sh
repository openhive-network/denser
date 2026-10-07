#!/usr/bin/env bash
# The deterministic Lighthouse pass, the `system` slot's `lighthouse_fixture` suite:
# the integration site's Lighthouse routes, settings and medians
# (scripts/ci-helpers/lighthouse-fixture-check.js), measured on production builds of
# this tree served from recorded Hive API and image data, with no network.
#
# The site is the integration site's layout, in this container:
#   127.0.0.1:8000  site-router.mjs: /blog -> blog (:3000), /wallet -> wallet (:4000),
#                   /<app>/_next/static from the builds' files, precompressed
#   127.0.0.1:8200  fixture-proxy-serve.mjs replaying the recording, the API endpoint
#                   of both apps' server and client
#   127.0.0.1:8201  image-server.mjs replaying the recorded images, the image proxy
# Both builds are standalone servers started as follow mode starts them. Their `Date`,
# and each page's, starts at the recording's instant (lighthouse-fixture/clock.cjs).
# A connection the servers open off the host is refused and logged
# (lighthouse-fixture/egress-guard.cjs); a request the browser makes off the host is
# read from the Lighthouse reports. Either, or a replay MISS, fails the pass.
#
#   .aidev/run-lighthouse-fixture.sh                    # measure, compare with the baseline
#   .aidev/run-lighthouse-fixture.sh --update-baseline  # measure, write the baseline
#   .aidev/run-lighthouse-fixture.sh --record           # re-record (needs egress)
#   .aidev/run-lighthouse-fixture.sh --route /blog/trending --runs 1
#
# Other arguments go to lighthouse-fixture-check.js. Results, reports and logs:
# test-results/lighthouse-fixture/. See .aidev/README.md, "Deterministic Lighthouse pass".
set -euo pipefail

cd "$(dirname "$0")/.."

mode=replay
update_baseline=false
check_args=()
for arg in "$@"; do
    case "$arg" in
        --record) mode=record ;;
        --update-baseline) update_baseline=true ;;
        *) check_args+=("$arg") ;;
    esac
done
if $update_baseline && [ "${#check_args[@]}" -gt 0 ]; then
    echo "--update-baseline measures every route as the suite does; it takes no other arguments" >&2
    exit 64
fi

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh
# shellcheck source=junit-helpers.sh
source .aidev/junit-helpers.sh

here=.aidev/lighthouse-fixture
set_name=${DENSER_LIGHTHOUSE_FIXTURE_SET:-lighthouse}
set_dir=apps/blog/playwright/tests/mock/fixtures/$set_name
baseline=${DENSER_LIGHTHOUSE_BASELINE:-$here/baseline.json}
out=$PWD/test-results/lighthouse-fixture
cases=$out/cases.tsv
site_port=8000 blog_port=3000 wallet_port=4000 api_port=8200 images_port=8201
site=http://127.0.0.1:$site_port

rm -rf "$out"
mkdir -p "$out/logs"
: > "$cases"
work=$(mktemp -d)
pids=()

finish() {
    for pid in "${pids[@]}"; do kill "$pid" 2> /dev/null || true; done
    wait 2> /dev/null || true
    rm -rf "$work"
    junit_write_cases "$out/junit.xml" lighthouse_fixture "$cases"
}
trap finish EXIT

# step NAME LOG COMMAND...: one junit case, failing the suite when COMMAND fails.
# COMMAND runs where `set -e` does not apply, so the functions below return on errors.
step() {
    local name=$1 log=$2 start=$SECONDS status=0
    shift 2
    echo "== $name" >&2
    "$@" > "$log" 2>&1 || status=$?
    if [ "$status" -ne 0 ]; then
        printf 'case\t%s\tfail\t%s\texited %s\t%s\n' "$name" $((SECONDS - start)) "$status" "$log" >> "$cases"
        tail -n 40 "$log" >&2
        exit 1
    fi
    printf 'case\t%s\tpass\t%s\t\n' "$name" $((SECONDS - start)) >> "$cases"
}

http_ok() {
    node -e 'fetch(process.argv[1], { redirect: "manual" }).then((r) => process.exit(r.status < 500 ? 0 : 1), () => process.exit(1))' "$1" < /dev/null
}

wait_for() {
    local url=$1 deadline=$((SECONDS + 180))
    until http_ok "$url"; do
        [ $SECONDS -lt $deadline ] || { echo "$url did not answer within 180 s" >&2; return 1; }
        sleep 1
    done
}

proxy_control() {
    node -e 'fetch(process.argv[1], { method: process.argv[2] }).then(async (r) => { console.log(await r.text()); process.exit(r.ok ? 0 : 1); }, (e) => { console.error(e.message); process.exit(1); })' \
        "http://127.0.0.1:$api_port/__aidev/$1" "$2" < /dev/null
}

build() {
    local app=$1
    (cd "apps/$app" && NEXT_PUBLIC_BASE_PATH="/$app" pnpm build < /dev/null) || return 1
    # The Dockerfile's runner stage, as follow/follow.sh packages a release.
    cp -a "apps/$app/.next/standalone" "$work/$app" \
        && cp -a "apps/$app/.next/static" "$work/$app/apps/$app/.next/static" \
        && node scripts/precompress-static.mjs "$work/$app/apps/$app/.next/static" \
        && rm -rf "$work/$app/apps/$app/public" \
        && cp -a "apps/$app/public" "$work/$app/apps/$app/public" \
        || return 1
    if [ -d "apps/$app/lib/markdowns" ]; then
        mkdir -p "$work/$app/apps/$app/lib" && cp -a "apps/$app/lib/markdowns" "$work/$app/apps/$app/lib/markdowns"
    fi
}

# The integration site's app environment (stack/integration/compose.yml) with every
# upstream on this host.
serve_app() {
    local app=$1 port=$2 repo=$PWD
    (
        cd "$work/$app/apps/$app"
        export PORT=$port HOSTNAME=127.0.0.1 \
            REACT_APP_APP_NAME=$app REACT_APP_BASE_PATH=/$app \
            REACT_APP_API_ENDPOINT=http://127.0.0.1:$api_port \
            REACT_APP_ALLOWED_HIVE_API_NODES=http://127.0.0.1:$api_port \
            REACT_APP_AI_DOMAIN=http://127.0.0.1:$api_port \
            REACT_APP_CHAIN_ID=beeab0de00000000000000000000000000000000000000000000000000000000 \
            REACT_APP_IMAGES_ENDPOINT=http://127.0.0.1:$images_port/ \
            REACT_APP_SITE_DOMAIN=$site/blog REACT_APP_BLOG_DOMAIN=$site/blog \
            REACT_APP_WALLET_ENDPOINT=$site/wallet REACT_APP_SSR_HOST=$site \
            REACT_APP_EXPLORER_DOMAIN=https://explore.openhive.network \
            REACT_APP_LOGGING_BROWSER_ENABLED=true REACT_APP_LOGGING_LOG_LEVEL=info \
            DENSER_SERVER_SECRET_COOKIE_PASSWORD=lighthouse-fixture-dummy-cookie-password-not-a-secret \
            DENSER_FIXTURE_CLOCK="$clock" DENSER_EGRESS_LOG="$out/egress.log" \
            NODE_OPTIONS="--require $repo/$here/clock.cjs --require $repo/$here/egress-guard.cjs"
        # A recording must see where the servers go, not be stopped by it.
        [ "$mode" = record ] || export DENSER_EGRESS_BLOCK=1
        exec "$repo/apps/$app/node_modules/.bin/react-env" -- node server.js
    ) > "$out/logs/$app.log" 2>&1 < /dev/null &
    pids+=($!)
}

start_site() {
    if [ "$mode" = record ]; then
        node .aidev/fixture-proxy-serve.mjs serve --port "$api_port" > "$out/logs/fixture-proxy.log" 2>&1 < /dev/null &
        pids+=($!)
        wait_for "http://127.0.0.1:$api_port/__aidev/status" || return 1
        # Empties $set_dir, so the image recorder starts after it.
        proxy_control "record/$set_name" PUT || return 1
    else
        FIXTURE_SET=$set_name node .aidev/fixture-proxy-serve.mjs serve --port "$api_port" > "$out/logs/fixture-proxy.log" 2>&1 < /dev/null &
        pids+=($!)
    fi
    node "$here/image-server.mjs" "$mode" "$set_dir/images" --port "$images_port" > "$out/logs/image-server.log" 2>&1 < /dev/null &
    pids+=($!)
    serve_app blog "$blog_port"
    serve_app wallet "$wallet_port"
    DENSER_FIXTURE_CLOCK="$clock" node "$here/site-router.mjs" --port "$site_port" --blog "$blog_port" --wallet "$wallet_port" \
        --static-blog "$work/blog/apps/blog/.next/static" --static-wallet "$work/wallet/apps/wallet/.next/static" \
        > "$out/logs/site-router.log" 2>&1 < /dev/null &
    pids+=($!)
    wait_for "http://127.0.0.1:$api_port/__aidev/status" \
        && wait_for "http://127.0.0.1:$images_port/__aidev/status" \
        && wait_for "$site/blog/api/health" \
        && wait_for "$site/wallet/api/health" \
        || return 1
    # One plain request per route first, as on a site that has been serving: the
    # servers' own caches are warm before the first measured run.
    node -e '
const routes = Object.keys(require("./scripts/ci-helpers/lighthouse-thresholds.json").integration);
(async () => {
  for (const route of routes) {
    const r = await fetch(process.argv[1] + route);
    console.log(`warm ${route}: ${r.status}`);
    await r.arrayBuffer();
    if (r.status >= 500) process.exitCode = 1;
  }
})().catch((e) => { console.error(e.message); process.exit(1); });' "$site" < /dev/null
}

if [ "$mode" = record ]; then
    clock=$(date -u +%Y-%m-%dT%H:%M:%SZ)
else
    clock=$(node -p 'require(process.argv[1]).clock' "$PWD/$set_dir/_lighthouse.json" 2> /dev/null) \
        || { echo "no recording at $set_dir (run with --record)" >&2; exit 1; }
fi

step "build blog" "$out/logs/build-blog.log" build blog
step "build wallet" "$out/logs/build-wallet.log" build wallet
step "start the site ($mode, clock $clock)" "$out/logs/start.log" start_site

chrome=$(ls -d /ms-playwright/chromium-*/chrome-linux*/chrome 2> /dev/null | head -n 1)
export CHROME_PATH=${CHROME_PATH:-$chrome}
args=(--site "$site" --out "$out" --fixture-set "$set_name" --clock "$clock" --cases "$cases"
    --revision "$(git rev-parse HEAD 2> /dev/null || echo worktree)"
    --allowed-host "127.0.0.1:$site_port" --allowed-host "127.0.0.1:$api_port" --allowed-host "127.0.0.1:$images_port")
if [ "$mode" = replay ]; then
    args+=(--miss-counter "http://127.0.0.1:$api_port/__aidev/status" --miss-counter "http://127.0.0.1:$images_port/__aidev/status")
    if ! $update_baseline && [ -f "$baseline" ]; then args+=(--baseline "$baseline"); fi
fi
status=0
node scripts/ci-helpers/lighthouse-fixture-check.js "${args[@]}" "${check_args[@]}" < /dev/null || status=$?

if [ -s "$out/egress.log" ]; then
    printf 'case\tthe app servers opened no connection off the host\tfail\t0\t%s\t%s\n' \
        "$(sort -u "$out/egress.log" | tr '\n' ' ')" "$out/egress.log" >> "$cases"
    echo "The app servers connected off the host: $(sort -u "$out/egress.log" | tr '\n' ' ')" >&2
    [ "$status" -ne 0 ] || status=2
else
    printf 'case\tthe app servers opened no connection off the host\tpass\t0\t\n' >> "$cases"
fi

if [ "$mode" = record ]; then
    proxy_control record DELETE
    node "$here/image-server.mjs" prune "$set_dir/images" "http://127.0.0.1:$images_port" "$out"/reports/*/*.json.gz
    CLOCK=$clock node -e '
const fs = require("fs");
const routes = Object.keys(require("./scripts/ci-helpers/lighthouse-thresholds.json").integration);
fs.writeFileSync(process.argv[1], JSON.stringify({ clock: process.env.CLOCK, routes }, null, 2) + "\n");' \
        "$set_dir/_lighthouse.json" < /dev/null
    echo "Recorded $set_dir (clock $clock); measure it with $0 --update-baseline" >&2
elif $update_baseline && [ "$status" -eq 0 ]; then
    node -e '
const fs = require("fs");
const result = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
result.routes = result.routes.map(({ runs: _runs, ...route }) => route);
fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + "\n");' "$out/result.json" "$baseline" < /dev/null
    echo "Baseline written: $baseline" >&2
fi
exit "$status"
