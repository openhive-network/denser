# denser under AIDEV

`.aidev/project.yaml` is denser's AIDEV profile. The suites it binds run in the
digest-pinned `registry.gitlab.syncad.com/hive/denser/aidev-tests` image
(`.aidev/runtime/`), offline, and write junit under `test-results/`.

## The test runtime image (`runtime/`)

`runtime/Dockerfile` is built on common-ci-configuration's
`node-test-tools:develop`, the image CI's Node jobs run, so Node, pnpm and
Playwright are ccc's versions and the repository pins none of its own. It adds
Playwright's full Chromium (for Lighthouse) and every package `pnpm-lock.yaml`
resolves. The build is published as `registry.gitlab.syncad.com/hive/denser/aidev-tests`
and pinned by digest in `project.yaml` (`environment.image`) and the compose stacks
(`x-image`). Its tag is `aidev-` plus a hash of its inputs: `runtime/Dockerfile`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc` and the digest the base tag names.
`runtime/build.sh` looks that tag up in the registry first and builds nothing when it
is there; `build.sh --tag` prints the tag. The registry cleanup policy keeps
`aidev-*` tags, so a pinned image isn't expired.

### Changing dependencies (lockfile + digest bump)

AIDEV refuses a commit that changes `pnpm-lock.yaml` unless `environment.image` moves
in the same commit. When you change any image input:

1. Run `.aidev/runtime/build.sh --push` (needs push rights on the registry). It prints
   `registry.gitlab.syncad.com/hive/denser/aidev-tests@sha256:<digest>`, building and
   pushing only when no image for these inputs exists yet.
2. Put that reference in `project.yaml` `environment.image` and in the `x-image`
   line of `dev-stack.compose.yml` and `test-stack.compose.yml`, and commit them
   together with the input change.

The workflow (or person) that changes an input runs `build.sh --push` itself; no
CI job builds this image. AIDEV-driven development doesn't use GitLab CI (see
"CI" below).

### The shared test image (`kind: shared`): not yet

aidev's shared route (`docs/operations/shared-test-images.md` in ai/aidev) would run
the suites in ccc's `node-test-tools:develop` with a host pnpm store mounted read-only
at `/opt/pnpm-store`, and drop this image. `.aidev/pnpm-deps.sh` already exports the
environment this image sets, so the suites need nothing else from it. Checked by hand
on 2026-10-30 (`node-test-tools@sha256:41eb307a…`, Node 24.22.1, pnpm 10.33.0,
Playwright 1.64.1 with only `chromium_headless_shell-1248`; store filled by `pnpm fetch`
at `/work`, suites at `--network none` as uid 1000), `unit`, `static` and the
Playwright suites pass there as they do in this image: Playwright's headless launches
already use the headless shell in both. What keeps denser on `kind: container` is the
`system` slot's `lighthouse_fixture`:

- **No Lighthouse.** The image has none. Making it a root devDependency puts it in
  `pnpm-lock.yaml`, and the commit that switches the environment is judged under the
  approved `container` image, whose store would not install that lockfile.
- **No full Chromium**, and the recording assumes it. On the headless shell (same tree,
  same image) the pass makes 18 image requests the `lighthouse` recording lacks
  (`/p/…?format=webp&mode=fit&width=640`, lazy images), so it is not hermetic. Bytes
  and request counts are the same as full Chromium's; TBT medians were lower.

A ccc image variant with Playwright's full Chromium and Lighthouse would satisfy both.
A switch also has to bring the stacks along: `dev-stack.compose.yml` and
`test-stack.compose.yml` run this image (`x-image`) with its baked store, and the
integration site's follow mode runs `environment.image`
(`stack/integration/follow/environment-image.sh`), which on the shared route names a
tag with no store. Under the shared route a project's `pnpm install` registers the
checkout in the store (`v10/projects/`), which works on the read-only mount only
because aidev's fill runs its fetch at the suites' workspace path.

## Hand-off to develop

`develop` is protected, fast-forward only and needs a green pipeline, so AIDEV
never pushes it. The profile declares `branches.handoff: develop`, and
`aidev handoff denser --session <name>` hands `aidev/integration` off to it: it
merges `develop` back into the session first if `develop` has moved, promotes,
then opens or updates the MR to `develop`, starts its pipeline and arms
auto-merge. `aidev handoff status denser` shows where that MR stands; `--dry-run`
changes nothing. While the MR is open, a promote waits for it (see the aidev
`project-handoff.md` operations doc).

`develop` is the development branch, not the release. `main` is denser's
release; people sync it from `develop` by their own process, and AIDEV never
touches it.

## CI

GitLab CI is not part of AIDEV-driven development. `ai/*` and `session/*` branches
never run a pipeline, and a push to `aidev/integration` (every promote) doesn't
start a branch pipeline either; the slots in `project.yaml` are the verification.
CI still runs for `develop`, `main`, tags and other branches.

The one exception is the hand-off: an MR from `aidev/integration` into `develop`
gets a merge-request pipeline when it is opened and again on every push
to `aidev/integration` while it stays open. It runs the same gating jobs as a
`develop` pipeline: the image builds, unit tests, the blog and wallet fixture
suites and the stable e2e suites. It doesn't run the deploy jobs, which only run on
`develop`/`main` branch pipelines. So "pipelines must succeed" is met and
auto-merge fires on success with no manual trigger. With no such MR open, a promote
runs no pipeline at all. `glab ci run -b aidev/integration` still starts a branch
pipeline by hand when one is wanted.

A job without `rules:` runs only in branch and tag pipelines. A new job that must
gate this MR needs explicit rules, or must extend `.node-job`, which has them.

CI's Lighthouse jobs (and the per-MR Lighthouse comment) have no rules, so they
don't run in this pipeline. Instead the integration site measures every promoted
revision itself: see "Lighthouse after each promote" in
`stack/integration/README.md`.

## Live dev stack (`sandbox.dev`)

An AIDEV implement session gets a running blog and wallet built from its own
working tree: `next dev` with hot reload, against the fixture replay proxy
(recorded Hive API responses, no network). It comes from the pinned image with
the checkout bind-mounted; no image is built. Compose file:
`.aidev/dev-stack.compose.yml`.

The session's shell has:

| Variable | What |
|---|---|
| `DENSER_DEV_BLOG_URL` | the blog, `http://127.0.0.1:<port>` |
| `DENSER_DEV_UI_URL` | the blog and the wallet on one origin, `http://127.0.0.1:<port>/` (below) |
| `DENSER_DEV_FIXTURE_URL` | the fixture proxy's control address |
| `DENSER_DEV_STACK_PROJECT` | the stack's compose project |
| `DENSER_DEV_CHECKOUT` | the checkout as the docker daemon sees it |

**Open a page.** `curl -s "$DENSER_DEV_BLOG_URL/trending"`. Edits under `apps/`
and `packages/` recompile on the next request (a few seconds).

**Run fixture specs against it** (from the checkout root; paths relative to
`apps/blog`; extra arguments go to `playwright test`):

```bash
.aidev/dev-stack-spec.sh playwright/tests/fixture/postDetail.spec.ts
.aidev/dev-stack-spec.sh playwright/tests/fixture/postDetail.spec.ts -g ANON-POST-07 --retries=0
```

Playwright runs in the pinned image inside the stack's network namespace, so the
topology is the fixture suite's own (blog on `localhost:3000`, proxy on
`localhost:8200`), and each spec is served its own recording. Traces land in
`test-results/dev-stack/`. This checks a change in seconds; the verdict is still
the `full` slot's `fixture_e2e` suite, which runs a production build.

**Which recording the stack serves** when no spec is running: `ssrChecks` (feeds,
a post, a profile, a community). Switch it:

```bash
curl -s -X PUT "$DENSER_DEV_FIXTURE_URL/__aidev/fixture-set/loggedInUserProfile"
curl -s "$DENSER_DEV_FIXTURE_URL/__aidev/status"
```

Recordings are the directories of `apps/blog/playwright/tests/mock/fixtures/`.

**Open it in a browser.** A browser (e.g. ad-hoc Playwright) on
`$DENSER_DEV_BLOG_URL` hydrates the page and makes its client API calls: both
apps' `allowedDevOrigins` let next dev serve `/_next/hmr` to `127.0.0.1` and
`localhost`, and the
`dev_stack` suite checks it. With fixture data those calls go to
`http://localhost:8200`, which is the proxy only inside the stack's network, so
in-page data from a browser on the host needs live data (below); for fixture
data check interactive behaviour with `.aidev/dev-stack-spec.sh`.

**Blog and wallet on one origin (`DENSER_DEV_UI_URL`).** The `edge` service
(caddy, `.aidev/dev-stack.Caddyfile`) routes `/wallet` and `/wallet/*` to the
wallet's next dev (`NEXT_PUBLIC_BASE_PATH=/wallet`, on `:4000`) and everything else
to the blog, which stays at the root with no base path. Through it:

```bash
curl -s "${DENSER_DEV_UI_URL}trending"                        # the blog
curl -s "${DENSER_DEV_UI_URL}wallet/@guest4test1/transfers"   # the wallet
```

The blog's Wallet links are `/wallet/…` (`REACT_APP_WALLET_ENDPOINT=/wallet`), so
they stay on whatever origin the page was opened at. The wallet's Blog links go
through `new URL()` and must be absolute: `REACT_APP_BLOG_DOMAIN` is the edge's
address, `http://127.0.0.1:<UI port>`, or `DENSER_DEV_UI_ORIGIN` when that is set.
Both apps share the origin, so what a sign-in on the blog stores (cookies,
`localStorage`) is the wallet's too, as on the integration site.

- **The wallet starts on its first request.** Until something opens `/wallet`, a
  placeholder holds `:4000` (`.aidev/blog-serve-dev.sh`, `DENSER_DEV_START_ON_REQUEST`)
  and `wallet-ready` is healthy without asking. The first request starts next dev;
  the edge retries it for up to 120 s, and it is answered in ~15 s, cold. Then
  `wallet-ready` warms the wallet's profile pages, proposals and witnesses.
  Measured on steem-3 (2026-10-14, `docker stats` usage, sampled every second, cold
  `.next`): with both apps compiling at boot, blog and wallet each reached their
  3 GiB `mem_limit` and the stack peaked at 6.2 GiB, past the 5.5 GiB a dev stack
  is admitted for (`sandbox.dev.memory`, default). Started lazily, the stack peaked
  at 3.2 GiB up to ready and 4.6 GiB with the wallet started, both apps' pages
  open in a browser and postDetail run; settled, ~1.2 GiB blog and ~1 GiB wallet.
  No OOM kill.
- **Viewing a session's stack from another machine.** The profile declares the
  edge as the stack's UI (`sandbox.dev.ui: {port: UI, path: /}`). On your own
  machine, with ssh access to the session host:

  ```bash
  aidev session devstack <session> open    # forwards the UI port over ssh, prints http://localhost:<port>/
  aidev session devstack <session> close   # ends the forward (also: open --stop)
  ```

  The blog is at that URL's `/` and the wallet at `/wallet`. `aidev session
  devstack <session> status` shows the declared `ui:`. Both apps admit `localhost`
  as a dev origin, so the forwarded pages hydrate and get HMR; the wallet's Blog
  links still name `127.0.0.1:<UI port>` unless the session's stack sets
  `DENSER_DEV_UI_ORIGIN` (`aidev session devstack <session> env set`).
- **Opened at another host or port** (a routable name): next dev serves its HMR
  socket and dev chunks only to `localhost`, `127.0.0.1` and the host names in
  `DENSER_DEV_ALLOWED_ORIGINS` (comma- or space-separated, read by both apps'
  `next.config.js`, which list `localhost` and `127.0.0.1` themselves); for others
  it logs `Blocked cross-origin request` and HMR fails. Start the stack with, e.g.,
  `DENSER_DEV_ALLOWED_ORIGINS=devbox.example DENSER_DEV_UI_ORIGIN=http://devbox.example:9400`
  so the wallet's Blog links name that address too. A forwarded port on
  `localhost` needs only `DENSER_DEV_UI_ORIGIN`.
- **Wallet fixture specs** do not run against this stack: they serve the wallet with
  every API on a closed port that a spec opens a stub on
  (`apps/wallet/playwright.fixture.config.ts`), while here the wallet reads the
  fixture proxy. The `full` slot's `wallet_fixture` suite runs them.
- `DENSER_DEV_BLOG_URL`, `.aidev/dev-stack-spec.sh` and the fixture-set switch are
  unchanged and reach the blog directly, not through the edge.

**Live data instead.** Start the stack with
`DENSER_DEV_API_ENDPOINT=https://api.hive.blog` and both apps talk to the live
API (needs egress; fixture specs then no longer apply).

**Mode: next dev, deliberately; it is not the production build.** The stack
serves `next dev` (Turbopack) so that an edit is visible on the next request
and a spec runs against it in seconds, with no build in between; a production
build would cost minutes per edit. A route therefore compiles on its first
request, and its timings say nothing about production. Use the stack for looking
at pages and quick spec checks; the gate stays the `full` slot's
production-build run (`fixture_e2e`). For production builds of this tree served
live, in the integration site's own topology (blog and wallet behind caddy's
`/blog` and `/wallet` routing, rebuilt as the checkout moves), start
`stack/integration/session-stack.sh up`; see "A session's stack" in
`stack/integration/README.md`. For deterministic timings, the `system` slot
(below) measures production builds against recorded data. What was seen while
qualifying the dev stack (#966):

- Playwright output written under `apps/` or `packages/` (tailwind's content
  globs put both in next's watch set) triggers a recompile mid-test; the
  browser then gets truncated chunks (`ERR_CONTENT_LENGTH_MISMATCH`,
  `ChunkLoadError`) and fails e.g. postDetail's ANON-POST-03 (vote buttons),
  -06 (pending banner) and -07 (404 page). `.aidev/dev-stack-spec.sh` writes
  to `test-results/dev-stack/` for that reason; with it postDetail is 7/7.
- The first request to a route compiles it (tens of seconds for the post
  page); `blog-ready` warms the common ones, others pay it inside the spec.
- next dev is Turbopack (Next 16). After postDetail the blog container holds
  about 1.9 GiB (4.2 GiB with 14.2's webpack); a cold compile of many routes
  drives it to its 3 GiB `mem_limit`, which Turbopack usually absorbs (8 specs,
  31 tests, from an empty `.next`, 2026-10-01), but not always (below).

**Staying up.** The blog's command is `.aidev/blog-serve-dev.sh`, not `pnpm dev`
directly. next dev runs its server in a child process. When the kernel's OOM
killer ends that child at the `mem_limit`, the parent neither restarts it nor
fails: it exits 0. Turbopack's native memory is outside `--max-old-space-size`,
so next's own heap-threshold restart does not prevent this. Up to #1132 that
ended the container with status 0 and a "Compiling …" line as its last output.
The stack monitor then recreated the blog, and it answered nothing for about a
minute (seen at least three times, 2026-10-09/10). The script logs each end as
`blog-serve-dev: next dev ended with status N after Ss; OOM kills in this
container: …` and starts next dev again in the same container (about 10 s back
to serving). Three runs in a row shorter than 120 s end the service with status
1 instead, because a restart cannot fix that kind of failure. `docker logs <blog
container> | grep blog-serve-dev` shows whether it happened.

**Health.** `blog-ready` is healthy once `/trending` has answered 200 and the
common routes are compiled, and from then on while the blog answers HTTP at
all. After that first warm-up `/trending`'s status follows the fixture proxy,
not the blog. A switched recording can turn it into an error page, and a
`dev-stack-spec.sh` run killed before its cleanup leaves the proxy relaying to
a worker proxy that is gone, so every API call answers 503. The next
`dev-stack-spec.sh` run puts the stack's recording (`FIXTURE_SET`) back;
`curl -X PUT "$DENSER_DEV_FIXTURE_URL/__aidev/fixture-set/ssrChecks"` does it
by hand. Each start of next dev writes a new id to `.next/aidev-dev-boot`, and
`blog-ready` warms the routes again for a restarted server.

**When things change.** Source edits hot-reload. A change to `pnpm-lock.yaml` or a
`package.json`, `next.config.js`, the middleware package or the stack's own files
restarts the stack's services (`reload` in the profile; either app's
`next.config.js` and the edge's Caddyfile too), which reinstalls
`node_modules` from the image's store when the lockfile or the image moved, or
when an app no longer resolves the `next`/`react` the lockfile pins
(`.aidev/pnpm-deps.sh`). An install that fails stops the service rather than
starting `next` on a half-linked tree. A lockfile the
image's store cannot satisfy needs a new `environment.image`
(`.aidev/runtime/build.sh`).

**By hand**, outside AIDEV:

```bash
export AIDEV_PORT_BLOG=3300 AIDEV_PORT_FIXTURE=8300
docker compose -f .aidev/dev-stack.compose.yml -p denser-dev up -d --wait
DENSER_DEV_STACK_PROJECT=denser-dev DENSER_DEV_CHECKOUT=$PWD \
  .aidev/dev-stack-spec.sh playwright/tests/fixture/homepage.spec.ts
docker compose -f .aidev/dev-stack.compose.yml -p denser-dev down -v
```

Files are written as uid `${AIDEV_UID:-1000}`; set `AIDEV_UID`/`AIDEV_GID` if
your checkout belongs to someone else.

**Verifying the stack itself: the `dev_stack` suite** (`.aidev/run-dev-stack.sh`,
`full` slot). No other suite boots the dev stack, so a dependency upgrade can pass
every gate and still break it (#995). When the candidate changes `pnpm-lock.yaml`,
a `package.json`, `apps/*/next.config.js`, `packages/middleware/`,
`.aidev/runtime/` or the stack's own files, the suite boots the stack twice. Each
boot uses a scratch copy under `test-results/dev-stack-work` and its own compose
project, and is torn down afterwards:

- **cold**: the candidate tree with no `node_modules`.
- **upgrade**: `node_modules` installed from the base revision's lockfile in the
  base's image, then the tree switched to the candidate. The switch keeps
  `node_modules` and the marker claims the candidate's lockfile. That is the
  state the stack met on 2026-10-01.

Each boot must be ready within `sandbox.dev.readiness_timeout`. `/trending`, a
post and a community must then answer 200 with their recorded titles, as must
`/trending` and a wallet profile through the edge (the wallet's first request,
which starts it), and postDetail's ANON-POST-01 must pass. In a browser, the post
at `127.0.0.1` and the blog and a wallet page through the edge at both `127.0.0.1`
and `localhost` (what `open` forwards to) must hydrate and open their HMR socket,
with no `Blocked cross-origin request` in either app's log. Every container with a `mem_limit` must stay
under 90% of it; the measured bytes are junit properties. Any other change gets a
skipped "not applicable" case. Junit and logs go to `test-results/dev-stack-suite/`.

Measured on this host (2026-10-01), Next 14 base to Next 16 candidate: 2m47s, all
passing. With the pre-#995 `pnpm-deps.sh`, the upgrade case serves `/trending` as a
500 and fails at the readiness timeout (11m49s in all). A failing boot therefore costs up to
`readiness_timeout`.

The suite drives docker, but AIDEV runs a container project's suites under
`docker run --network none` with no docker socket. So inside the gate it can only
report a skipped "could not run" case naming the applicable files. Run it on a
docker host (`DENSER_DEV_STACK_BASE=<rev>` picks the base). Set `AIDEV_HOST_CHECKOUT`
when the daemon sees the checkout at a different path.

## Test stack (`sandbox.compose`) and the `full` slot

`full` runs `unit`, `static`, `fixture_e2e`, `wallet_fixture`, `dev_stack` (above)
and the advisory `live_e2e`, in that order. AIDEV starts the stack (`.aidev/test-stack.compose.yml`) lazily, right
before the first `stack: true` suite. Only `live_e2e` declares one, so every
suite before it runs with no stack up, under `--network none`.

**`fixture_e2e` is self-contained and hermetic** (`stack: false`). It builds the
blog (`.aidev/run-blog-build.sh`), and `playwright.fixture.config.ts`'s webServer
serves the build inside the suite's own container. It does not use the stack
because its fixture proxy is not a service. Each Playwright worker starts one
for its spec's recording
(`apps/blog/playwright/tests/support/fixture-proxy-test.ts:61-95`), and the
app's server side must read that same proxy. A stack server could reach it only
by relaying back into the suite container.

**`live_e2e`** (`.aidev/run-live-e2e.sh`; declared `mode: advisory` with a fixed `memory: 6g` cap, so neither a
failing spec nor an OOM kill of its container fails the slot) runs the e2e specs the
candidate's change reaches, `--retries=0`, each app's against its stack server:
`blog-live` serves `fixture_e2e`'s build and `wallet-live` `wallet_fixture`'s
(base path `/wallet`), both against the live Hive API; no image is built. The
wallet's live specs open root paths (`/@gtg/transfers`), so `wallet-live` puts
`.aidev/base-path-front.mjs` in front of its server: a path outside `/wallet` is
served from under it, and the specs reach it as `http://walletlive:4000` (their
URL patterns admit no hyphen in the host). Wallet cases are recorded as
`wallet › <name>` next to the blog's. It selects the specs the candidate changed, the specs importing a changed
file (a page object, a helper, `playwright/support`; transitively, by
`.aidev/live-e2e-importers.mjs`), and, when app source (`apps/<app>/**` outside
`playwright/`, or `packages/**`) changed, that app's `SMOKE_SPECS`
(`mainTimeline.spec.ts` and `postPage.spec.ts` for the blog, `wallet.spec.ts`
for the wallet). Those run
`--repeat-each=3`; the smoke set alone runs once. The changed files come from
`AIDEV_CHANGED_FILES_FILE`, which AIDEV's gates publish, else from `git diff`
against `AIDEV_BASE_REF` or `origin/aidev/integration`. With nothing selected,
or no change information, the suite reports a skipped "not applicable" case.
`.aidev/run-live-e2e.test.mjs` (in the `unit` suite) covers the selection.
It needs no build of its own; it serves the ones `fixture_e2e` and
`wallet_fixture` made (`wallet_fixture` writes `apps/wallet/.next/aidev-build-complete`
for `wallet-live` to wait on, as `run-blog-build.sh` does for the blog).

