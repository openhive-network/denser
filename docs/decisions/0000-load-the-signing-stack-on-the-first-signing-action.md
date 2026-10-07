---
date: 2026-10-07
status: accepted
decision-makers: []
consulted: []
informed: []

id: DR-PENDING
proposed_by: claude
area: transaction/api-access
related_issues: [1067]
related_decisions: [DR-002]
---

# Load the signing stack on the first signing action, never at page startup

## Context and Problem Statement

DR-002 moved reads to a wasm-free client but kept two things for logged-in users: an idle warm-up
of the wax chain after every page load, and `getManabars` on wax. The signer provider also imported
the signers and the transaction service as soon as a user was logged in. Measured on the
integration site (`docs/performance/logged-in-2026-10-07.md`), a logged-in reader paid about
1.25 MB (284 KB of JS, 966 KB of wasm) on every page before signing anything, and total blocking
time roughly doubled. This record replaces DR-002's "the idle warm-up runs only for logged-in
users" and its `getManabars` exception; the rest of DR-002 stands.

## Considered Options

* Keep DR-002's idle warm-up for logged-in users, so the first vote or comment does not wait for
  wax
* Load wax, its wasm, beekeeper / hb-auth and the signers on the first action that signs or needs
  wax computation; being logged in loads none of them

## Decision Outcome

Chosen option: **"load on the first signing action"**, because the warm-up charges every page view
of every logged-in reader for a signing stack most page views never use, and the first action can
wait for the load behind the pending state its control already shows.

* Being logged in (the `observer` cookie and the localStorage `user`) loads nothing that signs.
  `ChainWarmup` is removed.
* `SignerProvider` / `SignerProviderClient` expose `loadSigner(): Promise<SignerTool>` instead of a
  constructed `signer`; it imports the signer modules on its first call
  (`smart-signer/lib/use-lazy-signer.ts`). Code that signs calls it when it signs.
* The signer options reach `TransactionService` through `transaction/lib/signer-options.ts`, a
  wax-free store the provider writes and the service subscribes to when it is first loaded, so
  `lazy-transaction-service.ts` can load the service on the first write with the options already
  set.
* Wasm-only computation a logged-in page shows has a pure-TS port checked against wax: manabars
  (`transaction/lib/manabar-math.ts`, `wax-equivalence.test.ts`).
* Preloading on hover or focus of a signing control is allowed by this rule but not implemented.

### Consequences

* Good, because a logged-in `/trending` loads the same JS as a logged-out one and no wasm
  (fixture measurement in the MR: 31 chunks / 0 wasm logged in, against 39 chunks / 2.4 MB raw wasm
  before), and `loggedInNoWasm*.spec.ts` guard the feed, a post, the own profile and notifications.
* Bad, because the first signing action of a page view waits for the signer modules, wax's
  JavaScript and the wasm download and compile before it signs; `loggedInVoteSigningStack.spec.ts`
  checks that the first vote still signs and broadcasts.
* Bad, because new code must not read the signer synchronously: anything that needs it awaits
  `loadSigner()`, and anything a logged-in page renders at startup that needs wax computation needs a
  wax-free equivalent (as the manabars have) or deferral to an action.
* A failed signer load rejects that action only; the next call retries the import.
