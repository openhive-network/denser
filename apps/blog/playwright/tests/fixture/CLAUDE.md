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
        ├── postVotingContext.ts                           # shared voter/post constants + hydration helpers
        ├── pages/                                         # Page Object Models (use these, don't roll your own locators)
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
import { HomePage } from '../support/pages/homePage';
import { gotoTrendingLoggedIn } from '../support/postVotingContext';

test.use({
  fixtureTestName: 'myNewScenario',
  authenticatedUser: {} // omit for anonymous tests
});

test('does the thing', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page);

  // Goto + wait for App Router hydration to settle on logged-in state.
  // (See "Wait for hydration" gotcha below for why this is non-optional
  // on logged-in pages.)
  await gotoTrendingLoggedIn(page);

  // Prefer POM locators over raw `page.getByTestId(...)` — the project
  // convention is that all UI access goes through a Page Object Model.
  await new HomePage(page).getFirstPostUpvoteButton.click();

  // ... assertions ...
});
```

For voting specs, prefer `postVotingContext.ts`:

- `VOTER`, `FIRST_POST_AUTHOR`, `FIRST_POST_PERMLINK` — seeded user &
  first-post identity in the committed fixtures.
- `FULL_UPVOTE` / `FULL_DOWNVOTE` / `REMOVE_VOTE` — named weights
  (avoid `10000` / `-10000` / `0` magic numbers).
- `SLIDER_TARGET_PERCENT` / `SLIDER_DRAG_TOLERANCE` /
  `BASIS_POINTS_PER_PERCENT` / `SLIDER_MIN` / `SLIDER_MAX` — slider
  test tuning.
- `gotoTrendingLoggedIn(page)` — see above.
- `expectFirstPostUpvotedState(page)` /
  `expectFirstPostDownvotedState(page)` — use in "undo" specs before
  clicking, to wait for the filled vote icon (`bg-destructive-icon` /
  `bg-gray-600`) to appear. See "list_votes race" gotcha below.

### 3. Record fixtures

```bash
# Per-spec record (the only safe form — see warning below):
cd apps/blog && FIXTURE_MODE=record pnpm exec \
  playwright test --config=playwright.fixture.config.ts myNewScenario
node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs \
  apps/blog/playwright/tests/mock/fixtures/myNewScenario
```

Writes `mock/fixtures/myNewScenario/` with whatever RPCs the test hit,
then trims `active_votes` arrays so the fixture stays small.

> ⚠️ **Do not use `pnpm --filter @hive/blog test:fixture:record -- myNewScenario`**
> for per-spec recording. The script chain ends with `&& pnpm run test:fixture:trim`,
> and pnpm appends `--` args to the LAST command in the chain — so the
> filter goes to `trim-fixtures`, never to `playwright`, and the recorder
> re-records EVERY spec in the suite, wiping all committed fixture dirs.
> Run the chained form ONLY when you genuinely want to re-record everything.

### 4. Replay

```bash
pnpm --filter @hive/blog test:fixture -- myNewScenario
```

Runs offline. Commit `spec.ts` + `mock/fixtures/myNewScenario/` together.
(Replay is safe with the script wrapper because `test:fixture` has no
trailing trim command — the `--` arg lands on `playwright test` as
intended.)

---

## Recipe: assert a produced vote broadcast (TX-04)

```ts
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';
import {
  VOTER,
  FIRST_POST_AUTHOR,
  FIRST_POST_PERMLINK,
  FULL_UPVOTE
} from '../support/postVotingContext';

const broadcast = await installBroadcastInterceptor(page);
// ... do the click ...
await broadcast.waitForCount(1);

