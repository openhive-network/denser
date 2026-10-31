# denser integration site

The tip of `aidev/integration`, deployed for anyone to try: denser's counterpart of
discuss.syncad.com (ratings). Laid out like hive/haf_api_node's `ui` profile, which is
how API nodes run denser: blog at `/blog` and wallet at `/wallet` on one hostname,
each a production (`output: 'standalone'`) build with that base path.

- **URL:** https://denser.discuss.peerverity.info/blog (wallet: `/wallet`, status:
  `/status/deployed.json`).
- **Routing** (`caddy/Caddyfile.routes`): any other path redirects (302) to the same path
  and query under `/blog`, so a hive.blog link with only the host changed opens
  the same page: `/@user` → `/blog/@user`, `/hive-163772/@user/permlink?x=1` →
  `/blog/hive-163772/@user/permlink?x=1`. `/` goes to `/blog`. A post whose
  category is `blog` (`/blog/@user/permlink` on hive.blog) can't be told from the
  prefix and is left as it is: the blog gets it as its own `/@user/permlink`.
  A wallet.hive.blog path goes to the same path and query under `/wallet` instead:
  the wallet's top-level pages (`/proposals`, `/~witnesses`, `/market`, ...) and the
  account tabs only the wallet has (`/@user/transfers`, `/@user/permissions`, ...).
  When `apps/wallet/app` gains a page, add it to `@wallet` there.
  `/robots.txt` (and `/blog/robots.txt`, `/wallet/robots.txt`) is answered by caddy
  itself, not redirected: a disallow-all, as new.hive.blog and wallet.hive.blog serve.
  `./test-routes.sh` loads `caddy/` into a throwaway caddy and checks these routes.
- **Host:** predicate-testing.syncad.com, `~/denser-integration/stack/integration`,
  behind `~/sites-router` (haproxy on 192.168.50.199 that routes by TLS SNI). The site's
  caddy listens on 127.0.0.4 and takes the client address from the router's PROXY
  header. `*.discuss.peerverity.info` resolves there internally and publicly.
- **Network:** `DENSER_NETWORK=mainnet` (default, api.hive.blog) or `mirrornet`
  (api.fake.openhive.network); see `networks/`. Switching is a restart, not a rebuild:
  edit `.env`, then `./upgrade.sh`.
  On mainnet, logging in signs **real** transactions.
- **HTML cache** (optional, `DENSER_HTML_CACHE=varnish`): varnish between caddy and the
  blog stores the anonymous pages the blog marks public; see "Shared HTML cache" below.

## How it updates (follow mode)

The site runs from this checkout; no image is built or pulled for the apps.

1. `systemd/denser-integration-upgrade@.timer` runs `upgrade.sh --quiet` every 2
   minutes. It fast-forwards this checkout to `origin/$DENSER_SOURCE_BRANCH`
   (`aidev/integration`). A run that finds nothing new builds nothing.
2. It runs `follow/follow.sh once` in the project's test image
   (`environment.fallback` of `.aidev/project.yaml`, the image with Node, pnpm and the
   pnpm store of this lockfile baked in; `follow/environment-image.sh`), with the checkout mounted. For each app the build key is Turbo's
   hash of its build task (its sources, the workspace packages it uses, the lockfile's
   resolution of its dependencies, `turbo.json`, its base path) plus the image and
   the root workspace files:
   - `apps/blog/**` moves the blog's key only, `apps/wallet/**` the wallet's;
   - `packages/**` moves the key of each app that depends on the package;
   - `pnpm-lock.yaml` comes with a new `environment.fallback` (`.aidev/README.md`
     requires both together), which reinstalls `node_modules` and moves both keys;
   - docs, `.aidev/`, `stack/`, `apps/*/playwright/**` move nothing.
3. An app whose key moved gets `next build` in the checkout (`.next/cache` stays
   there), with `NEXT_PUBLIC_BASE_PATH` and the commit's `version.json` (the
   sidebar's version). The standalone output becomes `releases/<app>/<commit8>-<key>`,
   which is started once on a scratch port; only when it answers is
   `releases/<app>/current` repointed. The running server (`follow/serve.sh`, in
   `compose.follow.yml`) serves the previous build for the whole build and then
   restarts onto the new one; caddy holds requests during that restart
   (`lb_try_duration`).
