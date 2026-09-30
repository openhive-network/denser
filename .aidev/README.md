# denser under AIDEV

`.aidev/project.yaml` is denser's AIDEV profile. The suites it binds run in the
digest-pinned `registry.gitlab.syncad.com/hive/denser/aidev-tests` image
(`.aidev/runtime/`), offline, and write junit under `test-results/`.

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
- next dev logs warnings the build does not fail on (e.g. `useForm` is not
  exported from `react-hook-form` in smart-signer's password form).

**When things change.** Source edits hot-reload. A change to `pnpm-lock.yaml` or a
`package.json`, `next.config.js`, the middleware package or the stack's own files
restarts the stack's services (`reload` in the profile), which reinstalls
`node_modules` from the image's store when the lockfile moved. A lockfile the
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
