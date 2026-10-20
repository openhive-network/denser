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
json_metadata badge of compat output), has no profile link, follow or mute (the author popover
shows `LiteAccountCard` instead), and gets the local placeholder avatar. Post URLs keep the DID
(`/<category>/@did:lite:<name>/<permlink>`); the post route accepts it and asks the node, which
resolves it. On a stock node such URLs never arise; a pasted one is a normal not-found.

The guest reply box writes its optimistic entry under the DID (key `did:lite:<name>/<permlink>`)
on a lite-aware node and under the gate account on a stock node.

Not covered yet: voting on, and replying to, a DID-authored post or comment — both need the gate
account the node does not name in native output.

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

## Guest root posts

`/api/lite-gateway/<path>` (`app/api/lite-gateway/[...path]/route.ts`) passes an allow-list through
to the gateway (`lib/lite-relay/gateway-paths.ts`): `POST reply`, `POST post`, `GET|DELETE
queue/<id>` and `POST queue/<id>/post`; anything else answers 404 `not_found`. Bodies and statuses
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
