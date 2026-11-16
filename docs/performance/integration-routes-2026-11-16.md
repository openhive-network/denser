# Integration Lighthouse check: search, login, communities and for-you (2026-11-16)

The integration check (`stack/integration/lighthouse.sh`) now also measures:

| Route | Logged out | Logged in |
|---|---|---|
| `/blog/search?ai=hive%20hardfork%20changes` | ✓ | ✓ (own-vote state in the results) |
| `/blog/search?q=hardfork` | ✓ | |
| `/blog/login` | ✓ | |
| `/blog/communities` | ✓ | ✓ |
| `/blog/for-you` | | ✓ (its real use) |

This adds measurement only. `/blog/login` and `/blog/communities` have their own fix
issues, and their limits here are not those issues' targets.

## Measurements

Two passes, both Lighthouse 13.5 mobile in the check's pinned image, `--cpus 2`, against
`denser.discuss.peerverity.info`:

- **A**: 3 runs per route, logged out, build `c891572c`, on the integration host.
- **B**: the check itself (`lighthouse-integration-check.js`, 5 runs per route and mode,
  logged in as `blocktrades`), revision `3baba6ef` (still build `c891572c`), run from
  steem-4. On `/blog/trending`, B's logged-out median (perf 71, LCP 4,974 ms, TBT
  672 ms) is within a run's noise of the integration host's last pass (66, 5,254 ms,
  563 ms), so B's times are comparable.

Medians (B also lists the range of its 5 runs):

| Route | Mode | Perf | LCP (ms) | TBT (ms) | JS (bytes) | WASM (bytes) | LCP lazy |
|---|---|---|---|---|---|---|---|
| AI search | out, A | 67 | 4,400 | 727 | 384 KB | | |
| AI search | out, B | 64 (55-68) | 5,081 (3,827-7,528) | 728 (505-849) | 383,724 | 0 | yes |
| AI search | in, B | 64 (57-69) | 5,014 (4,101-5,753) | 685 (592-896) | 389,095 | 0 | yes |
| classic search | out, A | 62 | 4,900 | 770 | 384 KB | | |
| classic search | out, B | 69 (64-73) | 4,625 (4,460-5,086) | 579 (404-820) | 383,725 | 0 | yes |
| `/blog/login` | out, A | 56 | 8,900 | 789 | 676 KB | | |
| `/blog/login` | out, B | 59 (55-60) | 8,905 (8,816-8,922) | 650 (598-913) | 676,043 | 751,243 | no |
| `/blog/communities` | out, A | 64 | 3,600 | 1,610 | 372 KB | | |
| `/blog/communities` | out, B | 71 (62-72) | 2,643 (2,459-3,878) | 1,458 (1,202-1,533) | 371,650 | 0 | no |
| `/blog/communities` | in, B | 75 (73-76) | 2,657 (2,491-2,804) | 1,063 (847-1,151) | 377,137 | 0 | no |
| `/blog/for-you` | in, B | 47 (46-47) | 7,669 (7,207-9,603) | 2,566 (2,404-2,617) | 470,796 | 0 | no |

- Both searches paint a `loading="lazy"` image as their LCP, so their limits leave
  `lcp-lazy-loaded` out: it would breach on the first pass.
- `/blog/login` loads the wax WASM (751 KB) logged out; the other new logged-out routes
  load none.
- The AI search's first logged-out run had a 641 ms TTFB and the next four 3-7 ms;
  logged in, 2,569 ms and then 49-268 ms. Its server render waits for hivesense on
  `api.syncad.com`, which answers a repeated query from its cache. The route is left
  out of the environment's TTFB baseline (`routeTtfb` in
  `scripts/ci-helpers/lighthouse-integration-check.js`).

## Limits

As for the routes the 2026-10 audit added (`page-audit-2026-10.md`), from the higher
of the two passes' medians:

- **Performance** (logged out only, as before): about 8 points under the lowest run,
  rounded down to 5.
- **LCP:** 1.3× the median or the highest run, whichever is higher, rounded up to 500 ms.
- **TBT:** 1.5× the median or the highest run, rounded up to 250 ms.
- **JS:** the median plus 6 %, rounded up to 10,000 bytes. **WASM:** 0 on the logged-out
  routes that load none, `/blog/login`'s plus 10 %, and 1,070,000 on every logged-in
  route, as on the existing ones.
- **CLS:** 0.1 (every new route measured ≤ 0.003).
- **Logged in:** never below the route's logged-out LCP and TBT limits.

| Route | Mode | Perf | LCP | TBT | JS | WASM |
|---|---|---|---|---|---|---|
| AI search | out | 45 | 8,000 | 1,250 | 410,000 | 0 |
| AI search | in | | 8,000 | 1,250 | 420,000 | 1,070,000 |
| classic search | out | 50 | 6,500 | 1,250 | 410,000 | 0 |
| `/blog/login` | out | 45 | 12,000 | 1,250 | 720,000 | 830,000 |
| `/blog/communities` | out | 50 | 5,000 | 2,500 | 400,000 | 0 |
| `/blog/communities` | in | | 5,000 | 2,500 | 400,000 | 1,070,000 |
| `/blog/for-you` | in | | 10,000 | 4,000 | 500,000 | 1,070,000 |

## Duration

The check grows from 75 to 110 runs per measured revision (20 logged-out and 15
logged-in runs more). Pass B took 801 s for 45 runs and the probes, about 18 s a run;
at the integration host's earlier figure of about 24 s a run, the check takes about
45 minutes, inside the unit's 3-hour `TimeoutStartSec`, with one Chrome at a time on
2 CPUs as before.
