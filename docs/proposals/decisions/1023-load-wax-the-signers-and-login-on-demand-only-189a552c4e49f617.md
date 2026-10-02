---
status: proposed-not-admitted
id: none
related_issues: [1023]
---

<!-- aidev-proposal-source digest="189a552c4e49f617" path="docs/decisions/0000-load-wax-the-signers-and-login-on-demand-only.md" -->

# Proposed decision record (not admitted): load-wax-the-signers-and-login-on-demand-only

This record was written by the implementer and **not admitted** to
`docs/decisions/`. It is retained here so the reasoning survives; it is not
a decision, carries no number, and no consumer of decision history reads it.

- Proposed path: `docs/decisions/0000-load-wax-the-signers-and-login-on-demand-only.md`
- Issue: #1023
- Workflow: `1023-wax-js-beekeeper-and-zod-stil-sc0cae4ab-v1`
- Why it was not admitted: assessment_unreadable: no verdict matched a proposed record

## Original record metadata

- date: 2026-10-02
- decision-makers: []
- consulted: []
- informed: []
- proposed_by: claude
- area: blog/client-bundle
- related_issues: [1023]
- related_decisions: [DR-002]

## Original record text

# Load wax, the signers and login on demand only, and read through a wax-free transport

## Context and Problem Statement

DR-002 stopped anonymous readers from downloading wax's wasm, but wax's JavaScript, hb-auth (with
beekeeper) and zod still shipped in chunks every page loads: about 210 KB gzip on `/trending`, a post
and a profile, mostly unused. They came in through static imports from page-load code: the read
client's transport was wax's `RequestHelper`, the root providers and header imported the
transaction service, the signers, the login form and the Google OAuth handler, and shared modules
imported wax enums (`EAssetName`, `TTransactionPackType`) that are runtime values. Any `@hiveio/wax`
value import pulls in all of wax's JavaScript.

## Considered Options

* Read through a `fetch` transport of our own, and reach wax, the signers, the transaction service
  and the login UI from page-load code only through dynamic `import()`
* Keep wax's `RequestHelper` as the read transport and load it with a dynamic `import()` on the
  first read

## Decision Outcome

Chosen option: **"a `fetch` transport of our own and dynamic imports for the signing stack"**,
because pages also read on the client during load (a post queries its suggestions and active votes), so a
lazily loaded `RequestHelper` would still download wax's JavaScript during page load.

* `read-transport.ts` sends the same requests as `RequestHelper` and rejects every failure with
  `ReadTransportError`; `isTransportError` recognises it as well as wax's `WaxRequestError`.
  `wax-equivalence.test.ts` now runs wax against this transport. This replaces DR-002's
  "transport is wax's own `RequestHelper`"; the rest of DR-002 stands.
* `server-failover.ts` loads `wax-errors` (which imports wax) on the first failed call, as it only
  runs on the server.
* Client components call `transactionService` through `lazy-transaction-service.ts`; the chain
  service imports wax when the chain is created; signers, the login form, the Google OAuth redirect
  handler, the post editor and the Condenser login are loaded when they are used.
* The fixture specs `initialChunks*.spec.ts` (PERF-CHUNKS-01..03) fail when a chunk referenced from
  the server HTML of `/trending`, a post or a profile contains beekeeper or wax's JavaScript.

### Consequences

* Good, because the JS a reader loads up front drops by about 230 KB gzip on those pages (measured
  from a production build's client reference manifests), with login, voting, commenting and editing
  unchanged.
* Bad, because there are now two HTTP transports to keep equivalent (ours for reads, wax's for the
  chain), and the read client's failure errors are `ReadTransportError`, not wax classes.
* Bad, because the first write action, the login dialog and the post editor wait for their chunks
  to download; logged-in users still get the idle chain warm-up.
* Page-load code must not value-import `@hiveio/wax`, `@hiveio/hb-auth`, `@transaction/index` or
  the signers; it uses `import type`, string literals for wax enums, and `import()` / `next/dynamic`.
  The guard only checks the three pages it loads, and only for beekeeper and wax markers; zod is not
  guarded. The wallet app is not covered.
