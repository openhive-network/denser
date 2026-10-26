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
and gets the local placeholder avatar. The author popover shows `LiteAccountCard` (its name links the
profile); a guest acting as a lite account gets Follow / Mute there (see "Lite social" below), a
signed-in Hive user none. Post URLs keep the DID
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

`LiteProfileLayout` shows the card (`lite-profile-card.tsx`: name, badge, "Lite account", joined date,
post count; no wallet) and the Posts / Comments / Replies tabs, which are the L1 tab pages
(`posts`, `comments`, `replies`) reading `getAccountPosts` with the DID through `readPosts`, so server
and browser go to `lite.get_account_posts`. On a node without the social app `/@did:lite:<name>`
redirects to its Posts; the `(posts-tabs)` layout drops the Payouts sub-tabs for a DID. The sub-routes
only Hive accounts have (notifications, communities, payout, settings, the lists but `muted`) use
`HiveAccountLayout` (`lib/hive-account-route.tsx`): not-found for a DID, from the segment's layout so the
404 is a real one (a page under a `loading.tsx` would stream a 200). Followers, followed, `lists/muted`
and feed use `SocialAccountLayout`: a DID passes only where the node serves the social graph.

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

## Lite social

The node's `lite.get_info` names the lite social app in `apps.social` (`lite_social`, or
`lite_social_test` in the test namespace). Every social feature is gated on it (`liteSocialApp`,
`packages/transaction/lib/lite-api.ts`): a lite-aware node without it shows none of what follows.

