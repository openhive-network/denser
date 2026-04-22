# Fixture-Mode Testing Guide

> **Keep this doc in sync.** If you change anything under
> `playwright/tests/support/fixture-auth/`, the interceptor stub list,
> the fixture-proxy, the seeder, the generator, or the record/replay
> workflow, update the affected section below in the same commit.
> Out-of-date guidance here is worse than no guidance — future agents
> trust what's written and waste a session rediscovering the truth.
>
> Rule of thumb: if you added a new gotcha during your session, add it
> to the Gotchas list. If you added a new recipe, add it to Recipes.
> If you touched anything in `fixture-auth/`, sanity-check the
> "How the pieces fit together" section against reality.

Playwright specs in this directory run fully offline: no chain, no real
signing, no live API. They pre-seed a logged-in user, stub broadcast-class
RPCs at the browser level, and replay all read-only chain data from
committed JSON fixtures. One test = one reproducible UI flow.

Use this guide when adding a new fixture test.

---

## Layout

```
apps/blog/
├── playwright.fixture.config.ts                           # Playwright config (webServer, env overrides)
└── playwright/tests/
    ├── fixture/                                           # the spec files (this directory)
    ├── mock/fixtures/<testName>/                          # recorded JSON-RPC pairs per test
    └── support/
        ├── fixture-proxy-test.ts                          # `test` + `expect` exports, worker-scope proxy
        ├── mock-server/fixture-proxy.ts                   # record/replay HTTP proxy on :8200
        └── fixture-auth/
            ├── constants.ts                               # shared cookie name + dummy password
            ├── seeder.ts                                  # seedAuthCookie — iron-session + localStorage
            ├── broadcast-interceptor.ts                   # page.route that stubs mutation RPCs
            └── generate-voted-variants.mjs                # fixture-dir post-processor
```

Config uses two ports:

- `:3000` — the blog app (standalone Next.js server)
- `:8200` — the fixture proxy (record → mainnet; replay → committed JSON)

---

## How the pieces fit together

### Login state

The app's normal login flow signs a random-per-run transaction with a
posting WIF and POSTs to `/api/auth/login`, which calls
`database_api.verify_authority` on the chain. None of that replays
deterministically.

Instead, `seedAuthCookie(context)` (in `fixture-auth/seeder.ts`):

1. Seals an `IronSessionData` envelope with the dummy password from
   `fixture-auth/constants.ts` and injects it as the `blog_session`
   cookie. Satisfies server-side handlers (e.g. `/api/users/me`).
2. Runs an `addInitScript` that writes the same `User` into
   `localStorage['user']`. Without this, `useUserCore`'s
   `useQuery({initialData: storedUser, refetchOnMount: false})` locks the
   client into the anonymous state even with a valid cookie.
3. If `CI_TEST_USER_WIF_POSTING` is set, also writes
   `localStorage['wif.{username}@posting']` so `signer-wif.ts` signs
   without popping a password dialog. WIF just needs valid Hive format —
   it does not need to match a real account.

Opt in per spec with `test.use({ authenticatedUser: {} })`. Pass a
`Partial<User>` to override defaults (loginType, keyType, etc.).

### Mutation stubs

Client wax posts to `http://localhost:8200` (pinned via
`REACT_APP_API_ENDPOINT` in `playwright.fixture.config.ts`). Read-only
calls flow through the fixture proxy and hit committed JSON. Mutation-class
calls are intercepted by `installBroadcastInterceptor(page)` before the
proxy and get canned responses:

| Method                                     | Canned result  |
| ------------------------------------------ | -------------- |
| `network_broadcast_api.broadcast_transaction` (+ condenser / _synchronous variants) | `null` |
| `database_api.verify_authority` / `condenser_api.verify_authority`                  | `{valid:true}` / `true` |

`verify_authority` must be stubbed: wax calls it before broadcasting, and
the seeded WIF won't match the real account's posting authorities, so the
chain answers "missing posting authority" and the flow aborts before
broadcast.