expectVoteOperation(broadcast.calls[0], {
  voter: VOTER,
  author: FIRST_POST_AUTHOR,
  permlink: FIRST_POST_PERMLINK,
  weight: FULL_UPVOTE // or FULL_DOWNVOTE, REMOVE_VOTE
});
```

`expectVoteOperation` walks `params.trx.operations[0]` and asserts
`type === 'vote_operation'` plus the supplied fields. For other
operation types (`custom_json`, `comment`, etc.), inspect `broadcast.calls[i].params` directly and assert its shape.

---

## Recipe: assert a "mark all notifications as read" broadcast (§14)

`transactionService.markAllNotificationAsRead(date, { observe: true })` emits
ONE `custom_json_operation` with `id: "notify"` and a JSON tuple
`["setLastRead", { date }]`. The `date` is `new Date().toISOString()` minus the
trailing `.SSSZ`, so it can't be pinned — `expectNotifyCustomJson` asserts the
`YYYY-MM-DDTHH:mm:ss` wire format instead.

```ts
import {
  installBroadcastInterceptor,
  expectNotifyCustomJson
} from '../support/fixture-auth/broadcast-interceptor';

// observe:true → confirmInBlock is MANDATORY (same as §9 social ops).
const broadcast = await installBroadcastInterceptor(page, undefined, {
  confirmInBlock: true
});
await page.getByRole('button', { name: 'Mark all as read' }).click();
await broadcast.waitForCount(1);
expectNotifyCustomJson(broadcast.calls[0], { required_auth: 'gtg' });
```

The "Mark all as read" control only renders for the account owner with
`unread !== 0` (`notification-content.tsx`). The `notifications` spec logs in
AS the profile owner (`authenticatedUser: { username: 'gtg' }`) and views
`/@gtg/notifications`; the committed `bridge.unread_notifications` fixture
freezes `unread: 3`, so the button is always present at replay time regardless
of gtg's live read state. There is no per-notification "mark as read" control
in the app — only "mark all".

## Recipe: assert a follow / mute / blacklist broadcast (§9)

All social-graph operations (follow, unfollow, mute, unmute, blacklist,
follow-blacklist, follow-muted-list, the four reset variants, plus the
per-row remove operations) flow through wax's `FollowOperation` and
emit ONE `custom_json_operation` with `id: "follow"` and a JSON tuple
of shape `["follow", { follower, following, what }]`.

Use `expectFollowCustomJson` to assert the payload:

```ts
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import {
  FOLLOWER,
  FOLLOW_TARGET_USER,
  WHAT_FOLLOW,            // ['blog']      | follow
  WHAT_UNFOLLOW,          // [''] (UNFOLLOW action)
  WHAT_MUTE,              // ['ignore']
  WHAT_UNMUTE,            // ['']  unmute aliases to unfollow in wax
  WHAT_BLACKLIST,         // ['blacklist']
  WHAT_UNBLACKLIST,       // ['unblacklist']
  WHAT_FOLLOW_BLACKLIST,  // ['follow_blacklist']
  WHAT_FOLLOW_MUTED,      // ['follow_muted']
  WHAT_RESET_MUTED_LIST,  // ['reset_muted_list']  ← what resetBlogList() emits
  WHAT_RESET_BLACKLIST,   // ['reset_blacklist']
  followingFromOtherBlogs,// (target) => ['', target]
  RESET_FOLLOWING_TARGET, // 'all'
  gotoProfileLoggedIn,
  gotoOwnList
} from '../support/followMuteContext';

// confirmInBlock IS MANDATORY here: every §9 mutation uses
// transactionService.X({ observe: true }), so WorkerBee needs the
// captured trx delivered in a synthetic block before the React Query
// onSuccess fires the toast and invalidates the cache.
const broadcast = await installBroadcastInterceptor(page, undefined, {
  confirmInBlock: true
});
await gotoProfileLoggedIn(page);                       // /@hiveio
await page.getByTestId('profile-follow-button').click();
await broadcast.waitForCount(1);