4. Static assets: packaging writes a `.br` (brotli 11) and `.zst` (zstd 19) next to
   each compressible file of the release's `.next/static`
   (`scripts/precompress-static.mjs`; the production `Dockerfile` does the same).
   Before the swap the release's files are copied into `releases/<app>/static`,
   which caddy serves at `/<app>/_next/static/*` itself (`caddy/Caddyfile.static.releases`):
   the precompressed sidecar the browser accepts, `Cache-Control: public,
   max-age=31536000, immutable`, a 404 for a file no release published (never a
   request to Next). The directory keeps every release's files for 7 days
   (`FOLLOW_STATIC_KEEP_DAYS`), and those of the served and previous releases
   whatever their age, so a page opened before a swap still loads its lazy chunks
   after it. In images mode (`DENSER_STATIC_FROM` unset) caddy proxies them to the
   app as before (`caddy/Caddyfile.static.next`).

   The public/ files the build generates (`copy:public`: hb-auth's `auth/worker.js`
   and `auth/assets/`, `locales/`, `smart-signer/`) get the same sidecars, and caddy
   serves `/<app>/auth/*`, `/<app>/locales/*` and `/<app>/smart-signer/*` from the
   served release's `public/` (`releases/<app>/current`). Their names carry no
   content hash, so they are `public, max-age=0, must-revalidate` and a repeat
   use is a 304 on the ETag; hb-auth's `auth/assets/` are content-hashed and
   immutable. `worker.js` was `no-store`; it is public code and hb-auth keeps no
   secret in it, so revalidation gives the same freshness. The apps' `next.config.js`
   sends the same headers in images mode.
5. A build or start that fails leaves `current` alone: the app keeps serving the
   previous commit's build, `status/deployed.json` says `ROLLED-BACK` with the
   failed commit and its log (`releases/<app>/logs/`), the unit exits 1, and the next
   run tries again. A checkout with local changes, on another branch, or behind a
   rewritten branch is `REFUSED` (exit 3) and nothing changes. Too little free disk
   is `DISK-LOW` (exit 6) and builds nothing; see "Disk space" below.
6. Caddy config: caddy mounts `caddy/` as a directory (a single-file mount keeps
   showing the file git replaced), so the container sees a changed `Caddyfile*` at
   once, and `upgrade.sh` makes caddy load it in the same run (`caddy-apply.sh`, in
   both modes): when `caddy/` differs from what caddy last loaded
   (`status/.caddy-applied`), `caddy validate` and then `caddy reload` in the
   running container. A config caddy refuses is not loaded: the site keeps serving
   the previous one, and every run prints `caddy-apply: REFUSED` with caddy's error
   and exits 4 until a commit fixes `caddy/`. The new files are in the container
   all the same, so restarting or recreating caddy before then would start it on
   the refused config.
7. `status/deployed.json` reports each app's `revision` (the checkout's commit when
   its build is that commit's build), its `release`, `source: follow:<branch>` and
   its state. `upgrade.sh` then checks the blog's OAuth2 provider (below), and the
   run ends.
8. Measuring is a separate unit: `systemd/denser-integration-lighthouse@.timer` runs
   `lighthouse.sh --quiet` every 2 minutes, which measures once every app reports the
   checkout's HEAD and those builds have no result yet (below). An upgrade never waits
   for it: a commit promoted while a check runs is deployed by the next upgrade run,
   and measured by the first tick after the running check ends. Its journal is
   `journalctl -u 'denser-integration-lighthouse@*'`.

No GitLab CI is involved. `DENSER_MODE=images` in `.env` runs the
`registry.gitlab.syncad.com/hive/denser/{blog,wallet}-subdirectory:$DENSER_TAG` images
instead (`compose.yml` alone), e.g. to pin a version. Promotes no longer build
`:integration` images (`.aidev/project.yaml` has no `publish:` section since the site
switched to follow mode), so in images mode pin a tag CI builds from develop/main.

