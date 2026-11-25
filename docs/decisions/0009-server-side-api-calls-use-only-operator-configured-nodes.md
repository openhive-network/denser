---
date: 2026-11-25
status: accepted
decision-makers: [gandalf]
consulted: []
informed: [dan]

id: DR-009
proposed_by: gandalf
area: transaction/api-node-selection
related_issues: [1136, 1416, 1421, 1778]
related_decisions: [DR-001, DR-006]
---

# Server-side API calls use only operator-configured nodes; request input never chooses them

## Context and Problem Statement

Since #1416 and #1421 the server routed Hive API calls by the visitor's choice:

* A request carrying the `api-sets` cookie was rendered through a per-request engine built from that
  cookie (`ApiSetEngine.forRequest`), so the visitor picked which node our server called.
* The server's catalog was the operator's nodes plus the hardcoded public `SELECTABLE_API_NODES`. Both
  the cookie's choice and the server's own failover could reach those public nodes, and the shared
  engine probed them.

That broke a denser ground rule, that the server talks only to nodes the instance operator configured
and fails over only among them. It also reversed the "failover list unchanged" part of #1136.

## Considered Options

* The server uses only the operator's nodes; the visitor's pick applies in the browser only
* Keep routing server calls by the visitor's cookie, restricted to the public catalog

## Decision Outcome

Chosen option: **"the server uses only the operator's nodes"**. Server-side code (server components,
`generateMetadata`, route handlers, server actions, background refreshes) calls only the API nodes the
operator configured, in the operator's order, and fails over only among them. Nothing in a request
(cookie, header, query, body) may choose or add a node. The browser keeps the full catalog, the picker,
the CSP's `connect-src` and its session failover (DR-006).

This record reverses the server-side parts of #1416 and #1421. Their browser-side parts stay.

Why:

* Letting request input steer a server's outgoing requests can be abused, against the instance itself
  and against other servers. The safe default is that request input cannot do it.
* Following the pick makes the visitor's own pages slower, often much slower. For a visitor far from the
  server who picks a node near themselves, every server-side API call of a render pays the long
  server-to-node round trip, several times per page. Rendered through the operator's node, which runs
  next to the server, only the visitor-to-server hop is long.
* The pick speeds up only the browser's own calls (comments, further feed pages, votes, wallet data),
  which go straight from the visitor to the node they chose. Condenser worked the same way: a fixed
  server node list, and any node in the browser.
* Redundancy comes from many `haf_api_node` instances, each with its own operator and node list. An
  operator who wants another node adds it in configuration.

### Consequences

* Good, because a request can no longer make the server call a host the operator did not configure.
* Good, because a visitor's pick no longer slows the server-side part of their pages.
* Good, because the `api-sets` cookie is retired: the choice lives in the browser's localStorage only,
  and cached HTML is shared again across visitors with different picks.
* Bad, because a set the operator's nodes cannot serve degrades on the server as it does when no node
  serves it (for example lite falls back to the stock reads, #1545), instead of borrowing a public node.
* Changing this rule takes a decision record that supersedes this one.