expectFollowCustomJson(broadcast.calls[0], {
  follower: FOLLOWER,
  following: FOLLOW_TARGET_USER,    // single string for follow/unfollow/unmute
  what: WHAT_FOLLOW
});
```

### `following` shape depends on the wax invocation

`followBodyBuilder` outputs `following: blog` (single string) when
called with no rest args and `following: [blog, ...otherBlogs]` (array)
when there are rest args. The `transactionService` wrappers determine
which shape applies:

| Wrapper                                  | wax call                       | `following`    |
|------------------------------------------|--------------------------------|----------------|
| `follow(name)` / `unfollow(name)`        | `(self, name)`                 | `'name'`       |
| `unmute(blog)` / `unblacklistBlog(blog)` | `(self, blog)`                 | `'blog'`       |
| `unfollowBlacklistBlog(blog)`            | `(self, blog)`                 | `'blog'`       |
| `unfollowMutedBlog(blog)`                | `(self, blog)`                 | `'blog'`       |
| `mute(otherBlogs, '')`                   | `(self, '', ...otherBlogs)`    | `['', 'name']` |
| `blacklistBlog(otherBlogs, '')`          | `(self, '', ...otherBlogs)`    | `['', 'name']` |
| `followBlacklistBlog(otherBlogs, '')`    | `(self, '', ...otherBlogs)`    | `['', 'name']` |
| `followMutedBlog(otherBlogs, '')`        | `(self, '', ...otherBlogs)`    | `['', 'name']` |
| `resetBlogList()`                        | `(MUTE_BLOG, self, 'all')`     | `'all'`        |
| `resetBlacklistBlog()`                   | `(self, 'all')`                | `'all'`        |
| `resetFollowBlacklistBlog()`             | `(self, 'all')`                | `'all'`        |
| `resetFollowMutedBlog()`                 | `(self, 'all')`                | `'all'`        |

`followingFromOtherBlogs(target)` builds the `['', target]` shape so
specs read symbolically; `RESET_FOLLOWING_TARGET` exposes `'all'`.

`what` is ALWAYS a 1-element array — wax wraps the action string in
`[what]` unconditionally. `unmute` and `unfollow` both produce
`what: ['']` (empty UNFOLLOW action), not `what: []`.

### Pre-state via the social variant generator

"Undo" tests (FOL-02 unfollow, MUTE-02 unmute, BL-02 remove, FBL-02,
FML-02, the 4 reset tests) need fixtures recorded against state where
the seeded user is already in the relation. The chain doesn't move in
fixture mode, so we generate overlays instead of recording real
pre-state.

1. Record the base scenarios in record mode.
2. Add an entry to `VARIANTS` in
   `support/fixture-auth/generate-social-variants.mjs` describing the
   patch (`addFollowing` + `profileContext` for profile-button overlays,
   `populateFollowList` for `/lists/*` page overlays).
3. Run the generator:
   `node playwright/tests/support/fixture-auth/generate-social-variants.mjs`
4. Point the spec at the variant:
   `test.use({ fixtureTestName: 'socialFollow_followed' })`.

The generator throws if any declared op matches zero base files —
catches recordings that lost an expected RPC (e.g. a method rename or
positional vs. object param change) before they produce a silent
empty overlay.

---

## Recipe: the user should see a "previously voted" post

SSR fetches post data server-side, so `page.route` cannot override
`bridge.get_ranked_posts` or `database_api.list_votes` for the initial
render. Instead, produce a **separate fixture dir** with pre-patched
responses:

1. Record a base scenario (e.g. `postVoting/`).
2. Extend `generate-voted-variants.mjs` — add an entry to the `VARIANTS`
   array describing what to patch.
3. Run the generator: `node generate-voted-variants.mjs`. It writes
   **only the patched files** to the variant dir (overlay approach —
   see "Overlay fixture dirs" below).
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

Before the first click in an "undo" spec, call
`expectFirstPostUpvotedState(page)` or `expectFirstPostDownvotedState(page)`
from `postVotingContext` — otherwise you race `list_votes` and the
direct-click branch submits a fresh vote instead of opening
VoteRemovalDialog. See the "list_votes race" gotcha below.

---

## Recipe: test the slider popover

Use the existing `VotingSlider` POM and a high-HP fixture variant. The
drag snaps to integers within ±1–2 of the target, so read the achieved
percent and feed it into TX-04:

```ts
import { HomePage } from '../support/pages/homePage';
import { VotingSlider } from '../support/pages/votingSlider';
import {
  VOTER,
  FIRST_POST_AUTHOR,
  FIRST_POST_PERMLINK,
  SLIDER_MIN,
  SLIDER_MAX,
  SLIDER_TARGET_PERCENT,
  SLIDER_DRAG_TOLERANCE,
  BASIS_POINTS_PER_PERCENT
} from '../support/postVotingContext';

await new HomePage(page).getFirstPostUpvoteButton.click();
const slider = new VotingSlider(page);
await expect(slider.upvoteSliderModal).toBeVisible();

await slider.moveCustomSlider(
  slider.upvoteSliderTrack,
  slider.upvoteSliderThumb,
  SLIDER_TARGET_PERCENT,
  SLIDER_MIN,
  SLIDER_MAX
);

const displayed = await slider.upvoteSliderPercentageValue.textContent();
const percent = parseInt((displayed ?? '0').replace('%', '').trim(), 10);
// For downvote, label is hardcoded `-{sliderDownvote}%` — use Math.abs().

await page.getByTestId('upvote-button-slider').click();
await broadcast.waitForCount(1);
expectVoteOperation(broadcast.calls[0], {
  voter: VOTER,
  author: FIRST_POST_AUTHOR,
  permlink: FIRST_POST_PERMLINK,
  weight: percent * BASIS_POINTS_PER_PERCENT
});
```

---

## Overlay fixture dirs

Variant dirs (e.g. `postVoting_upvoted/`) use an **overlay** pattern
to avoid duplicating files that are identical to the base. A variant
dir contains:

- `_index.json` with a `base` field naming the parent dir
- Only the fixture files that differ from the base

At replay time, `fixture-proxy.ts` loads the base dir first, then
overlays the variant's files — matching `method::paramsHash` keys are
replaced. This way `postVoting_highHP/` only stores 1 patched file
(+`_index.json`) instead of all 10.

```
mock/fixtures/
├── postVoting/                 ← base (full set of 10 fixtures)
├── postVoting_upvoted/         ← overlay: 0005, 0009 + _index.json
├── postVoting_downvoted/       ← overlay: 0005, 0009 + _index.json
├── postVoting_highHP/          ← overlay: 0003 + _index.json
├── postVoting_highHP_upvoted/  ← overlay: 0003, 0005, 0009 + _index.json
└── postVoting_highHP_downvoted/← overlay: 0003, 0005, 0009 + _index.json
```

### Additive overlays (shared-base bases)

Sometimes two recordings share most of their read-only RPCs but each
needs one unique entry — e.g. the four §9 list-page bases share
`find_accounts` / `get_profile` / `get_following` and differ only in a
single `bridge.get_follow_list` call whose `follow_type` is variant-
specific. Modelling them as standalone bases duplicates ~36 KB per dir
of byte-identical recordings.

The fix: pick one as the canonical base (e.g. `socialMutedListPage`),
make the others overlays containing only their unique file, and add
`additive: true` to their `_index.json`:

```json
{
  "testName": "socialBlacklistListPage",
  "base": "socialMutedListPage",
  "additive": true
}
```

`additive: true` tells `fixture-proxy.ts` that the overlay's keys are
intentionally NEW (not patches), so it skips the STALE OVERLAY warning
that would otherwise fire on every replay. The drift signal still
works for normal overlays — only this dir is exempt.

Same chain rule applies to additive overlays: a sibling can itself
have an overlay (e.g. `socialBlacklistListPage_populated` extends
`socialBlacklistListPage` extends `socialMutedListPage`), and the
proxy walks the full chain.

### `active_votes` trimming

`bridge.get_ranked_posts` responses arrive with `active_votes` arrays of
200–1000 voters per post. Tests only use the seeded user (`CI_TEST_USER`,
default `guest4test`) for the `checkVote` lookup and don't assert on
vote counts, so the arrays are trimmed to **5 entries + the seeded user
if present**.

Trimming runs **automatically** after every record via
`pnpm test:fixture:trim` (chained from `test:fixture:record` in
`package.json`). The script `support/fixture-auth/trim-fixtures.mjs`
walks `mock/fixtures/` recursively, is idempotent, and preserves
seeded-user entries injected by the variant generator. Run it manually
on a specific dir:

```bash
node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs
node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs path/to/dir
```

To trim a different array type, extend `processFile` in that script.

### Stale overlay detection

When a variant patches a `(method + paramsHash)` that no longer exists in
the base, the patch is a **no-op** — the overlay map just stores it under
its old key and base serves the real response. This is the one silent-failure
mode of the overlay approach: re-record the base without regenerating
variants and tests still pass, but they stop exercising the pre-state they
were meant to set up.

`fixture-proxy.ts` emits `STALE OVERLAY` warnings at replay start for every
orphan patch. If you see one, re-run the generator:

```bash
node apps/blog/playwright/tests/support/fixture-auth/generate-voted-variants.mjs
```

If your variant intentionally adds new keys (rather than patching
existing ones — see "Additive overlays" above), set `additive: true`
in its `_index.json` to suppress the warning.

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
opens a login dialog instead of the real handler. Use the shared helper:

```ts
import { gotoTrendingLoggedIn } from '../support/postVotingContext';
await gotoTrendingLoggedIn(page);
```

which does `goto` + `expect(page.getByTestId('login-btn')).toBeHidden()`.

**The `login-btn` gate is NOT enough for the first click on a page.**
Login state is known server-side (session cookie), so `login-btn` is
already hidden in the SSR HTML — the gate passes before hydration has
attached any onClick handlers, and a click dispatched into that window
is silently lost (auto-actionability checks visibility/stability/hit-test,
not handler attachment). This bit twice: job 3144190 (`force: true`) and
job 3211459 (plain `click()` after the post route started holding the
response on the post lookup for real-404 statuses, which pushes script
delivery after `load`). For any "first click after goto", use a
click-until-effect helper — `openReplyEditor` in `commentingContext.ts`
retries the click until the editor is actually open. If you add a new
first-click flow, follow that pattern: retry the trigger until its
observable effect appears; never trust a single click fired within the
first seconds of page life.

### `list_votes` race on "undo" flows — wait for the filled icon

`login-btn` hides as soon as `user.isLoggedIn` is true, which does *not*
wait for `database_api.list_votes` to resolve. In the undo specs, if you
click before `list_votes` has come back, `userVote` is still undefined,
`vote_upvoted` / `vote_downvoted` is still false, and the component
renders the direct-click branch. Clicking submits a fresh vote instead
of opening `VoteRemovalDialog` — broadcast fires with the wrong weight
and the dialog-header assertion times out.

The tell-tale sign: `[interceptor] POST network_broadcast_api.broadcast_transaction`
appears in the log even though `vote-removal-dialog-header` never became
visible.

Fix — wait for the visual "already voted" state (icon class) before
clicking, using the helpers from `postVotingContext`:

```ts
import { expectFirstPostUpvotedState } from '../support/postVotingContext';
await gotoTrendingLoggedIn(page);
await expectFirstPostUpvotedState(page); // waits for bg-destructive-icon
await new HomePage(page).getFirstPostUpvoteButton.click();
```

Same pattern with `expectFirstPostDownvotedState` (waits for `bg-gray-600`)
before a downvote-undo click.

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

### A FAILING assertion during record wipes earlier fixtures

The proxy flushes the fixture dir on every worker teardown, and
Playwright starts a fresh worker after each FAILED test. So if a spec
has assertions that fail mid-record, each failure tears down the worker,
the next worker re-flushes the dir, and only the LAST test's RPCs survive
— replay then dies with `No recorded fixture` for everything else. The
whole existing suite hides this because its specs pass in record.

This bites any spec that intentionally asserts a NEGATIVE (e.g. SSR-gap
checks that expect content to be MISSING). Two fixes, used together by
`ssrChecks.spec.ts`:

- Gate assertions off while recording so every test passes and one worker
  records the full set: `import { isRecordMode }` and `if (isRecordMode)
  return;` before the assertion (wrap it in a helper).
- Mark known-failing cases `test.fail(!isRecordMode, '…')` — expected on
  replay (suite stays green, regression flips it red), no-op on record.

### SSR-correctness checks (ssrChecks.spec.ts)

`ssrChecks.spec.ts` asserts what the SERVER renders into the initial HTML
by running with `javaScriptEnabled: false` — JS off means the DOM is the
server response, so a visible element was SSR'd and a missing one is
client-only. Record via `api.openhive.network` (`FIXTURE_UPSTREAM`) —
api.hive.blog returned 502 "connection pool" errors that poisoned the
fixtures. Confirmed client-only gaps (data fetched server-side, rendered
only after hydration) are marked `test.fail()`: `/@user/communities`,
`/@user/notifications`, `/roles/[community]` (React Query Hydrate), plus
the user-profile body, the community info sidebar (gated on a client-only
getSubscribers), and classic search results. SEO: `meta description` + OG tags
SSR fine (SSR-23/19/21/22), but `<link rel="canonical">` and `<meta name="robots">`
are never emitted (no `alternates.canonical`/`robots` in metadata, no robots.txt
route) — documented as `test.fail` gaps SSR-24/25.

### SSR safety / hydration / error-fallback specs (P1 set)

Three sibling specs extend the SSR coverage beyond "what renders":

- **`ssrSafety.spec.ts`** — pure HTTP (Playwright `request` API, no browser).
  Reuses the **`ssrChecks` fixtures** (read-only on replay, safe to share the
  dir). Asserts status codes (200; SAFE-03 expects 404 but is `test.fail` — see
  soft-404 below), no secret leakage in server HTML (iron-session `Fe26.2`
  seal, WIF, cookie password), and that the personalized `/trending/my` is not
  publicly cacheable (no `public`/`s-maxage`) and renders different HTML per
  `observer` cookie. Log in at HTTP level by sending `cookie: observer=<user>`
  — `getObserver`'s primary path reads that lightweight cookie, no iron-session
  needed.
- **`ssrErrorFallback.spec.ts`** — graceful degradation when a SECONDARY
  server fetch fails. Uses the **`ssrChecks_discussionError`** overlay
  (patches `bridge.get_discussion` for `test-ako-post` → HTTP 503 by its
  recorded requestHash); the post route tolerates it (`Promise.allSettled`)
  so the article still server-renders at 200.
- **`ssrHydration.spec.ts`** — JS **enabled**; listens on `console`/`pageerror`
  for React hydration-mismatch signatures (minified #418/#423/#425 + dev text)
  while the page hydrates. Needs its **own** `ssrHydration` fixture dir recorded
  **with JS on** (a superset of the JS-off corpus — the browser also fetches
  through the proxy). Assertions are gated off during record (`if (isRecordMode)
  return`) per the worker-wipe rule. Record:
  `FIXTURE_MODE=record FIXTURE_UPSTREAM=api.openhive.network pnpm exec playwright test --config=playwright.fixture.config.ts ssrHydration`,
  then trim, then replay.

**Soft-404 finding:** this build serves `notFound()` with HTTP **200** plus the
not-found page body (verified for invalid handles, missing permlinks and an
injected transport error alike — all 200, even with `maxRedirects:0`). Likely
the runtime-CSP middleware (`@hive/middleware` `createMiddleware`) flattening
the status. SAFE-03 documents it as a `test.fail` gap; the transport-error →
5xx `ServiceUnavailable` contract (hive/denser#926) therefore can't be asserted
at the HTTP level here — it's pinned instead by a unit test on `isTransportError`
(`packages/transaction/lib/wax-errors.test.ts`, run via `pnpm --filter @hive/transaction test`).

---

## Record / regenerate workflow

Normal cycle after changing infrastructure or app code that affects
fixtures:

```bash
# 1. Re-record the base fixture dir (requires network to api.hive.blog).
#    Per-spec form — bypasses the script chain that would otherwise wipe
#    all committed fixtures, see "Record fixtures" warning above:
cd apps/blog && FIXTURE_MODE=record pnpm exec \
  playwright test --config=playwright.fixture.config.ts postVoting

# 2. Trim active_votes to keep fixtures small (5 voters per post):
node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs \
  apps/blog/playwright/tests/mock/fixtures/postVoting

# 3. Regenerate overlay variants from the trimmed base:
node apps/blog/playwright/tests/support/fixture-auth/generate-voted-variants.mjs

# 4. Verify replay passes:
pnpm --filter @hive/blog test:fixture -- postVoting
```

**Always run step 3 after any base re-record.** Skipping it leaves variants
pointing at old `paramsHash` values that no longer exist in the base — the
patches silently become no-ops and tests stop exercising the pre-state they
were meant to set up. The loader catches this at replay start with
`STALE OVERLAY` warnings, but the test itself may still pass against the
un-patched base response.

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
