---
date: 2026-10-10
status: accepted
decision-makers: []
consulted: []
informed: []

id: DR-008
proposed_by: claude
area: transaction/api-failover
related_issues: [1105]
related_decisions: [DR-001]
---

# Hedge failover attempts across API nodes instead of trying them one after another

## Context and Problem Statement

DR-001 fails a read over to the other allowed nodes one after another, each attempt with a 2 s
timeout, within an 8 s budget. A black-holed primary used that budget up by itself: its first attempt
runs on the configured chain's own 5 s timeout, then a 250 ms pause and a 2 s retry, so a cold server
answered 503 before any fallback was asked. Making the attempt timeout shorter to leave room for the
fallbacks would not work either: 2 s was already short enough to mark healthy nodes down on one heavy
`bridge.get_account_posts`, and once every node was down the dead primary was asked first again.

## Considered Options

* Hedged attempts: when a node has not answered after a head start, also ask the next node, keep both
  running, and take the first answer
* Give each node a fixed share of the budget and stop waiting for a node when its share ends
* Adaptive per-action attempt timeouts, or marking a node down only after repeated failures

## Decision Outcome

Chosen option: **"hedged attempts"**, because only the head start, not the slow node's request
timeout, decides when a fallback gets its turn. That lets the attempt timeout grow long enough for heavy
calls without slowing failover.

* `HEDGE_DELAY_MS` (2.5 s) is the head start, `FAILOVER_ATTEMPT_TIMEOUT_MS` is now 5 s, and the 8 s
  budget still decides whether a new attempt may start. A fast transport failure still moves on, or
  retries the healthy primary after the 250 ms pause, without waiting for the head start.
* A node still silent when a node asked after it serves the call is marked down; when the later node instead returns a definitive API error, that error is rethrown and the silent node is not marked down. The abandoned attempt keeps
  running: a late answer marks the node up again, and a late failure restarts its cooldown. It starts
  no retry once the call has settled.
* When every node is down, they are all admitted, the most recently healthy first, though each later node is still started only while a full attempt fits the budget (`NodeHealth` records
  each node's last success).
* The failure log names the nodes that were actually tried.

### Consequences

* Good, because a cold server with a dead primary is served by the fallback after about 2.5 s, well
  within the budget, and later calls skip the primary until it answers again.
* Good, because a heavy call of up to 5 s no longer fails or marks a node down by timeout alone.
* Bad, because any call slower than 2.5 s now sends a second request to another node, which adds
  load on the API nodes for slow calls.
* Bad, because a healthy node that loses one race is skipped until its late answer arrives (at most
  its request timeout). A third node may only start while a full 5 s attempt still fits the budget,
  so if the first fallback stalls too, a later node is often not tried.
* A future change to these constants must keep the head start plus one attempt timeout within the
  budget, or a hedged fallback can no longer start.