**Opt-in: the fixture suite through the stack.** Set
`DENSER_FIXTURE_VIA_STACK=1`, and bring up the `fixture-relay` profile's
`fixture-proxy` and `blog` services. With these, the stack's `blog` serves the
build, and its `fixture-proxy` relays the server side's API calls to the
workers' proxies in the suite container. It is off by default and AIDEV never
starts those services. On the same tree (steem-17, 2026-09-30):

| path | result | time |
|---|---|---|
| standalone (default) | 247 passed / 2 skipped | 8.8 min |
| through the stack | 247 passed / 2 skipped | 9.2 min |

It buys nothing, and it gives the suite egress through the stack network. The
default stays hermetic.

## Deterministic Lighthouse pass (`system` slot)

The integration site's Lighthouse check (`stack/integration/lighthouse.sh`) measures
the live site against the live Hive API and `images.hive.blog`, whose latency and
content change between runs. The `lighthouse_fixture` suite measures the same routes
(`integration` in `scripts/ci-helpers/lighthouse-thresholds.json`), with the same
Lighthouse (13.5.0, mobile, median of 5 runs), on production builds of this tree served
from recorded data, so two passes differ only by the code and the host's CPU.

```bash
aidev test run --slot system                      # build, measure, compare with the baseline
.aidev/run-lighthouse-fixture.sh --route /blog/trending --runs 1   # in the image, narrowed
```