**Reads.** `readLiteSocial` runs a read on the current node only when it advertises the app, else
resolves null and the caller keeps its stock read (`lite-social-api.ts`). On such a node
`getFollowers` / `getFollowing` (`hive-api.ts`) read `lite.get_followers` / `lite.get_following`
(lite followers appear as `did:lite:<name>` rows; `did:hive:<name>` is turned back into the bare
name), and the profile's follow counts come from `lite.get_follow_count`, which counts lite follows
(`lite.get_profile`'s and `bridge.get_profile`'s `stats` do not). The follower / followed lists show
a DID by name with the badge (`AccountNameLink`), with no Hive follow buttons. A lite profile on such a
node opens on its Blog (`sort=blog`: its root posts and reblogs, which carry `reblogged_by: [did]`),
adds Followers / Following / Muted Users (`LiteFollowList`) and, for the browser's own lite account,
Feed (`/@did:lite:<name>/feed`, `sort=feed`, also the header menu's "My feed"); its card shows the
follow counts and the `set_profile` fields (`metadata.profile`).

**Observer.** For a reader who is not signed in and holds a lite identity, on such a node,
`useEffectiveObserver().liteObserver` is the DID; post, discussion, profile-posts and ranked-post reads
(including `tag=my`, which a guest without one does not read at all) send it, so the lite account's
mutes apply. Suggestions, search and community
reads keep the account observer. The server does not know the identity (it is in localStorage): those
pages render as before and the browser reads again with the DID.

**Writes.** A social op is one L2 transaction (`lite-social.ts`): `{ method, args: { actor:
did:lite:<name>, … } }` (`follow|unfollow|mute|unmute { target }` with targets as DIDs,
`did:hive:<name>` for a Hive account; `reblog { author, permlink }` naming an attested post by its
gate, `liteL1Author`; `subscribe { community }`; `set_profile { profile }`, at most 8192 bytes of JCS),
signed with the identity's posting key over `l2Digest(signed fields, /info.chain_id)` with the
package's `signL2Transaction`, `app` = the node's social app, 10 minutes' expiration. It is POSTed as
`{ tx }` to `/api/lite-gateway/l2` (allow-listed), which relays the gateway's `POST /l2`: a 202
`{ trx_id, gate, app }`, or `{ ok: false, code, message }` (`rate_limited` with `retry_after_s`,
`auth_failed`, `wrong_signer`, …). `lite-social.ts` imports the signing package and is loaded on the
first click only; the buttons read the identity from storage (`useStoredLiteIdentity`).

The buttons (Follow / Mute in `ButtonsContainer` for a guest and on `LiteAccountCard` and the lite
profile card, Subscribe in `SubscribeCommunity`, the reblog dialog's OK for root posts, Edit profile for
the owner) are offered when `useLiteSocialAccess(method)` holds: the node advertises the app, the
deployment's gateway lists the method for it in `/info.limits.l2.apps`, and the identity is
`registered`. The gateway refuses ops of a lite account it has no posting authority on record for
(`auth_failed`), and an account is registered only by its first reply or post (there is no L2
registration through `/l2`), so an identity that has not posted yet gets the sign-in buttons as before.
Elsewhere the guest gets the sign-in buttons too, and a signed-in Hive user's buttons are unchanged.

`use-lite-social-mutation.ts` changes the cached relations of the lite account
(`['liteSocialRelations', did]`: follows, mutes, subscriptions) and the follow counts at once, and a
validated refetch (4, 10 and 20 s) replaces them once the node shows the op. A failure restores them and
toasts `lite_account.social.errors.*`; `rate_limited` also disables the button for `retry_after_s`
(`useRetryCountdown`). A reblog has no cached state: it toasts and closes the dialog.

`playwright/tests/fixture/liteSocial.spec.ts` (recorded from steem-16, with `/l2` answered in the
browser) and LITE-SOCIAL-08 in `liteProfile.spec.ts` (a node without the social app) cover it.
LITE-SOCIAL-02, -03 and -04 read the on-chain ops of `lite-smoke-1016` in `lite_social_test`: its mute of
`swarmpost` (a `hive-107705` feed is empty for it, the post is grayed), its reblog of a root post by
`crisp-koala-499` (the Blog tab) and its subscription to `hive-13323` (`/created/my`, Joined). steem-16
times out `lite.get_ranked_posts` with `sort=trending, tag=my`, so the spec reads `/created/my`. The lite
profile has no communities list.

## Passkeys: securing, signing in, devices, signing out

Everything here shows only where the gateway relays `lite_account.update_authority`: its
`/info.limits.l2.apps[<apps.account>]` lists it (`relaysUpdateAuthority`, `lite-authority-state.ts`;
`useLitePasskeyAccess`, `use-lite-passkey.ts`). Elsewhere the header menu, the profile and Forget are as
before.

**Signers.** `REACT_APP_PASSKEY_SIGNERS` (`configuredPasskeySigners`, `packages/ui/config/public-vars.ts`,
parsed by `packages/ui/lib/passkey-signers.ts`) lists the passkey signer sites (hive-passkey-signer): a JSON
array or comma-separated origins, https only (http on a loopback host), default
`["https://signer.hive.blog"]`. With one, nobody is asked; with several, the Secure dialog offers them by
host (`lite-signer-picker.tsx`). The signer opens as a popup at `<origin>/sign/` from the click
(`signer-client.ts`: the page posts `{ hiveSignerReady, hiveSigner: "1" }`, takes one
`{ hiveSigner, id, method, params }` and answers `result` or `error.code`), so the CSP needs no entry.
A closed popup is `cancelled` and says nothing; every other code has a `lite_account.signer_errors.*`
message. Every result may carry the signer's report of what answered the ceremony,
`authenticator { attachment, transports, aaguid, name, description }` (hive-passkey-signer SPEC §5.2;
`description` always present, `name` the AAGUID's known model); an older signer omits it, and a report
of another shape fails the call as `internal`. `signer-client.ts` stands in for
`@hiveio/passkey-signer-client` until that is published.

**Authority.** `GET /api/lite-gateway/names/<name>/authority` (allow-listed) relays the gateway's read of
the account's roles and members (`expires`, `meta { kind, signer, label, authenticator }`,
`effective_until`, `active`);
`lite-authority-query.ts` reads it without the signing package. The edits use the package's builders
(`enrollRoot`, `addDevice`, `renewDevice`, `removeDevice`) in `lite-authority-flows.ts`, loaded on the
click, are relayed to `/l2` with `relayL2` and count as applied once the authority read shows them (polled
for about 50 s; otherwise `not_applied`).

The header carries only the gate, the warning, the first-post card and the expiry banner
(`use-lite-passkey.ts`, no signing package); the dialogs are `next/dynamic` imports mounted when opened,
with their flow runner (`use-passkey-flow.ts`) and the signer client.

- **Secure this account** (menu item and profile notice for a registered, unsecured identity, and a
  dismissible card after its first post, `lite-secure-prompt.tsx`): pick the signer, then
  `getPublicKeys({ roles: [owner], account: 0 })` (`readPasskeyRootKey`, the only popup). Its answer
  adds the "Passkey" field, pre-filled from the report (`authenticatorLabel`: `name`, else
  `description`, else "Passkey" for an older signer) and editable; then two edits signed by the
  browser's owner key: this device's posting key restated with `expires` 90 days and
  `meta { kind: "device", label, signer }` (the "This browser's key" field, guessed from the user
  agent), then the owner as the root, `meta { kind: "passkey", signer, label, authenticator }`, where
  `authenticator` is the report's public part, `{ attachment, aaguid, name }` as far as known
  (`authenticatorMeta`, `lite-passkey-label.ts`; never the transports). The guest may keep the signer origin off chain (the
  dialog's checkbox), which leaves out `authenticator` too, not the label; the origin is remembered
  locally either way. Afterwards the stored identity drops `ownerWif`.
- **Sign in on this device** (`lite-sign-in-dialog.tsx`, name field focused): the name, the authority
  read, the signer the root names (else the only one configured, else the guest picks), a fresh posting
  key added by the root (`signL2Transaction` in the signer) with `expires` 90 days and the "This
  browser's key" label (guessed from the user agent). The passkey's own member is not touched; the
  result toast names what signed ("Signed with YubiKey 5 Series") from the report. A browser holding
  another lite identity forgets it first. Three entry points:
  - the Login dialog (`components/dialog-login.tsx`, `lite-login-entry.tsx`): a link under the Hive
    sign-in form, shown where the API node's `lite.get_info` is known to be lite-aware and the gateway
    relays `update_authority`; it closes the Login dialog and opens this one. A fresh browser starts
    here. The gateway is asked only on a lite-aware node;
  - the name dialog's link, for a guest who started a reply or post;
  - the identity menu, to switch accounts: its "Sign in" opens the Login dialog, and so its link.
- **Sign out** (menu, secured identity): `removeDevice` signed by this device's key, then
  `forgetLiteAccount`. Forget stays, and says what it costs: for an unsecured identity that the account
  is lost, for a secured one that the device key stays until it expires.
- **Devices** (`/@did:lite:<name>/devices`, the owner's tab): first, read-only, the passkey owner
  members (`kind: "passkey"`, and `kind: "backup"`) by their labels (`passkeyMembers`,
  `lite-passkey-members.tsx`); then every posting member with its label and validity; Remove
  another device and Renew this one within 7 days of its expiry, both signed by the root in the signer.
  `LiteDeviceExpiryBanner` (header, every page) announces that window from the stored
  `deviceExpires`.
- **Warnings** (`securityWarning`): no `kind: "passkey"` owner member → "This account lives only in
  this browser"; one passkey and no `kind: "backup"` member → the backup note, naming the passkey by
  its label when it has one (`useLiteSecurityWarning` returns the warning and the root's label).

**Stored identity** (`lite-identity-record.ts`): `secured`, `signer`, `deviceExpires`, and `ownerWif`
only while unsecured; `ownerPublicKey` is the root's once secured. A record stored before this reads as
unsecured with its owner key (`readStoredLiteIdentity`); nothing is rewritten until the identity changes.

`liteIdentityPasskey.spec.ts` (LITE-ID-01, 02, 04–08, 11, on the `liteSocial` recording) and
`liteIdentityPasskeySignIn.spec.ts` (LITE-ID-03, LITE-ID-09 for the first-post card and LITE-ID-10 for
the Login dialog's link, on `litePost`; its node-without-lite case in `liteLoginEntry.spec.ts`) cover it, with the gateway's authority and `/l2` answered in the browser from one authority the relayed edits change, and the popup served by a stub
speaking the signer protocol (`support/litePasskeyContext.ts`, reporting a YubiKey unless a spec
says otherwise): fixture runs have no network, so the real
signer and its passkey (PRF) are its own e2e's business.

## Notifications and mentions

Gated on `lite.get_info.methods` listing `account_notifications` (`servesLiteNotifications` in
`@transaction/lib/lite-api`; the probe is the cached one above): on any other node nothing below
changes and nothing is asked. `@transaction/lib/lite-notifications-api` reads
`lite.account_notifications`, `lite.unread_notifications` and `lite.lookup_accounts` on such a node and
falls back to `bridge.account_notifications` / `bridge.unread_notifications` (and no lookup) elsewhere.

- **Lite identity**: a registered identity (`useLiteNotificationsAccount`) gets its unread count on the
  header's identity button and a Notifications item in its menu; `/@did:lite:<name>/notifications` (the
  profile's Notifications tab, shown on such a node; `NotificationsAccountLayout` lets the DID through)
  renders the same notification list as a Hive account's. "Mark all as read" signs `set_last_read
  { actor, date }` with the identity's posting key under the node's social app and relays it to `/l2`
  (`use-lite-mark-read-mutation.ts`, with `useLiteSocialAccess('set_last_read')`: shown only where the
  gateway relays that method). `date` is the newest listed row's date, which the chain has passed
  (lite_social refuses a date after the op's block time); the count drops to 0 at once and a validated
  refetch takes the node's answer once its `lastread` reaches the date.
- **Hive user**: the bell, the page and the mark-read refetch read `lite.*` for the Hive name, so lite
  follows and reblogs show among hivemind's rows (the node merges them by id). Marking read stays
  hivemind's custom_json: the merged `unread` is computed from hivemind's `lastread`.
- **Rows**: a source named by DID (`@did:lite:<name> followed you`) renders by its name with the lite
  badge, its avatar linking the lite profile (`notificationSource` in `activity-log/lib`).
- **Mention autocomplete**: the markdown editor (posts, replies, the lite reply box) completes `@` plus
  two characters with up to 10 lite names from `lite.lookup_accounts`, asked after a 250 ms pause
  (`post-editor/lib/mention-completion.ts`); choosing one inserts `@did:lite:<name>`, the canonical
  mention form. No completion at all is configured on another node. Hive names are not completed, and a
  plain `@name` is never resolved to a lite account here (only the node does, for its notifications).
- **Rendering**: the renderer links `@did:lite:<name>` to `/@did:lite:<name>` showing `@<name>`, titled
  with the DID (not a Hive usertag); the stylesheet badges `a[title^='did:lite:']` with
  `--lite-mention-label`, which `RendererContainer` sets to the translated "lite account". A DID with an
  invalid lite name stays text; plain `@name` renders as before.

`liteNotifications.spec.ts` (LITE-NOTIF-01–05, recorded from steem-16) covers it, with the lite
identity's notification reads and the gateway answered in the browser (steem-16 had no lite
notification when recorded); LITE-NOTIF-06 (a node without the methods) is in `liteSocial.spec.ts`
and `liteIdentity.spec.ts`, and LITE-PROFILE-04 has the page's 404 there.
