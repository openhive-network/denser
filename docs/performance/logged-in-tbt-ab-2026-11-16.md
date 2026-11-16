# Logged-in TBT between c891572c and 99f068ab: an A/B on one host (2026-11-16)

The integration check's result for 99f068ab (the promote of #1627-#1631) has higher TBT
on the logged-in routes than its result for c891572c: `/blog/@blocktrades/notifications`
1,090 to 1,990 ms, `/wallet/@gtg/transfers` 949 to 1,284 ms (issue #1634). The two results
were measured three days apart (2026-11-13 03:37 and 2026-11-16 11:55 UTC), on live data,
and the second one is the first 110-run pass (#1630). This A/B measures both builds at the
same time, on the same data and CPU.

## Result

Both builds do the same main-thread work on these pages. No work was added between
c891572c and 99f068ab that runs when a signed-in reader loads them. On today's data,
c891572c measures about 2,160 ms TBT on notifications, as high as 99f068ab measures on
the integration site. The rise between the two integration results comes from the
measurement window, not from the code. These pages never mount #1628's sign-in code:
the form is `next/dynamic` in both apps' `dialog-login.tsx`, and
`LazyGoogleOAuthRedirectHandler` mounts only on a Google OAuth return. #1627's lite hooks
render only on post pages (`comment-list-item.tsx`, the post `content.tsx`).

## Method

- Builds: `git archive` of each revision, `pnpm build` of `apps/blog` and `apps/wallet` in
  the suites' image (`aidev-tests`, offline install from its store). Each build was served
  as a standalone server (as `.aidev/blog-serve-standalone.sh` does) at the root path, with
  the integration site's mainnet API settings (`REACT_APP_API_ENDPOINT=https://api.syncad.com`,
  browser logging on at `info`).
- Lighthouse: the check's own `scripts/ci-helpers/lighthouse-logged-in-run.js` (logged in
  as `blocktrades` with the `observer` cookie and the `user` localStorage entry) in the
  check's pinned image (`gitlab-ci-utils/lighthouse`, 13.5), mobile simulated. The
  container was limited to `--cpus 0.7`, so the benchmark index (2,850-3,190) matched the
  integration host's 110 runs of 99f068ab (2,880-3,196). The two builds alternated run by run.
- CPU profile: Chrome's sampling profiler (CDP `Profiler`, 4× CPU throttling) over the load
  and the following 8 s. Busy time is every sample except `(idle)`. The builds alternated.

## Measurements

Lighthouse, logged in, medians:

| Route | Runs each | TBT c891572c | TBT 99f068ab | Main thread c891572c | Main thread 99f068ab |
|---|---|---|---|---|---|
| `/@blocktrades/notifications` | 10 | 2,157 (1,429-3,506) | 2,410 (1,660-3,086) | 5,340 | 5,518 |
| `/@blocktrades` | 8 | 1,718 (1,277-4,787) | 2,066 (1,348-3,118) | 5,320 | 5,475 |
| wallet `/@gtg/transfers` | 5 | 1,507 (1,437-1,629) | 1,694 (1,546-2,155) | 3,913 | 4,190 |

Both builds have the same long tasks: 13 on notifications, 12 on the profile, 10-11 on
the wallet, the same chunks (React DOM, TanStack Query's observer and the document) carry
the blocking time, and no chunk that only 99f068ab loads carries any. The spread at
`--cpus 0.7` is wide (CFS quota bursts), so the 10-20 % gap between the TBT medians is
within it. The profile's runs 1-5 overlapped the wallet builds.

CPU profile busy time per load, logged in, `--cpus 2`, medians (ms):

| Route | Runs each | c891572c | 99f068ab |
|---|---|---|---|
| `/@blocktrades/notifications` | 10 | 1,015 | 985 |
| `/@blocktrades` | 6 | 1,074 | 1,089 |
| wallet `/@gtg/transfers` | 8 | 1,162 | 1,159 |

## Data- and time-dependent work

In one series of 8 alternating loads of notifications, the first 5 of each build were
about 2.5 times the later ones (busy 2,300-3,600 ms against 1,000-1,400 ms), and both
builds dropped at the same time. No load after that series was heavy (20 more). The heavy
loads were not profiled in detail, and their cause is open. bridge
`account_notifications` returned the same 100 entries throughout. Work that changes over
time like this, on the same build, can move an integration result taken at another time
by as much as the c891572c-to-99f068ab difference.

## Not covered

- The integration host itself (no shell access: `predicate-testing.syncad.com` refuses
  the key). Its c891572c reports were removed with that revision, and its summary has no
  benchmark index, so the host's CPU on 2026-11-13 is not known.
- The subdirectory (`/blog`, `/wallet`) builds the site serves. These were root builds;
  the chunks loaded on notifications total 1,339,330 bytes here against 1,362,640 on the
  site, in 38 and 40 scripts.