It is bound to `system` because AIDEV's slot names are fixed (there is no `perf`
slot) and no workflow phase requests `system` for a project: it never gates, and
it is not part of `quick` or `full`. It takes about 8 minutes (both builds with
next's build cache warm, then 30 Lighthouse runs of about 14 s each, 3 minutes more
than the 18 of 3 runs per route); a cold build cache adds a few. Each route's median
also carries the paints the browser observed (`observed-first-contentful-paint`,
`observed-largest-contentful-paint`) next to the simulated LCP the thresholds judge;
an LCP breach whose median observed LCP is under 2.5 s is labelled `simulatedOnly`.

**What runs** (`.aidev/run-lighthouse-fixture.sh`, all inside the suite's container
under `--network none`, no docker):

| | |
|---|---|
| `127.0.0.1:8000` | `lighthouse-fixture/site-router.mjs`: the integration site's routing (`/blog`, `/wallet`, else a redirect to `/blog`), caddy's `encode zstd gzip`, and follow mode's `/<app>/_next/static` from the builds' files with their `.br`/`.zst` sidecars (`static-files.mjs`) |
| `:3000`, `:4000` | `next build` of blog (`NEXT_PUBLIC_BASE_PATH=/blog`) and wallet (`/wallet`), packaged and started as follow mode does, with compose.yml's app environment |
| `:8200` | `fixture-proxy-serve.mjs` replaying the `lighthouse` recording: the API endpoint of both apps' server and client (`REACT_APP_API_ENDPOINT`, `REACT_APP_ALLOWED_HIVE_API_NODES`, `REACT_APP_AI_DOMAIN`) |
| `:8201` | `lighthouse-fixture/image-server.mjs` replaying the recorded images: `REACT_APP_IMAGES_ENDPOINT` |

