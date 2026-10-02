---
date: 2026-10-02
status: accepted
decision-makers: []
consulted: []
informed: []

id: DR-002
proposed_by: claude
area: transaction/api-access
related_issues: [1018]
related_decisions: [DR-001]
---

# Serve Hive API reads through a wasm-free client and keep wax for signing, broadcast and login

## Context and Problem Statement

Every Hive API call went through the wax chain (`getChain()`), including plain JSON-RPC and REST
reads, so every visitor downloaded and compiled `wax.common.wasm` (2.45 MB raw): #1005 only moved
the chain creation to an idle warm-up after load. Logged-out readers, the bulk of the traffic, never
sign anything, yet any client-side read (infinite scroll, profile tabs, search, the author popover
card) needed the chain and its wasm.

## Considered Options

* A wasm-free read client next to the wax chain: reads through it, wax only where signing,
  broadcasting, login or wasm-only computation needs it
* Keep every call on wax and only defer the chain further (#1005's idle warm-up for everyone)

## Decision Outcome

Chosen option: **"a wasm-free read client next to the wax chain"**, because it is the only option
under which a logged-out reader downloads no wasm at all, while signing keeps wax unchanged.

* `packages/transaction/lib/read-client.ts` mirrors wax's `chain.api` / `chain.restApi` call shape
  and builds the same requests: JSON-RPC envelopes, and REST URLs from the `extendRest` definition
  that wax itself is now extended with (`EXTENDED_REST_API_DEFINITION`). Transport is wax's own
  `RequestHelper` (plain JavaScript), so timeouts and transport errors are wax's `WaxRequestError`
  classes and `isTransportError` / the server failover of DR-001 behave as before.
* `getReadChain()` in `chain.ts` resolves endpoints on every call from the same configuration as the
  chain (`getApiEndpoints()`, including the user's node choice), and on the server is wrapped by the
  same failover. `bridge-api.ts`, `hive-api.ts` (except `getManabars`) and `hivesense-api.ts` read
  through it.
* Wasm-only computation an anonymous page needs has an exact pure-TS replacement: asset constants
  default to the protocol NAIs/precisions, and vests→HP is integer math (`ui/lib/asset-math.ts`).
* `getChain()` stays the entry point for signing, broadcast and login; the idle warm-up runs only
  for logged-in users; WIF validation in the login forms loads wax on first use.

### Consequences

* Good, because logged-out feeds, posts, profiles and search request no `.wasm`
  (`anonymousNoWasm*.spec.ts`), and logged-in users keep the warm-up (`loggedInHomepage.spec.ts`).
* Bad, because there are two API clients that must stay equivalent: a new REST API must be added
  to `EXTENDED_REST_API_DEFINITION` (not inline in `extendRest`), and
  `wax-equivalence.test.ts` compares requests and results of both clients against wax itself.
* Bad, because a JSON-RPC error answer surfaces from reads as `JsonRpcApiError` with the node's
  message, not as wax's wasm-decoded assertion error; both are non-transport errors, but the
  message text differs.
* New client code that reads with `getChain()` brings the wasm back for anonymous readers; the
  `anonymousNoWasm*` fixture specs catch it only on the flows they cover. The wallet app still reads
  through wax and is not covered by this decision.
