# denser integration site

The tip of `aidev/integration`, deployed for anyone to try: denser's counterpart of
discuss.syncad.com (ratings). Laid out like hive/haf_api_node's `ui` profile, which is
how API nodes run denser: blog at `/blog` and wallet at `/wallet` on one hostname,
each a production (`output: 'standalone'`) build with that base path.

- **URL:** https://denser.discuss.peerverity.info/blog (wallet: `/wallet`, status:
  `/status/deployed.json`).
- **Host:** predicate-testing.syncad.com, `~/denser-integration/stack/integration`,
  behind `~/sites-router` (haproxy on 192.168.50.199 that routes by TLS SNI). The site's
  caddy listens on 127.0.0.4 and takes the client address from the router's PROXY
  header. `*.discuss.peerverity.info` resolves there internally and publicly.
- **Network:** `DENSER_NETWORK=mainnet` (default, api.hive.blog) or `mirrornet`
  (api.fake.openhive.network); see `networks/`. Switching is a restart, not a rebuild:
  edit `.env`, then `./upgrade.sh`.
  On mainnet, logging in signs **real** transactions.

## How it updates (follow mode)

The site runs from this checkout; no image is built or pulled for the apps.

1. `systemd/denser-integration-upgrade@.timer` runs `upgrade.sh --quiet` every 2
   minutes. It fast-forwards this checkout to `origin/$DENSER_SOURCE_BRANCH`
   (`aidev/integration`). A run that finds nothing new builds nothing.
2. It runs `follow/follow.sh once` in the project's test image
   (`environment.image` of `.aidev/project.yaml`: Node, pnpm and the pnpm store of
   this lockfile), with the checkout mounted. For each app the build key is Turbo's
   hash of its build task (its sources, the workspace packages it uses, the lockfile's
   resolution of its dependencies, `turbo.json`, its base path) plus the image and
   the root workspace files:
   - `apps/blog/**` moves the blog's key only, `apps/wallet/**` the wallet's;
   - `packages/**` moves the key of each app that depends on the package;
   - `pnpm-lock.yaml` comes with a new `environment.image` (AIDEV requires both
     together), which reinstalls `node_modules` and moves both keys;
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
   which caddy serves at `/<app>/_next/static/*` itself (`Caddyfile.static.releases`):
   the precompressed sidecar the browser accepts, `Cache-Control: public,
   max-age=31536000, immutable`, a 404 for a file no release published (never a
   request to Next). The directory keeps every release's files for 7 days
   (`FOLLOW_STATIC_KEEP_DAYS`), and those of the served and previous releases
   whatever their age, so a page opened before a swap still loads its lazy chunks
   after it. In images mode (`DENSER_STATIC_FROM` unset) caddy proxies them to the
   app as before (`Caddyfile.static.next`).

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
   rewritten branch is `REFUSED` (exit 3) and nothing changes.
6. `status/deployed.json` reports each app's `revision` (the checkout's commit when
   its build is that commit's build), its `release`, `source: follow:<branch>` and
   its state. `upgrade.sh` then checks the blog's OAuth2 provider, and once every
   app reports the checkout's HEAD runs `lighthouse.sh` (both below).

No GitLab CI is involved. `DENSER_MODE=images` in `.env` runs the
`registry.gitlab.syncad.com/hive/denser/{blog,wallet}-subdirectory:$DENSER_TAG` images
instead (`compose.yml` alone), e.g. to pin a version. Promotes no longer build
`:integration` images (`.aidev/project.yaml` has no `publish:` section since the site
switched to follow mode), so in images mode pin a tag CI builds from develop/main.

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
serves it: it waits for `https://$SITE_HOST/status/deployed.json` to report the
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
  breach named per route. A breach is also logged in the upgrade unit's journal
  (`journalctl -u 'denser-integration-upgrade@*'`). The status page of the last
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
- **By hand:** `./lighthouse.sh --force` measures the deployed tip again.
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

```bash
git clone --branch aidev/integration git@gitlab.syncad.com:hive/denser.git ~/denser-integration
cd ~/denser-integration/stack/integration
cp .env.example .env    # fill in CLOUDFLARE_API_TOKEN (the zone of SITE_HOST),
                        # DENSER_SERVER_SECRET_COOKIE_PASSWORD (openssl rand -hex 32)
                        # and DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET (openhive.chat's)
./upgrade.sh
# route the name: one line in ~/sites-router/sites.map, then ./render.sh there
#   denser.discuss.peerverity.info    denser-integration-caddy-1
sudo cp systemd/denser-integration-upgrade@.* /etc/systemd/system/
inst=$(systemd-escape --path "$PWD")
sudo systemctl daemon-reload && sudo systemctl enable --now "denser-integration-upgrade@${inst}.timer"
```

A site set up in images mode switches to follow mode by itself: the first
`upgrade.sh` that has `compose.follow.yml` builds both apps while the image
containers keep serving, then replaces them. Copying the units again (the commands
above) shortens the timer to 2 minutes. By hand, compose needs the same file list:
`COMPOSE_FILE=compose.yml:compose.follow.yml DENSER_FOLLOW_IMAGE=$(follow/environment-image.sh) docker compose ps`.

## A session's stack (`session-stack.sh`)

The same follow mode, on a session's checkout: blog and wallet production builds
behind caddy's `/blog` and `/wallet` routing (`Caddyfile.routes`, shared with the
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
restart. Run it on a checkout that follows the session branch, such as the
session's dev-stack checkout, which AIDEV fast-forwards on every push. Its builds
write `apps/*/.next` in that checkout, like the `fixture_e2e` suite does. From inside
a container whose paths differ from the docker host's, set `DENSER_SOURCE_DIR` to
the checkout's host path (`$DENSER_DEV_CHECKOUT` is used when set).
AIDEV's profile declares a single dev stack (`sandbox.dev`), so this one is started
with the script rather than by AIDEV.