It does not run `stack/integration/session-stack.sh`: that stack is docker compose,
and an AIDEV suite has no docker socket. The topology is the same one, in one
container. Lighthouse runs without its full-page screenshot, which happens after the
trace and loads every lazy image of the page; no metric reads it.

**Determinism.**
- *Data.* Every API call and every image the measured runs make is answered from
  `apps/blog/playwright/tests/mock/fixtures/lighthouse/` (API responses as the
  fixture suite's recordings are; images under `images/`, keyed by path and query,
  so each width a page asks for is its own entry).
- *Time.* The servers' and each page's `Date` start at the recording's instant
  (`_lighthouse.json` `clock`) and advance in real time
  (`lighthouse-fixture/clock.cjs`, preloaded into the servers and injected first
  into each document's `<head>` by the router, about 0.6 KB). "x hours ago", payout
  windows and server/client hydration agree with the data, and requests that carry a
  time match the recording.
- *Nothing leaves the host, asserted:* a request in any Lighthouse report to a host
  other than the three above, a connection the app servers open off the host
  (`lighthouse-fixture/egress-guard.cjs` refuses and logs it), or a replay MISS on the
  API or image server fails the pass (`hermetic` in the result). The servers' own
  `/__aidev/` paths, the harness's readiness and status requests, are never counted;
  the image server's misses are listed by path (`hermetic.missed`). A Chromium update
  can change which lazy images load after the trace (156 loads feed thumbnails and
  avatars 153 did not): a missed path that no report's `network-requests` lists is
  recorded as `prune` records it, a 404 with no body.

**Server heap.** After the Lighthouse runs, `lighthouse-fixture/heap-check.mjs` renders
the blog routes 300 times to warm up, then 1,000 more (16 concurrent), reading
`/blog/api/debug/mem` after forced GCs before and after (the blog server runs with
`--expose-gc` and `DENSER_DEBUG_MEM=true`). The case fails when `heapUsed` grew more
than 50 MB or the pending `Timeout`s grew by more than 50: on Node 24 a timer keeps
the request it was created in reachable until it fires, so a render that leaves one
behind retains the whole request. Log: `logs/heap-check.log`.

**Results** in `test-results/lighthouse-fixture/`: `result.json` (the integration
check's shape, `status` `pass` | `breach` | `regression` | `leaked`, plus `hermetic`
and `comparison`), each run's report under `reports/`, the servers' logs under
`logs/`, and `junit.xml` (a case per build step and per route, the route's medians as
properties).

**Reading the comparison.** Each route's medians are compared with
`.aidev/lighthouse-fixture/baseline.json` (`DENSER_LIGHTHOUSE_BASELINE` names another).
A metric regresses when it moves the wrong way by more than
max(relative × baseline, absolute) (`scripts/ci-helpers/lighthouse-compare.js`):

| metric | tolerance | why |
|---|---|---|
| script transfer bytes | 2 KiB | rebuilds of one tree serve byte-identical chunks; passes differ by response-header bytes (≤ 28 B measured) |
| image, total transfer bytes | 2 %, at least 2 KiB (total: 4 KiB) | identical between runs of one tree |
| request count | 2 requests | identical between replayed passes; a lazy image can land on either side of the trace's end |
| LCP | 25 %, at least 500 ms | follows the host's CPU |
| TBT | 50 %, at least 250 ms | follows the host's CPU |
| CLS | 0.05 | |
| performance score | 10 points down | |

Each run also keeps Lighthouse's CPU benchmark (`benchmark-index`). When a route's
median benchmark is more than 15% below the baseline's, the host was slower than when
the baseline was measured, and an LCP, TBT or score regression on it is an advisory
(`comparison.advisories`, ⚠️) that does not fail the pass; bytes and requests are
judged the same either way.

The output lists every metric as `baseline -> current (delta, tolerance)`, each
route headed by its CPU benchmark, and marks regressions with ❌. Bytes are the
signal: a byte or request regression is the code. An LCP or TBT regression with
unchanged bytes is worth re-running before believing, more so on another host than
the baseline's.

**Spread** of two consecutive passes of one tree (steem-3, 2026-10-06; medians of
pass 1 / pass 2, and the range of all 6 runs):

| route | LCP median (ms) | LCP runs | TBT median (ms) | TBT runs | score | JS bytes | image bytes | requests |
|---|---|---|---|---|---|---|---|---|
| `/blog/trending` | 4774 / 5000 | 4613–5152 | 362 / 381 | 344–403 | 74 / 73 | same | same | same |
| `/blog/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit` | 4914 / 4990 | 4913–5285 | 1219 / 1274 | 1138–1298 | 57 / 57 | -14 B | same | same |
| `/blog/hive-163772/@ibarra95/visiting-the-desparramaderos-waterfall-nature` | 7450 / 7360 | 5557–7510 | 598 / 608 | 584–635 | 61 / 60 | same | same | same |
| `/blog/trending/hive-160391` | 3908 / 3906 | 3757–4207 | 612 / 641 | 594–700 | 71 / 72 | same | same | same |
| `/blog/@gtg` | 5916 / 5311 | 5309–5932 | 380 / 379 | 362–393 | 69 / 71 | same | same | same |
| `/wallet/@gtg/transfers` | 6394 / 6429 | 6224–6435 | 732 / 743 | 709–821 | 59 / 59 | same | same | same |

Response bodies are byte-identical; the 14 B are a response header that depends on
whether a chunk came over a new or a reused connection. On a busier host (load
average 15 against 5) the wallet's TBT median was 1742 ms against 730 ms, with LCP
and bytes unchanged: what the CPU benchmark rule above is for. A deliberate
regression, 100 KB of incompressible JavaScript imported by `/trending`'s client
component, was reported as `script-transfer-bytes: 512.7 KiB -> 590.1 KiB (+77.3 KiB,
tolerance 10.3 KiB)` (zstd shrinks base64 to three quarters) and failed the pass,
with LCP and TBT within their tolerances.

**Reproducible builds.** Every build of one tree, cold or warm `.next/cache`, emits the
same `static/chunks` byte for byte; only the random build ID's directory
(`_buildManifest.js` and friends, which App Router pages do not load) differs. Both
apps set `useRunAfterProductionCompileHook: false` in `withSentryConfig` to keep it
so: with Turbopack the hook defaults on and, sourcemaps disabled or not, injects
Sentry debug IDs into every `.js` under `.next`, following Turbopack's
`.next/node_modules/<pkg>-<hash>` symlinks into the workspace `node_modules`
(about 4,600 files of `next`, `dayjs`, `zod`, …). The next build then bundled those
rewritten sources, so the blog's shared JS was ~12 KB heavier on any checkout that
had been built before. A `node_modules` built before that setting keeps the
rewritten files until it is reinstalled from scratch.

**Updating the baseline.** After a change that is meant to move the numbers (or on a
new host): `.aidev/run-lighthouse-fixture.sh --update-baseline`, in the image, and
commit `.aidev/lighthouse-fixture/baseline.json`. It is written only by a pass that is
hermetic and within thresholds. Its `revision` is the commit checked out when it was
measured: a baseline taken with uncommitted changes names their parent, so say here
what the measured tree was.

The current baseline (2026-10-25, `revision` a4382d977) is that tree plus #1326's trims,
which took the code three features had leaked into every page's initial chunks back out:
the For You client (`fyp-api.ts`, pulled in for its paging helper), safe storage's
generation bookkeeping (pulled in for its cross-tab subscription) and Rocket.Chat's
drawer (now loaded only for a user it renders for). The rest of the growth since the
2026-10-14 baseline (815c7a2a) was accepted as the cost of features: the blog's
English strings (a chunk of their own), the login key and authority labels in both
headers, hivemind REST reads and hidden authors, the Matrix chat configuration and
background broadcast confirmation, partly offset by `handle-error` leaving the blog's
initial chunks. Script transfer bytes, 815c7a2a rebuilt on the same host -> the
current baseline:

| route | 815c7a2a | before the trims | current baseline |
|---|---|---|---|
| `/blog/trending` | 364,324 | 368,439 | 366,330 |
| `/blog/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit` | 452,225 | 452,972 | 451,187 |
| `/blog/trending/hive-160391` | 377,924 | 382,267 | 380,177 |
| `/blog/@gtg` | 371,578 | 375,115 | 373,330 |
| `/wallet/@gtg/transfers` | 474,805 | 480,778 | 480,376 |

To attribute a change in bytes to source files, build both trees with
`productionBrowserSourceMaps: true` in each app's `next.config.js` (the chunks keep
their content, but not their names), run this pass on each with `--runs 1`, and weigh
each chunk a route's report lists by the generated bytes its source map gives each
file, scaled to the chunk's transfer size. Turbopack bundles a module whole, so one
named import of a small helper brings everything else its file holds.

**Refreshing the recordings.** Recording needs egress, so it runs in the image without
`--network none`, from the checkout as the docker daemon sees it:

```bash
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/work -w /work \
    registry.gitlab.syncad.com/hive/denser/aidev-tests@sha256:<environment.image digest> \
    .aidev/run-lighthouse-fixture.sh --record
```

`--record` serves the same site with `fixture-proxy-serve.mjs` recording from
`api.hive.blog` (`PUT /__aidev/record/<name>`, `FIXTURE_RECORD_TARGET` for another
node) and the image server recording from `images.hive.blog`, with the clock at the
recording's start. It runs every route as the pass does (5 runs, so feed-cache hits
and misses are both seen), then writes `_index.json` and `_lighthouse.json`. Images
no measured run's report lists (Lighthouse probes lazy images at full size after its
trace) are kept as bodiless 404s (`image-server.mjs prune`), which keeps the set at
about 7 MB. A recording replaces the set: after one, run `--update-baseline` and
commit both. Do it when a route is added to `lighthouse-thresholds.json` (a route
without a recording MISSes), or when the pages start making requests the recording
lacks.
