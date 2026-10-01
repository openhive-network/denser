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

Without registry rights, push the input change to a branch that runs the
`aidev-tests-image` CI job (`aidev/integration`, `develop`): the job builds and pushes
the image and fails with the reference to put in `project.yaml`; commit that digest.

### The `aidev-tests-image` CI job

Runs on `aidev/integration` and `develop` when an input, `runtime/` or `project.yaml`
changes. It runs `build.sh --push` (under a minute when the image exists) and fails
when `environment.image` or a compose file's `x-image` isn't the image of the
committed inputs, printing the reference to use.

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
Server-rendered HTML reads the stack's proxy; in-page requests from a browser go
to `http://localhost:8200`, which only `.aidev/dev-stack-spec.sh` provides — so
check interactive behaviour with a spec, not a browser pointed at the URL.

**Live data instead.** Start the stack with
`DENSER_DEV_API_ENDPOINT=https://api.hive.blog` and the blog talks to the live
API (needs egress; fixture specs then no longer apply).

**Known limitation: next dev is not the production build.** The stack is for
looking at pages and quick spec checks; the gate stays the `full` slot's
production-build run. What was seen while qualifying it (#966):

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