The blog and wallet healthchecks (`compose.yml`) probe with `node -e` and `fetch`, the
one program both the test image and the `-subdirectory` images have; the test image
carries no `wget` or `curl`. `./test-healthchecks.sh` (or `./test-healthchecks.sh
images`) checks that each healthcheck's program is in its service's image.

## Disk space

The host's root filesystem is shared with the other stacks on it (ratings, discuss,
matrix). Follow mode keeps its own use bounded and stops building before the disk
fills:

- **Superseded images:** a lockfile change brings a new environment image (3 to 4 GB).
  After every follow run that leaves every app serving the tip, `upgrade.sh` removes
  the other images of that image's repository (`.../aidev-tests`) and every
  `blog-subdirectory`/`wallet-subdirectory` image (images mode's). It keeps the last
  two follow images a run completed with (`status/.follow-images`: every image
  change rebuilds every app, so those are what the current and the previous releases
  were built in) and any image a container uses, running or stopped, whichever stack
  it belongs to. It lists no repository outside `registry.gitlab.syncad.com/hive/denser/`,
  and removes nothing when it cannot tell the follow image (a `.aidev/project.yaml`
  a full disk truncated). While `status/.follow-images` names fewer than two images
  (the first runs after it was introduced), it also keeps the image of each app's
  previous release, read from the `.aidev/project.yaml` of the commit that release was
  built from; when that can't be told (`DENSER_FOLLOW_IMAGE` set, or the commit
  unknown) it leaves the follow repository alone and removes only the `-subdirectory`
  images. One docker refuses to remove (shared with another repository, or the parent
  of another image) is tried again the next UTC day (`status/.prune-failed`).
- **Low disk:** each run first checks the space free on the checkout's filesystem.
  Under `DENSER_MIN_FREE_GB` (`.env`, default 5) it removes the superseded images as
  above and measures again; still under, it fetches, pulls and builds nothing and
  leaves the containers alone, so the current release keeps serving. It logs
  `upgrade: DISK-LOW: ...`, exits 6 (the unit shows failed), and
  `status/deployed.json` says `"upgrade": {"status": "DISK-LOW", ...}` with
  `"disk_low": true`. Every follow run reports `disk_free_bytes` and
  `disk_min_free_bytes` there. With `RC_WEBHOOK_URL` set (`.env` or the
  environment, a Rocket.Chat incoming webhook) it also posts the message there, at
  most once per UTC day, remembered on tmpfs (`$XDG_RUNTIME_DIR`, else `/dev/shm`) so a
  full disk can't defeat it: a reboot can post once more. The next run with room builds
  as usual.
- **Status writes:** `follow/serve.sh` logs a `serving.json` it cannot write and keeps
  the server running: a full disk leaves the built release serving, and only
  `upgrade.sh`'s wait for the swap (`serving.json`) gives up after its 2 minutes.

`./test-upkeep.sh` checks these with stand-ins for docker, git, df and curl: a faked
low free space skips the run and reports it (posting once a day even when `status/`
takes no writes), an unresolvable or foreign follow image removes nothing, the prune
spares the current, previous-release and in-use images and tries a refused one once a
day, a completed run records its image, and `serve.sh` survives an unwritable
`serving.json`. The `unit` suite of `.aidev/project.yaml` runs it.

## Shared HTML cache (optional)

A shared cache for the blog's anonymous pages, to measure hit rate and staleness here
before doing the same on a CDN. The blog marks a page shareable itself: `Cache-Control:
public, s-maxage=30, stale-while-revalidate=60, stale-if-error=300` and no `Set-Cookie`
only for a page that renders the same for every anonymous reader
(`packages/middleware/lib/public-cache.ts`); everything else it sends `private, no-store`.

- **What:** varnish (`compose.cache.yml`, rules in `varnish/default.vcl`), not a caddy
  cache module: the site's caddy is a prebuilt image (ratings-stack's, with the
  cloudflare DNS and PROXY-protocol modules), so a module would mean building and
  keeping our own caddy for both the site and session stacks, and VCL states the key,
  bypass and grace rules below directly.