The interceptor's `calls[]` array captures broadcast payloads so tests
can assert on the produced transaction (the test plan's TX-04).

### Fixture proxy modes

Controlled by `FIXTURE_MODE`:

- `record` — proxy forwards to `api.hive.blog` and writes each unique
  `(method, params)` pair to `mock/fixtures/<testName>/NNNN-<method>.json`
  + an `_index.json`. Requires network.
- `replay` (default) — proxy serves from disk. No network. Deterministic.

Fixture dir is selected per worker via `test.use({ fixtureTestName })`.
It is **worker-scoped**: you cannot change it per `test.describe` inside
a single file. One fixture dir → one spec file.

---

## Quick start — write a new fixture test

### 1. Pick a `fixtureTestName`

Short, descriptive. No path separators. The proxy will write to
`playwright/tests/mock/fixtures/<name>/`.

### 2. Scaffold the spec

```ts
import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';

test.use({
  fixtureTestName: 'myNewScenario',
  authenticatedUser: {} // omit for anonymous tests
});

test('does the thing', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page);

  await page.goto('/trending');

  // REQUIRED for logged-in specs: wait for client hydration.
  // App Router's useUserCore flips user to defaultUser during mount,
  // which re-renders post cards into their anonymous branch for a beat.
  // Clicking during that window opens a login dialog instead of the
  // real handler. Wait for the nav to settle into its logged-in state:
  await expect(page.getByTestId('login-btn')).toBeHidden();

  // ... interactions ...
});
```

### 3. Record fixtures

```bash
pnpm --filter @hive/blog test:fixture:record -- myNewScenario
```

Writes `mock/fixtures/myNewScenario/` with whatever RPCs the test hit.

### 4. Replay

```bash
pnpm --filter @hive/blog test:fixture -- myNewScenario
```

Runs offline. Commit `spec.ts` + `mock/fixtures/myNewScenario/` together.

---

## Recipe: assert a produced vote broadcast (TX-04)

```ts
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';

const broadcast = await installBroadcastInterceptor(page);
// ... do the click ...
await broadcast.waitForCount(1);

expectVoteOperation(broadcast.calls[0], {
  voter: 'guest4test',
  author: 'some-author',
  permlink: 'some-permlink',
  weight: 10000 // 100%; negative for downvote; 0 for removal
});
```

`expectVoteOperation` walks `params.trx.operations[0]` and asserts
`type === 'vote_operation'` plus the supplied fields. For other
operation types (`custom_json`, `comment`, etc.), inspect `broadcast.calls[i].params` directly and assert its shape.

---

## Recipe: the user should see a "previously voted" post

SSR fetches post data server-side, so `page.route` cannot override
`bridge.get_ranked_posts` or `database_api.list_votes` for the initial
render. Instead, produce a **separate fixture dir** with pre-patched
responses:

1. Record a base scenario (e.g. `postVoting/`).
2. Extend `generate-voted-variants.mjs` — add an entry to the `VARIANTS`
   array describing what to patch.
3. Run the generator: `node generate-voted-variants.mjs`. It copies the
   base dir and applies patches to specific fixture files.
4. Point the spec at the variant:
   `test.use({ fixtureTestName: 'postVoting_upvoted' })`.

Existing flags the generator supports:

- `priorVote: { votePercent, rshares }` — injects the seeded user into
  the first post's `active_votes` and rewrites the `list_votes`
  response so the UI renders the "already voted" branch.
- `highHP: true` — bumps the seeded user's `vesting_shares.amount` to
  50M VESTS, flipping `enable_slider` true on vote components.

Combine flags as needed (e.g. `highHP` + `priorVote` → slider path on
an already-voted post).

---

## Recipe: test the slider popover

Use the existing `VotingSlider` POM and a high-HP fixture variant. The
drag snaps to integers within ±1–2 of the target, so read the achieved
percent and feed it into TX-04:

```ts
import { VotingSlider } from '../support/pages/votingSlider';

await page.getByTestId('upvote-button').first().click();
const slider = new VotingSlider(page);
await expect(slider.upvoteSliderModal).toBeVisible();

await slider.moveCustomSlider(
  slider.upvoteSliderTrack,
  slider.upvoteSliderThumb,
  73, // target
  1, 100 // min, max
);

const displayed = await slider.upvoteSliderPercentageValue.textContent();
const percent = parseInt((displayed ?? '0').replace('%', '').trim(), 10);
// For downvote, label is hardcoded `-{sliderDownvote}%` — use Math.abs().

await page.getByTestId('upvote-button-slider').click();
await broadcast.waitForCount(1);
expectVoteOperation(broadcast.calls[0], {
  voter: 'guest4test',
  author: '...',
  permlink: '...',
  weight: percent * 100 // slider displays %, vote op uses basis points
});
```

---

## Gotchas

### `page.route` doesn't intercept SSR requests

`page.goto('/trending')` hits Next.js, which fetches post data from its
own process — those fetches bypass the browser. Only browser-initiated
requests (XHR/fetch from page scripts) flow through `page.route`. For
SSR-visible data, patch the fixture dir, not the test.

### Wait for hydration before interacting on logged-in pages

`useUserCore` uses an `isMounted` guard that briefly resolves user to
`defaultUser` between SSR and mount. Post cards re-render into their
anonymous (DialogLogin-wrapped) branch for that window. Clicking mid-flight
opens a login dialog instead of the real handler. Always:

```ts
await expect(page.getByTestId('login-btn')).toBeHidden();
```

before the first interaction.

### Toast text matches twice — use `{ exact: true }`

Radix/shadcn toasts render the description into both a visible `<div>`
and an `aria-live="assertive"` `<span>` that concatenates title +
description. `getByText('You have successfully upvoted.')` matches both
→ strict-mode violation. Pass `{ exact: true }`:

```ts
await expect(
  page.getByText('Your vote has been removed.', { exact: true })
).toBeVisible();
```

### Downvote slider label has a leading minus

`votes-component.tsx` renders `{-sliderDownvote}%` (hardcoded `-`
prefix), while the underlying state is positive. `parseInt` returns a
negative number for the displayed text. Wrap with `Math.abs()` before
using the value.

### Fixtures are record-time-dependent

Recorded `bridge.get_ranked_posts` freezes whatever was trending at
record time. Specs pin the first post's author/permlink as module-level
constants (e.g. `FIRST_POST_AUTHOR`). If someone re-records, they must
update the constants in any spec that uses them.

### `fixtureTestName` is worker-scoped

You cannot switch fixture dirs per `test.describe` in one file. Each
distinct fixture dir needs its own spec file. This is why the voting
suite has 9 spec files, not one.

### Client wax's endpoint comes from `__ENV.js`, not compile-time env

Client-side wax reads `siteConfig.endpoint = env('API_ENDPOINT')` via
`@beam-australia/react-env`, which writes `public/__ENV.js` at server
startup. `playwright.fixture.config.ts` sets `REACT_APP_API_ENDPOINT`
**and** `REACT_APP_ALLOWED_HIVE_API_NODES` (needed for CSP's
`connect-src`) in `webServer.env` so both values land in `__ENV.js`.

The `webServer.command` also copies the freshly-written `__ENV.js` into
the standalone build's `public/` before starting node — otherwise the
client would load a stale copy baked into the build.

### Re-recording overwrites the fixture dir

`createFixtureProxy` wipes `mock/fixtures/<testName>/` on record-mode
start. If you have hand-generated variants (via
`generate-voted-variants.mjs`), re-running record for the base will not
touch them, but re-running the generator will wipe and regenerate them
from the fresh base.

---

## Record / regenerate workflow

Normal cycle after changing infrastructure or app code that affects
fixtures:

```bash
# 1. Re-record the base fixture dir (requires network to api.hive.blog):
pnpm --filter @hive/blog test:fixture:record -- postVoting.spec.ts

# 2. Regenerate any derived variants:
node apps/blog/playwright/tests/support/fixture-auth/generate-voted-variants.mjs

# 3. Verify replay passes:
pnpm --filter @hive/blog test:fixture -- postVoting
```

Headed mode for debugging:

```bash
pnpm --filter @hive/blog test:fixture:headed -- postVoting
```

---

## What to add when extending coverage

**New operation type** (e.g. `custom_json`, `transfer`, `comment`):
generalize `expectVoteOperation` into `expectOperation(call, {type, ...fields})`
or add a sibling helper in `broadcast-interceptor.ts`. Keep the canned-result
map in sync if the new operation's broadcast path needs a different stub.

**New pre-state** (e.g. user is subscribed to a community): add a flag
to the generator `VARIANTS` entry and teach the loop to patch the
relevant fixture file. Keep patches surgical — modify the smallest set
of files that makes the pre-state visible to the UI.

**Pre-voted with a specific author/permlink**: patch both
`bridge.get_ranked_posts` (active_votes) **and**
`database_api.list_votes` (response). Only patching one or the other
leaves the component in an inconsistent state.
