---
date: 2026-10-02
status: accepted
decision-makers: []
consulted: []
informed: []

id: DR-001
proposed_by: claude
area: blog/ssr-data-fetching
related_issues: [1015]
related_decisions: []
---

# Fail over server-side Hive API reads, and answer 503 when a page's primary data stays unreachable

## Context and Problem Statement

A single transient failure of the configured Hive API node during a server render made feed pages
answer HTTP 200 with the client-fetch loading skeleton and no posts: the page component caught the
error and rendered on. Crawlers indexed empty feeds and those visits had a ~15 s LCP. The server used
one node with no retry, and Next.js 16 App Router gives a page no way to choose a 503 status: only
`notFound()` / `forbidden()` / `unauthorized()` / redirects, and a thrown render error becomes a 500.

## Considered Options

* Server-side retry and failover in the transaction-layer chain, plus pages throwing a typed
  `ServiceUnavailableError` that a Node.js-runtime hook (registered from `instrumentation.ts`) turns
  from Next's 500 into `503` + `Retry-After`
* Keep catching the error in the page and rely on the client-side fetch (status quo: 200 skeleton)
* Rethrow and accept Next's generic 500, without `Retry-After`
* A custom HTTP server around Next's standalone `server.js` that sets the status (changes how every
  deployment starts the app)

## Decision Outcome

Chosen option: **"server-side failover + typed `ServiceUnavailableError` mapped to 503"**, because it
is the only option that keeps the deployment unchanged and still gives crawlers a retryable,
non-indexed status, while the failover removes most of these failures before they reach a page.

* `packages/transaction/lib/chain.ts` wraps the server's chain with `server-failover.ts`: a read-only
  `chain.api` JSON-RPC call that fails with a transport error (`isTransportError`) is retried once on
  the primary node and then on the other `REACT_APP_ALLOWED_HIVE_API_NODES` (the images host is
  excluded), each attempt with a 2 s timeout, within an 8 s budget per call. A definitive API answer
  and `network_broadcast_api` are never retried. If every attempt fails, the last transport error is
  rethrown. `restApi` calls are not covered.
* A server component that cannot render without its data throws `ServiceUnavailableError` on such a
  failure (feeds in `features/tags-pages/sort-page.tsx` and `features/community-profile/sort-page.tsx`,
  the post page). `onRequestError` marks the request; a `ServerResponse.prototype.writeHead` patch
  installed in `register()` rewrites that request's 500 to 503 with `Retry-After: 30`. The route's
  `error.tsx` shows the "temporarily unavailable" UI with a retry that re-runs the server render.

### Consequences

* Good, because a node blip is absorbed by a retry or another node, and a persistent outage answers
  503 instead of an indexable 200 without content; fixture tests (`ssrSeoGuard` `-RETRY` / `-503`,
  `ssrErrorFallback` SAFE-08) pin both outcomes against a production build.
* Bad, because the 503 relies on Next.js internals: that `onRequestError` runs before the status
  line is written, and that the `request.headers` it receives is the same object as
  `response.req.headers`. A Next.js upgrade that changes either silently falls back to a 500, which
  the fixture tests then catch.
* Bad, because it only works for routes that have not started streaming when the page throws (no
  `loading.tsx` above the page). Streamed routes such as the profile tabs keep answering 200; they
  get the retry/failover only.
* Bad, because a slow outage can hold a server render for up to the 8 s budget per call (the
  primary attempt's own 5 s timeout counts towards it).
* Future pages whose content is their SEO value must throw `ServiceUnavailableError` on a transport
  failure of their primary fetch rather than swallowing it.