- **Where:** `caddy:/blog -> varnish:80 -> caddy:8081 -> blog:80`. Caddy keeps TLS,
  compression, the redirects and the static files; only the `/blog` route goes to
  varnish (`DENSER_BLOG_UPSTREAM`, which `compose.cache.yml` sets). Varnish's backend is
  caddy's cache-origin listener (`caddy/Caddyfile.cache-origin`), which holds a request
  while follow mode restarts the blog's server (`lb_try_duration`), as the `/blog` route
  does without the cache. That listener trusts the `X-Forwarded-*` varnish forwards, so
  the blog still sees the client's address first. The wallet stays direct: it marks no
  page public.
- **Looked up** only for a GET or HEAD with no `RSC`, `Next-Router-State-Tree`,
  `Next-Router-Prefetch` or `Next-Router-Segment-Prefetch` header, no `_rsc` query, no
  `Authorization`, not under `/blog/api/` or `/blog/_next/`, and none of the cookies
  `*_session`, `observer`, `observer-no-own-lists`, `account_info`. Any other request
  passes to the blog untouched (`X-Cache: BYPASS`).
- **Key:** host, path, the query without `utm_*`, `fbclid` and `gclid` and with the rest
  sorted (the blog gets that URL too), and the language: the `NEXT_LOCALE` cookie when it
  is one of `ar en es fr it ja ko pl ru zh`, else `en` (the blog's `resolveLocale`). A
  looked-up request reaches the blog with no cookie but `NEXT_LOCALE` for a language
  other than `en`; theme, NSFW and every other cookie are dropped and stay out of the key.
  The blog sends `private` for a request with `NEXT_LOCALE` today, so only `en` pages
  are stored; the key keeps the languages apart should that change.
- **Stored** only when the response is a 200 (or a 404) whose `Cache-Control` is
  `public` with an `s-maxage` above 0 and no `private`/`no-store`/`no-cache`, with no
  `Set-Cookie` and no `Vary: *`. It is fresh for its `s-maxage`. For its
  `stale-while-revalidate` after that it is served while one background fetch
  refreshes it; for its `stale-if-error` it is served only when the blog fails: while
  varnish's probe (`/blog/api/health` every 5 s) says the blog is down, or when the
  fetch to refresh it answers 5xx or not at all. A 404 is kept 30 s at most and never
  served stale; no other status is stored (the blog sends `private` on every non-200
  today, so 404s are not stored either). A response that is not stored makes the key a
  hit-for-miss for 30 s: those requests go to the blog uncoalesced (`BYPASS`).
- **Headers:** `X-Cache: HIT` (stored, fresh or stale), `MISS` (fetched and stored) or
  `BYPASS` (passed, or the response was not storable), and `Age`.
- **Deploys:** in follow mode nothing is purged. A cached page names its build's hashed
  `/_next/static` files, which caddy keeps serving for 7 days after a swap (step 4
  above), and a page is cached for at most `s-maxage` + `stale-if-error` (330 s). In
  images mode a new image serves only its own build's files, so `upgrade.sh` bans every
  cached object when an image changed. By hand:
  `docker compose exec varnish varnishadm ban 'obj.status != 0'`.
- **Changing the VCL:** `upgrade.sh` (and `session-stack.sh up`) loads a changed
  `varnish/` with `varnish-apply.sh` (`varnishreload`, which keeps the running VCL when
  the new one fails to compile: `varnish-apply: REFUSED` and exit 5 until a commit fixes
  it). As with caddy, restarting varnish before then starts it on the refused file.
- **Turning it on and off:** `DENSER_HTML_CACHE=varnish` in `.env`, then `./upgrade.sh`:
  compose adds varnish and recreates caddy with the new upstream. Removing it (or
  `DENSER_HTML_CACHE=off`) and `./upgrade.sh` again puts caddy back on the blog and
  removes the varnish container. The cache's memory is `DENSER_HTML_CACHE_SIZE`
  (default `256M`). For a session stack, `DENSER_HTML_CACHE=varnish
  stack/integration/session-stack.sh up`.
- **Checking it:** `./test-cache.sh` runs caddy (`caddy/`) and varnish (`varnish/`) in
  front of a stub blog and checks the rules above from `X-Cache` and the bodies:
  MISS then HIT, BYPASS for each cookie and router header, campaign parameters,
  sorted queries and other cookies on the same object, `NEXT_LOCALE=pl` on its own,
  `Set-Cookie` and 500 responses never stored. `./test-cache.sh https://$SITE_HOST`
  runs the checks that need no stub against a running site.
- **Measuring:** `docker compose exec varnish varnishstat -1 -f MAIN.cache_hit
  -f MAIN.cache_hitmiss -f MAIN.cache_miss -f MAIN.s_pass -f MAIN.backend_req`
  (hits, misses and passes since varnish started; `backend_req` is what reached the
  blog), or `varnishncsa -F '%U%q %{Varnish:handling}x %s'` for a request log.

## OAuth2 check after each deploy

The blog is the OAuth2 provider of openhive.chat ("Sign in with Denser"), with the
client `denser` registered from `DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET` in `.env`.
After each upgrade `upgrade.sh` requests
`https://$SITE_HOST/blog/api/oauth/authorize?response_type=code&client_id=denser&redirect_uri=https%3A%2F%2Fopenhive.chat%2F_oauth%2Fdenser`
signed out. It must answer 302 with a `Location` ending in
`/blog/login?oauth_return=true`: the client is registered and the redirect keeps the
base path.

- **Result:** `https://$SITE_HOST/status/oauth.json`: `{revision, status: ok|fail,
  http_code, location, at}`, `revision` being the checkout's HEAD.
- **When:** once per revision that passes; a failing revision is checked again on
  every run until it passes.
- **Advisory:** a failure is logged in the upgrade unit's journal and recorded,
  never fails or rolls back the upgrade.
- The whole flow (sign-in, code exchange, userinfo) under `/blog` is the `@basepath`
  pass of the fixture suite (`apps/blog/playwright/tests/fixture/oauthFlow.spec.ts`).

## Lighthouse after each promote

`lighthouse.sh` measures each revision of `aidev/integration` once, after the site
serves it, from its own unit (`systemd/denser-integration-lighthouse@.{timer,service}`,
`TimeoutStartSec` 3 hours) rather than the upgrade's, so a measurement neither holds
up a deploy nor is killed by the upgrade's timeout. It waits for `https://$SITE_HOST/status/deployed.json` to report the
revision for blog and wallet, then runs Lighthouse (mobile, in the pinned
`gitlab-ci-utils/lighthouse` image, 2 CPUs, one run at a time) 5 times on each route
and compares the median performance score, LCP, TBT, CLS, transferred JS and
transferred WASM with the `integration` section of
`scripts/ci-helpers/lighthouse-thresholds.json`. That section is also the list of
routes. `lcp-lazy-loaded: false` there flags a route whose LCP image is
`loading="lazy"` (Lighthouse's own LCP discovery check).

- **Logged in:** the routes of `integrationLoggedIn` (the six above, plus the
  observer's own profile, notifications and wallet: `{observer}` in a route) are
  measured a second time as a logged-in reader, with the same settings and runs,
  each logged-in run right after the route's logged-out one so both see the same
  backend. Logged in is the state denser's Keychain login leaves: the `observer`
  cookie and the localStorage `user` entry. No key is stored or used. The account is
  `LIGHTHOUSE_OBSERVER` in `.env` (default `blocktrades`, which has a large history).
  These runs go through Lighthouse's Node API with puppeteer-core, both from the same
  image (`scripts/ci-helpers/lighthouse-logged-in-run.js`), with the storage reset off
  so the login survives. Each route keeps a result per mode (`"mode": "loggedOut"` or
  `"loggedIn"`), and the status page shows the two next to each other.
- **WASM:** `wasm-transfer-bytes` is the transfer size of every `*.wasm` request.
  Pages fetch it, so the `script` bytes leave it out: the 0.95 MB wax WASM a
  logged-in page loads shows only there. The logged-out blog routes have a limit of
  0 (they load none); the wallet reads through the WASM logged out too.
- **One process per run:** each Lighthouse run, in either mode, is its own process
  with its own Chrome, and the check keeps only the run's metrics and the path of its
  saved report. Lighthouse runs in one Node process ran out of memory after about 40
  runs.

- **Results:** `https://$SITE_HOST/status/lighthouse/<revision>.json` and
  `/status/lighthouse/latest.json`, with `"status": "pass"` or `"breach"` and each
  breach named per route. A breach is also logged in the Lighthouse unit's journal
  (`journalctl -u 'denser-integration-lighthouse@*'`), with one line per check:
  `lighthouse: <revision> checked in <seconds> s, exit <code>`. The status page of the last
  passes is `https://$SITE_HOST/status/lighthouse/` (`index.html`).
- **Backend timing:** each run, and each route's median, also keeps what the report
  says about the backend (`backend`): the document's TTFB (`server-response-time`),
  the LCP breakdown, the LCP resource's host, bytes and duration, the image bytes,
  and per upstream host (the Hive API nodes of `networks/<network>.env`,
  `images.hive.blog`, the site; the rest summed as `other`) the request count, bytes
  and median/max duration. Each run's full report is kept gzip'd under
  `reports/<revision>/` for the latest revision only.
- **Observed paints:** the LCP judged is Lighthouse's simulation (Lantern, slow 4G),
  which replays the requests that finished before the paint and can land seconds
  apart on runs that painted alike. Each run and median also keeps what the browser
  drew (`observed-first-contentful-paint`, `observed-largest-contentful-paint`, from
  the `metrics` audit), and the status page shows both with every run's value. An LCP
  breach whose median observed LCP is under 2.5 s carries `simulatedOnly: true`; when
  every breach of a pass does, its `verdict` reads `breach (simulated-only)`. A label,
  like the environment's: the exit code does not change.
- **Environment:** just before and just after the routes, 5 samples each of
  `get_dynamic_global_properties` on the server's API node, one fixed
  `images.hive.blog` image and the site's `/blog/favicon.ico` (`environment.before` /
  `.after`). A pass is `environment.status: degraded` when a probe failed every
  sample, or a probe median or a route's median TTFB is at least 2× and 300 ms above
  its baseline: the median over the last 20 passes (`environment-baseline.json`,
  which needs 3 of them first). A degraded pass's `verdict` reads
  `breach (environment degraded)` (or `pass (…)`), apart from a code breach; the exit
  code does not change.
- **Advisory:** a breach never fails or rolls back the upgrade.
- **Bounded:** one check (75 Lighthouse runs, about 30 minutes: 30 logged-out runs,
  about 12 minutes, and 45 logged-in ones, about 18 minutes more) per promoted revision
  whose builds have not been measured: a commit that rebuilt nothing (docs, tests)
  serves the builds an earlier revision was measured with, and is skipped. A
  revision that never deploys, or that a later promote overtakes before it is
  served, is not measured. In images mode with `DENSER_TAG` pinned the site never
  serves the tip, so nothing is measured.
- **Killed or failed:** a check that is stopped, times out or fails writes no result:
  each result file is written to a `.tmp` and renamed, and the builds count as
  measured only once the check exits 0 or 2. The next tick removes the killed
  check's container (`denser-lighthouse-<hash of this directory>`) and any `.tmp`,
  then measures the revision again from the start.
- **A promote during a check:** the check carries on, and the routes measured after
  the deploy see the new builds; the journal then says `its result mixes builds`.
  The new revision is measured by the next tick.
- **By hand:** `./lighthouse.sh --force` measures the deployed tip again (it skips,
  printing `another check is running`, while the unit's check runs).
- **Comparing two commits:** this check follows the live API and image proxy, so a
  before/after of two revisions mixes code with upstream latency. The deterministic
  pass measures the same routes on recorded data with no network
  (`aidev test run --slot system`; ".aidev/README.md", "Deterministic Lighthouse pass").
- **Thresholds** are the medians measured on 2026-10-05 with headroom for noise:
  single mobile runs of one build differ by seconds of LCP, which is why each route
  takes the median of 5. Tighten a route's limits as its performance improves. The
  image-led post and the community feed were added from the 2026-10-06 audit
  (`docs/performance/page-audit-2026-10.md`), with limits just above that day's runs.
  The community feed's LCP limit is `/blog/trending`'s since 2026-10-07: both simulate
  about 5.0 s while painting in under 0.6 s. The logged-in limits start from the
  2026-10-07 comparison of the two modes (`docs/performance/logged-in-2026-10-07.md`),
  described there. If the pass gets too long, take routes out of
  `integrationLoggedIn` rather than runs per route.

## Setup (done once per host)

The shared HTML cache is off unless `.env` says `DENSER_HTML_CACHE=varnish` (above).

```bash
git clone --branch aidev/integration git@gitlab.syncad.com:hive/denser.git ~/denser-integration
cd ~/denser-integration/stack/integration
cp .env.example .env    # fill in CLOUDFLARE_API_TOKEN (the zone of SITE_HOST),
                        # DENSER_SERVER_SECRET_COOKIE_PASSWORD (openssl rand -hex 32)
                        # and DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET (openhive.chat's)
./upgrade.sh
# route the name: one line in ~/sites-router/sites.map, then ./render.sh there
#   denser.discuss.peerverity.info    denser-integration-caddy-1
sudo cp systemd/denser-integration-*@.* /etc/systemd/system/
inst=$(systemd-escape --path "$PWD")
sudo systemctl daemon-reload && sudo systemctl enable --now \
    "denser-integration-upgrade@${inst}.timer" "denser-integration-lighthouse@${inst}.timer"
```

A site set up in images mode switches to follow mode by itself: the first
`upgrade.sh` that has `compose.follow.yml` builds both apps while the image
containers keep serving, then replaces them. Copying the units again (the commands
above) shortens the timer to 2 minutes, and on a site whose `upgrade.sh` still ran
`lighthouse.sh` itself, installs the Lighthouse unit that now does: until it is
enabled, nothing is measured. By hand, compose needs the same file list:
`COMPOSE_FILE=compose.yml:compose.follow.yml DENSER_FOLLOW_IMAGE=$(follow/environment-image.sh) docker compose ps`.

## A session's stack (`session-stack.sh`)

The same follow mode, on a session's checkout: blog and wallet production builds
behind caddy's `/blog` and `/wallet` routing (`caddy/Caddyfile.routes`, shared with the
site), on one loopback port, against the live Hive API (`DENSER_NETWORK`). This is
the topology the site runs, which the AIDEV dev stack (`next dev` of the blog alone,
`.aidev/dev-stack.compose.yml`) is not: subdirectory routing, both apps, production
bundles.

```bash
stack/integration/session-stack.sh up       # prints http://127.0.0.1:<port>/blog
stack/integration/session-stack.sh status   # services, and each app's release and state
stack/integration/session-stack.sh logs follower
stack/integration/session-stack.sh down
```

`compose.session.yml` on top of the site's two files replaces only what is
site-specific (TLS, the sites-router, public URLs) and runs the follower as a
service (`follow.sh watch`): every 20 seconds it re-keys the apps and rebuilds the one
whose build inputs changed, so a commit reaching the checkout is served without a
restart. `caddy/` is mounted as on the site; `session-stack.sh up` loads a changed
`caddy/Caddyfile.session` or its imports the same way (`caddy-apply.sh`), so rerun it
after changing them. `DENSER_HTML_CACHE=varnish` in its environment adds the shared
HTML cache, as on the site. Run it on a checkout that follows the session branch, such as the
session's dev-stack checkout, which AIDEV fast-forwards on every push. Its builds
write `apps/*/.next` in that checkout, like the `fixture_e2e` suite does. From inside
a container whose paths differ from the docker host's, set `DENSER_SOURCE_DIR` to
the checkout's host path (`$DENSER_DEV_CHECKOUT` is used when set).
AIDEV's profile declares a single dev stack (`sandbox.dev`), so this one is started
with the script rather than by AIDEV.
