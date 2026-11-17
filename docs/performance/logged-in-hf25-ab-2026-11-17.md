# Logged-in hf25 post before and after #1644: an A/B with a signed-in reader (2026-11-17)

The integration check put the hf25 post (`/blog/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit`)
logged in at 1,113 ms median TBT for 51c4090c, and at 1,274 and 1,351 ms for 75a21da1 and
5861e40e, after #1644 made every `useUserSelect` reader share one QueryCache listener (issue
#1648). #1644 was profiled logged out only. This A/B measures the post with a signed-in reader,
with the code as the only difference.

## Result

#1644 adds no main-thread work for a signed-in reader. Both builds render the same components in
the same commits on every load: 13,756 components in 20 commits. The CPU profile and Lighthouse
put the build with #1644 at or below the one without it. The rise in the integration results
does not reproduce with the code as the only difference. Like the rises in
`logged-in-tbt-ab-2026-11-16.md` and `logged-out-hf25-ab-2026-11-16.md`, it is within what live
data and the measurement window move. Nothing is changed.

What #1644 changed for a signed-in reader: when the stored user is applied after hydration, the
user query's events reach the `useUserSelect` readers through one batched callback that calls
every reader, not through one QueryCache listener and one batched callback per reader. In both
cases the callbacks run in the same notifyManager flush (`QueryCache.notify` runs inside
`notifyManager.batch`), and each reader's `useSyncExternalStore` compares its own selection. So
the same components re-render in the same commit. Only the cache's per-event listener loop is
shorter.

## Method

- Trees: 5861e40e (B), and 5861e40e with `use-user-select.ts` as it was before #1644 (A). The
  blog code of 51c4090c and 5861e40e differs only by #1644: #1645 and #1646 changed
  `packages/ui/lib/time-ago.ts` (witness page) and the wallet.
- Builds: production builds (`NEXT_PUBLIC_BASE_PATH=/blog`), each packaged and served as
  `.aidev/run-lighthouse-fixture.sh` does (standalone server, its site router with the page
  clock, image replay of the `lighthouse` recording).
- Data: the `lighthouse` recording has no reads for a signed-in observer (with `observer` set,
  SSR misses `get_discussion`, `get_post`, `get_community`, `get_follow_list`, and the client
  misses `find_accounts`, `unread_notifications`, `find_rc_accounts`). A recording of those reads
  for `blocktrades` was made from api.hive.blog through the fixture proxy's record mode (both
  builds, signed in and out, two loads each). All measurements replayed it: 242 requests served,
  0 misses. The recording was scratch data and is not committed.
- Signed-in reader: the integration check's (`scripts/ci-helpers/lighthouse-login.js`): the
  `observer` cookie and the localStorage `user` entry of a Keychain login as `blocktrades`.
- CPU profile and commit counts: Chromium 156 (Playwright's build, from the suites' image), 4×
  CPU throttling, Chrome's sampling profiler (CDP `Profiler`, 200 µs) over the load and the
  following 8 s. Busy time is every sample except `(idle)` and `(program)`. A DevTools global
  hook counts the function components that ran in each commit (fibers with `PerformedWork`,
  skipping subtrees whose children were not reconciled). The two builds alternated, in two rounds
  of 5 loads each.
- Lighthouse: the check's own `scripts/ci-helpers/lighthouse-logged-in-run.js` (logged in) and
  the `lighthouse` CLI (logged out), 13.5, mobile simulated, in common-ci-configuration's
  `node-test-tools-browser` image. The builds alternated run by run, 9 runs each.

## Measurements

CPU profile, signed in, 10 loads each:

| Tree | Busy median (ms) | Busy range | Long-task blocking median (ms) | Components rendered | Commits |
|---|---|---|---|---|---|
| A, #1644 reverted | 1,322 | 1,266-1,379 | 1,001 | 13,756 | 20 |
| B, 5861e40e | 1,307 | 1,258-1,343 | 992 | 13,756 | 20 |

The hydration commit renders 6,698 components and the commit that applies the stored user 3,521,
on both builds. The per-commit counts are the same on every load of both builds, apart from one
load of B that split one commit in two (236 more components, from timing). Among each load's 40 largest self times, no function's mean differs by more than
4.1 ms between the builds, in either direction.

Lighthouse TBT, 9 runs each, benchmark index 4,496-4,880 (ms):

| Tree | Logged in, median | Runs | Logged out, median | Runs |
|---|---|---|---|---|
| A, #1644 reverted | 607 | 511-689 | 441 | 417-534 |
| B, 5861e40e | 534 | 456-660 | 459 | 422-540 |

The medians differ by less than each tree's spread. The host is faster than the integration
host (benchmark index about 2,900-3,200 in `logged-in-tbt-ab-2026-11-16.md`), so the absolute
values are lower than the integration results.

## Seen, not changed

Every load throws React error #418 (hydration text mismatch) on both builds, signed in and
logged out, on the `lighthouse` recording as on live data. React then renders the mismatching
boundary on the client. It is not from #1644, and it is not investigated here.

## Not covered

- The integration host itself and live data at the time of its passes. The fixing revision's
  integration result comes after the promote.
- Data that changes over time. The recording is one instant (2026-11-17 00:56 UTC).
