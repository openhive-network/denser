---
date: 2026-10-09
status: accepted
decision-makers: []
consulted: []
informed: []

id: DR-006
proposed_by: claude
area: transaction/api-node-selection
related_issues: [951]
related_decisions: [DR-001, DR-002]
---

# Fail over browser API reads to an allowed node and remember the pick for the browser session only

## Context and Problem Statement

DR-001 gave server renders retry and failover across `REACT_APP_ALLOWED_HIVE_API_NODES`, but the
browser kept a single node: the user's explicit choice (`localStorage['node-endpoint']`) or the
site default. When that node was unreachable every client-side read failed and the page showed
"No Data Available". The only way out was the `/healthchecker` page, which users have to know
about. A switch made automatically must not turn into a permanent choice after one outage, and must
never replace the node the user picked.

## Considered Options

* Wrap the browser's read client and wax chain with the same per-call failover as the server, and
  keep the node that answered as a session-only automatic pick, stored apart from the explicit choice
* Mount `HealthCheckerService` app-wide and, on the first transport failure, score every provider
  and switch to the best one (the issue's original proposal)
* Store the automatic pick in `node-endpoint` itself, like "Switch to Best" on `/healthchecker`

## Decision Outcome

Chosen option: **"per-call failover plus a session-only automatic pick"**, because it reuses the
failover and node-health bookkeeping the server already runs (`server-failover.ts`,
`node-health.ts`), so the failing call itself is answered instead of waiting for a scoring pass over
the whole provider list, and the health checker's provider list includes nodes the CSP
`connect-src` does not allow. Writing to `node-endpoint` would make a single outage permanent and
overwrite the user's choice.

* In the browser, `getReadChain()` and `getChain()` (`packages/transaction/lib/chain.ts`) fail over
  across the allowed nodes (`REACT_APP_ALLOWED_HIVE_API_NODES`, defaulting to the CSP's own list,
  minus the images host). The read client's failures are classified with `ReadTransportError`, so a
  failing read does not load wax.
* When a call is served by a node other than the current one, `setAutoRpcEndpoint` stores
  `{ replaced, node }` under `sessionStorage['auto-node-endpoint']`. Endpoint resolution
  (`getApiEndpoints`) uses that pick only while `replaced` is still the configured node (explicit
  choice, else site default). An explicit choice (`setRpcEndpoint`) clears it. A REST endpoint that
  follows the JSON-RPC node follows the pick too.
* Subscribers registered with `onApiNodeSwitch` are told about the switch. Both apps' browser query
  clients use it to refetch their active queries that are in the error state.
* Health checker pages build their checkers on the bare chain, so a checker never fails over.

### Consequences

* Good, because a dead or blocked selected node no longer breaks browser reads, for logged-in and
  logged-out users alike, in blog and wallet; a new session starts on the configured node again.
* Bad, because node selection now has three tiers (explicit choice, session pick, site default).
  Any new code that picks or reads the browser's node must go through `hive-chain-service`'s
  setters and `getApiEndpoints`, not raw storage, or it will disagree with the session pick.
* Bad, because only `chain.api` JSON-RPC calls fail over. `restApi` calls (hafah, hivemind REST,
  hivesense) are not retried. They only follow the pick when the REST endpoint follows the JSON-RPC
  node, after a JSON-RPC call has triggered the switch.
* Bad, because a call whose primary attempts time out can use up the 8 s budget before reaching
  another node. It fails, marks the node down, and the next call (or the query's own retry) is the
  one that switches. Chains WorkerBee extends from the wax chain read its default endpoint when they
  are created, so a switch made later does not reach them.
* The switch is logged but not shown to the user. A toast would need new translations.
