---
date: 2026-10-09
status: accepted
decision-makers: []
consulted: []
informed: []

id: DR-007
proposed_by: claude
area: transaction/observer
related_issues: [500]
related_decisions: []
---

# Send the default observer on filtering-only reads of accounts without lists of their own

## Context and Problem Statement

API nodes cache every call that takes an `observer` separately per observer, so each logged-in
user's feed and post reads got their own cache entries. The blog's own SSR feed and profile caches
did the same: they cached only the anonymous observer. In hivemind the observer of these reads only
applies mute and blacklist filtering: the account's own mutes and blacklist, and the muted lists and
blacklists it follows. Most accounts have none of these, so their reads could share the anonymous
cache if the frontend knew which accounts have none.

## Considered Options

* Send the default observer `hive.blog` (the logged-out view) for accounts without lists of their own
* Send an empty observer for those accounts
* Keep sending the username (no change)

## Decision Outcome

Chosen option: **"Send the default observer `hive.blog`"**, because it is the observer logged-out
visitors already send, so these accounts share the logged-out entries on the API nodes and in the
blog's SSR caches. The cost is that they see `hive.blog`'s spam filtering (its mutes and its
followed lists), the same view as a logged-out visitor. An empty observer would keep their results
byte-identical but share less cache. The value is `commonVariables.defaultObserver`, and
`DEFAULT_OBSERVER` and the bridge-api defaults use it too, so changing it is a one-line edit.

The rule, in `packages/transaction/lib/observer-lists.ts`:

* An account "has lists of its own" when `bridge.get_follow_list(observer, 'muted')` or
  `(observer, 'blacklisted')` is non-empty, or `bridge.does_user_follow_any_lists(observer)` is true.
* Reads that only filter take the *effective* observer (`getEffectiveObserver`): `get_ranked_posts`,
  `get_account_posts` (all sorts except `feed`), `get_post`, `get_discussion`, and search. (The post editor's read-back of a just-published post still sends the username.) On the
  client the effective observer comes from `useEffectiveObserver`, and in SSR from
  `getEffectiveObserverFromCookies`.
* Reads where the observer means more keep the username: communities and subscriptions
  (`context.subscribed`, roles), `get_ranked_posts` with `tag='my'`, `get_account_posts` with
  `sort='feed'`, `get_profile`, relationships and follow lists.
* Unknown means the username. The answer is checked at sign-in and stored per account in
  localStorage for 24 hours (re-checked when missing or expired). A cookie naming the account
  carries it to SSR, which falls back to the username without that cookie. After an addition to
  any of the lists the answer becomes "has lists". After a removal or reset it is dropped and
  checked again. A failed check leaves it unknown.
* SSR feed and profile pages cache card entries with every vote and keep only the viewer's own vote
  after the cache. A page read as `hive.blog` still shows the signed-in user's vote.

### Consequences

* Good, because accounts without lists of their own share the anonymous cache on the API nodes and
  in the blog's SSR feed and profile caches.
* Good, because the check can only switch an account to the default observer when all three
  answers say it has no lists; errors, missing cookies and expiry fall back to the username.
* Bad, because every new call that takes an observer must choose between the username and the
  effective observer, and a query key built from the effective observer must not be seeded with
  data read for another observer.
* Bad, because a list changed on another frontend is noticed only when the stored answer expires
  (up to 24 hours) or at the next sign-in. Until then, an account that added a list there sees the
  default filtering.
* Bad, because the SSR caches now hold every vote of each cached post, so fewer pages fit under
  `DENSER_FEED_CACHE_MAX_MB`.
