# Lite accounts (blog)

Lite accounts post without a Hive account: a gate account broadcasts the comment, the lite
account signs an attestation, and the `lite_posts` app next to hivemind verifies it.

## Two kinds of API node

- **Stock node** (no `lite` API, or `lite_posts` not installed): `bridge.*` returns lite posts in
  *compat* form — `author` is the gate account, the lite name is in `json_metadata` (see
  `lite-attribution.ts`). `lite.get_info` answers a JSON-RPC error (`-32601 "Api not found lite"`,
  or jussi's "Unable to map request to endpoint.").
- **Lite-aware node**: `lite.get_discussion|get_post|get_ranked_posts|get_account_posts` take the
  same params as their `bridge` twins and return *native* output — `author`, `parent_author`, the
  `get_discussion` keys and `replies` name lite authors as `did:lite:<name>`. A DID `author` /
  `start_author` with its permlink resolves to the post.

## Probe and namespace switch

`packages/transaction/lib/lite-api.ts` asks the current API node `lite.get_info` (on that node
only, never through failover) and caches the answer per endpoint for 10 minutes; an error, a
transport failure or an answer without the `native` mode means "not lite-aware" and is cached too.
`getPost`, `getDiscussion`, `getPostsRanked` and `getAccountPosts` (`bridge-api.ts`) then call
`lite.*` on a lite-aware node and `bridge.*` everywhere else; a `lite.*` call answered "Api not
found" marks the node not lite-aware and is retried on `bridge.*`. The answer is per node, so a node
switch (by the user, or by failover) is probed on its own. A server process can shorten the TTL with
`DENSER_LITE_PROBE_TTL_S` (0 = ask before every read), as the fixture and dev stacks do: their
recordings swap what answers behind one endpoint. In failover, "Api not found" on a
`lite.*` call means the node cannot serve it (the next node is asked; its health is kept as
`<node>/lite`), not a definitive answer.

React-query keys of these reads end with the namespace (`'lite' | 'bridge'`): `usePostsNamespace()`
(`use-lite-api-info.ts`) in components, `currentPostsNamespace()` for keys built in mutations. Both
are `'bridge'` until the probe has answered. The server's feed and profile caches add it to their
`network` key.

## Rendering DID authors

`lite-did.ts` recognises `did:lite:<name>`. Names follow `isValidLiteName`, whose pattern is copied
there, not imported: the package has one entry point, which would bundle its signing code into every
feed page. A DID author is shown by its bare name with `LiteDidBadge` (`LiteAuthorBadge` stays the
json_metadata badge of compat output), links its lite profile (`AuthorProfileLink`, `/@did:lite:<name>`),
has no follow or mute (the author popover shows `LiteAccountCard` instead, whose name links the
profile), and gets the local placeholder avatar. Post URLs keep the DID
(`/<category>/@did:lite:<name>/<permlink>`); the post route accepts it and asks the node, which
resolves it. On a stock node such URLs never arise; a pasted one is a normal not-found.

The guest reply box writes its optimistic entry under the DID (key `did:lite:<name>/<permlink>`)
on a lite-aware node and under the gate account on a stock node.

Native output names the gate account only in `url` (`/<category>/@<gate>/<permlink>`, a comment
`…#@<gate>/<permlink>`); `liteL1Author` (`lite-ownership.ts`) reads it from there. A guest reply to a
DID-authored post or comment sends that gate account as the L1 `parent_author` while the cache
keeps the DID. Not covered yet: voting on a DID-authored post or comment.

## Lite profile

`/@did:lite:<name>` is the `[param]` profile route. Its layout (`(user-profile)/layout.tsx`) hands a
DID to `LiteProfileRoute` (`lite-profile-route.tsx`), which reads `lite.get_profile` through
`getProfileLiteAccount` (the server's profile cache, keyed by node and namespace). `getLiteProfile`
(`packages/transaction/lib/lite-api.ts`) asks only a node whose `lite.get_info` lists `get_profile`;
any JSON-RPC error (e.g. "account does not exist") is null, a transport failure is thrown (503). Null
renders the not-found page, so a node without lite support answers 404 for every DID route.

`LiteProfileLayout` shows the card (name, badge, "Lite account", joined date, post count; no follow,
mute or wallet) and the Posts / Comments / Replies tabs, which are the L1 tab pages
(`posts`, `comments`, `replies`) reading `getAccountPosts` with the DID through `readPosts`, so server
and browser go to `lite.get_account_posts`. `/@did:lite:<name>` redirects to its Posts; the
`(posts-tabs)` layout drops the Payouts sub-tabs for a DID. The sub-routes only Hive accounts have
(followers, followed, notifications, communities, payout, settings, lists, feed) use
`HiveAccountLayout` (`lib/hive-account-route.tsx`): not-found for a DID, from the segment's layout so the
404 is a real one (a page under a `loading.tsx` would stream a 200).

A Hive account's profile shows "Lite-account gateway" (`LiteGatewayNote`) when its `lite.get_profile`
answer carries `lite.gateway = true`; the browser asks only when the node's known `lite.get_info` lists
the method. `liteProfile.spec.ts` covers both (recorded from steem-16).

## The browser's lite account in the header

For a reader who is not signed in, `LiteIdentityMenu` (in the header's avatar slot) shows the stored
identity: placeholder avatar, name and badge, with View profile, Sign in with a Hive account (the
sign-in dialog) and Forget this lite account. It reads `lite-identity` with `useStorageWithTTL`, not
`useLiteIdentity`, so the header does not bundle the signing package, and the identity written by the
name dialog shows at once (same-tab storage event). Forget (`lite-forget-dialog.tsx`) says the key is
only in this browser and runs `forgetLiteAccount` (`lite-storage.ts`): it removes every `lite-*` key
(identity, reply and root-post drafts, the root queue, the sign-in mark) except the device's
`lite-client-id`. Signing in shows the normal user menu; the identity stays stored.
`liteIdentity.spec.ts` covers it.

## Guest posting preflight

The gateway is `DENSER_SERVER_LITE_GATEWAY_URL` (`lib/lite-relay/gateway.ts`, `.env.blog.example`).
`/api/lite-reply` relays its `/info` and `/reply`; `/api/lite-reply/health` relays its `/health`
(status, hived lag, per-pool `reply` / `root` readiness), shared by all requests for 5 s and always
answered 200 — a missing or unreachable gateway reads `{"status":"down"}`.

Guest replying is offered only when the relay is enabled, the API node is lite-aware
(`useLiteApiInfo`) and the last health answer (`useLiteGatewayHealth`, fresh for 10 s, re-asked on
window focus) is not `down`; otherwise the Reply button opens the sign-in dialog as for any other
reader. Health is re-asked when the button opens the box and again right before posting.
`readiness(health, kind, pool)` turns an answer into ok / `down` | `degraded` | `busy` | `hived`:
the button toasts the reason instead of opening, and the box keeps the draft and disables Post for
the gateway's `available_in_s` (10 s when it names none), or toasts and keeps the draft when the
gateway is down.

## Picking a lite name

The name dialog (`lite-name-dialog.tsx`, from the guest reply box and the guest post entry) checks
names with the gateway's `GET /names/{name}/availability` through `/api/lite-gateway`
(`checkLiteNameAvailability`, `lite-name-availability.ts`). The grammar is checked first; a
grammatical name is asked 300 ms after typing pauses (`lite-name-checker.ts`), and each new name or
suggestion aborts the request before it, so an answer never lands on a newer name. The dialog says
checking, available, taken by a lite account, taken by a Hive account, not a valid Hive name, or that
the gateway could not be asked; Confirm takes an available name, and also an unchecked one when the
gateway is unreachable (it still refuses a taken name at posting time). The first name offered and
"Suggest another" generate up to 5 names until one is available. When a reply or post is still
refused with `name_taken` (someone took the name meanwhile), the identity is dropped and the dialog
reopens on that name, marked taken; the draft is kept. `playwright/tests/fixture/liteName.spec.ts`
covers it with the gateway answered in the browser.

## Guest root posts

`/api/lite-gateway/<path>` (`app/api/lite-gateway/[...path]/route.ts`) passes an allow-list through
to the gateway (`lib/lite-relay/gateway-paths.ts`): `POST reply`, `POST post`, `POST edit`, `POST
delete`, `GET|DELETE queue/<id>`, `POST queue/<id>/post` and `GET names/<name>/availability` (a name in
the lite grammar only); anything else answers 404 `not_found`. Bodies and statuses
are relayed as the gateway answers them, with the client IP forwarded and a 15 s timeout; a non-JSON
answer becomes 502 `relay_unavailable`. `/api/lite-reply` stays the alias of `/info` (GET) and
`/reply` (POST).

A reader who is not logged in gets the guest editor on `/submit.html` (`lite-post-entry.tsx`) when the
deployment's gateway is enabled; the header's pencil asks `/api/lite-reply` on click and opens the
editor there, the sign-in dialog elsewhere. Without an identity in this browser, the lite name dialog
comes first. The editor (`lite-post-form.tsx`) takes a title, the body, tags and "My blog" (the first
tag is the category) or the community the page was opened for (`?category=hive-…`). Its draft is
`lite-postData-new` (30 days) and survives every failure.

Submitting (`use-lite-root-post-mutation.ts`) re-asks `/health`: `readiness(health, 'root')` refuses a
down gateway or a busy lane that cannot queue (toast, draft kept); a lane that can queue goes ahead
and toasts the estimated wait. The request is `buildLiteReplyRequest` in root form (`parent_author`
'', `parent_permlink` = the category) for `/info.gate_account`, with the gateway's
`max_expiration_minutes`, so the attestation outlives a normal queue wait. A 200 goes to the post:
`/<category>/@did:lite:<name>/<permlink>?pending=1` when the API node is lite-aware, under the
gate account (`l1_author`) otherwise. Gateway errors map to `lite_account.root_post.errors.*`
(`lite-root-post.ts`).

A 202 shows the queue panel (`lite-queue-status.tsx`) instead of the editor: position (asked every
20 s), a countdown to `due_at`, and Cancel (`DELETE queue/<id>`, which refunds the quota). It runs
`waitForLiteQueue`, whose `resign` signs the same content again for the gate the gateway reserved. The
ticket and the exact content are kept as `lite-root-queue` for `max_wait_s` + `sign_window_s`, so a
reload resumes the wait. An expiry (`sign_window_elapsed` | `wait_exceeded`) or another failure is
explained, with Try again and Back to the editor.

`playwright/tests/fixture/liteRootPost.spec.ts` posts as a guest against a real gateway. It runs on a
dev stack started with `DENSER_SERVER_LITE_GATEWAY_URL` (the steem-16 test namespace,
`https://steem-16.syncad.com/lite-gateway-api`) and skips everywhere else, the fixture suite included.

## Editing and deleting own posts

A post or comment is the guest's own (`useIsLiteOwner`, `lite-ownership.ts`) when its author is
`did:lite:<identity name>` (lite-aware node) or, on a compat node, when the json_metadata marker of the
relay's namespace names the identity as attester. The gateway checks the claim: it must have relayed
the post for that lite account, signed by the same device key. For the owner, and only for a reader
who is not logged in, the post page and the comment footer show Edit when `/info.features.edits` and
Delete when `/info.features.deletes` (without `tombstone_deletes`, only where hived would delete: no
replies, no net-positive votes, before payout). Both need the post's L1 location (gate account and
permlink); a guest's optimistic reply has one once the gateway answered its `/reply` (its `url` gets
the `#@<gate>/<permlink>` the node will serve).

Edit opens `lite-edit-form.tsx` with the current content: title, body and tags for a root post (its
category stays first; hived does not move a post), the body for a comment (posted without a title,
like every guest reply). Saving (`use-lite-manage-mutations.ts`) signs `buildLiteEditRequest` (same
permlink, same L1 parent) and POSTs `/api/lite-gateway/edit`; the cached discussion and post show the
edit at once and a validated refetch replaces them once the node shows the new body. A failure
restores the cache and toasts `lite_account.manage.errors.*`; the editor keeps the text.

Delete asks first (`lite-delete-dialog.tsx`, which says a post with replies or votes stays as a
tombstone) and POSTs `buildLiteDeleteRequest` (with the tombstone attestation) to `/delete`. By the
answer's `mode`: `l1_delete` takes the entry out of the cached discussion (the open post navigates to
its parent, or to `/created/<category>` for a root post); `tombstone` keeps it with the tombstone
content. A tombstone (`isLiteTombstone`: the marker says `deleted: true`) renders like a deleted post,
"Deleted by the author." in place of the body, without Edit or Delete.

`playwright/tests/fixture/liteManage.spec.ts` runs edit and delete against a mocked gateway in the
fixture suite, and against a real one (LITE-MANAGE-04: reply, edit, delete) on a dev stack started
with `DENSER_SERVER_LITE_GATEWAY_URL`.
