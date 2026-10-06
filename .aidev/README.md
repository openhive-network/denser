# denser under AIDEV

`.aidev/project.yaml` is denser's AIDEV profile. The suites it binds run in the
digest-pinned `registry.gitlab.syncad.com/hive/denser/aidev-tests` image
(`.aidev/runtime/`), offline, and write junit under `test-results/`.

## The test runtime image (`runtime/`)

Suites run offline in `registry.gitlab.syncad.com/hive/denser/aidev-tests`, pinned
by digest in `project.yaml` (`environment.image`). The image holds Node, pnpm,
Playwright's Chromium and every package `pnpm-lock.yaml` resolves.

Its tag is `aidev-` plus a hash of its inputs: `runtime/Dockerfile`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, `.npmrc` and the `packageManager` field of `package.json`.
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

## CI

GitLab CI is not part of AIDEV-driven development. `ai/*` and `session/*` branches
never run a pipeline, and a push to `aidev/integration` (every promote) doesn't
either; the slots in `project.yaml` are the verification. CI still runs for
`develop`, `main`, tags and other branches. Before merging the `aidev/integration`
MR into `develop` (which requires a successful pipeline), start one by hand:
`glab ci run -b aidev/integration`.

CI's per-MR Lighthouse comment doesn't run for AIDEV work either. Instead the
integration site measures every promoted revision itself: see "Lighthouse after each
promote" in `stack/integration/README.md`.

## Live dev stack (`sandbox.dev`)

An AIDEV implement session gets a running blog built from its own working tree:
`next dev` with hot reload, against the fixture replay proxy (recorded Hive API
responses, no network). It comes from the pinned image with the checkout
bind-mounted; no image is built. Compose file: `.aidev/dev-stack.compose.yml`.

The session's shell has:

| Variable | What |
|---|---|
| `DENSER_DEV_BLOG_URL` | the blog, `http://127.0.0.1:<port>` |
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
apps' `allowedDevOrigins` let next dev serve `/_next/hmr` to `127.0.0.1`, and the
`dev_stack` suite checks it. With fixture data those calls go to
`http://localhost:8200`, which is the proxy only inside the stack's network, so
in-page data from a browser on the host needs live data (below); for fixture
data check interactive behaviour with `.aidev/dev-stack-spec.sh`.

**Live data instead.** Start the stack with
`DENSER_DEV_API_ENDPOINT=https://api.hive.blog` and the blog talks to the live
API (needs egress; fixture specs then no longer apply).

**Known limitation: next dev is not the production build.** The stack is for
looking at pages and quick spec checks; the gate stays the `full` slot's
production-build run. For the integration site's own topology (blog and wallet
production builds behind caddy's `/blog` and `/wallet` routing, rebuilt as the
checkout moves), start `stack/integration/session-stack.sh up`; see "A session's
stack" in `stack/integration/README.md`. What was seen while qualifying it (#966):

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
  drives it to its 3 GiB `mem_limit`, which Turbopack absorbs without an OOM
  kill (8 specs, 31 tests, from an empty `.next`, 2026-10-01).

**When things change.** Source edits hot-reload. A change to `pnpm-lock.yaml` or a
`package.json`, `next.config.js`, the middleware package or the stack's own files
restarts the stack's services (`reload` in the profile), which reinstalls
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
post and a community must then answer 200 with their recorded titles, and
postDetail's ANON-POST-01 must pass. Every container with a `mem_limit` must stay
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

`full` runs `unit`, `static`, `fixture_e2e`, `dev_stack` (above) and the advisory
`live_e2e`, in that order. AIDEV starts the stack (`.aidev/test-stack.compose.yml`) lazily, right
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

**`live_e2e`** (`.aidev/run-live-e2e.sh`, always exits 0) runs the e2e specs the
candidate changed, `--repeat-each=3 --retries=0`, against the stack's
`blog-live`. That service serves `fixture_e2e`'s build against the live Hive
API; no image is built. The changed files come from `AIDEV_CHANGED_FILES_FILE`,
else from `git diff` against `AIDEV_BASE_REF` or `origin/aidev/integration`.
With no e2e spec changed, or no change information, the suite reports a skipped
"not applicable" case. With the worktree backend that happens until
ai/aidev#14456 lands, because the workspace has no git and no base reaches the
container. It needs no build of its own; it serves the one `fixture_e2e` made.

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
Lighthouse (13.5.0, mobile, median of 3 runs), on production builds of this tree served
from recorded data, so two passes differ only by the code and the host's CPU.

```bash
aidev test run --slot system                      # build, measure, compare with the baseline
.aidev/run-lighthouse-fixture.sh --route /blog/trending --runs 1   # in the image, narrowed
```

It is bound to `system` because AIDEV's slot names are fixed (there is no `perf`
slot) and no workflow phase requests `system` for a project: it never gates, and
it is not part of `quick` or `full`. It takes about 5 minutes (both builds with
next's build cache warm, then 18 Lighthouse runs); a cold build cache adds a few.

**What runs** (`.aidev/run-lighthouse-fixture.sh`, all inside the suite's container
under `--network none`, no docker):

| | |
|---|---|
| `127.0.0.1:8000` | `lighthouse-fixture/site-router.mjs`: the integration site's routing (`/blog`, `/wallet`, else a redirect to `/blog`) and caddy's `encode zstd gzip` |
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
  API or image server fails the pass (`hermetic` in the result).

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
| script, image, total transfer bytes | 2 %, at least 2 KiB (total: 4 KiB) | identical between runs of one tree |
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

**Updating the baseline.** After a change that is meant to move the numbers (or on a
new host): `.aidev/run-lighthouse-fixture.sh --update-baseline`, in the image, and
commit `.aidev/lighthouse-fixture/baseline.json`. It is written only by a pass that is
hermetic and within thresholds.

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
recording's start. It runs every route as the pass does (3 runs, so feed-cache hits
and misses are both seen), then writes `_index.json` and `_lighthouse.json`. Images
no measured run's report lists (Lighthouse probes lazy images at full size after its
trace) are kept as bodiless 404s (`image-server.mjs prune`), which keeps the set at
about 7 MB. A recording replaces the set: after one, run `--update-baseline` and
commit both. Do it when a route is added to `lighthouse-thresholds.json` (a route
without a recording MISSes), or when the pages start making requests the recording
lacks.
