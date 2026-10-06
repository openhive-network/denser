# Page performance audit: every blog and wallet route (2026-10)

Issue #1039. This report measures every blog and wallet route, attributes the main costs to code, and
ranks the problems by user impact. Each top problem comes with a follow-up issue that is ready to
file. It changes no product code.

| | |
|---|---|
| **Build** | `0f365af4d7f93ed88fd85fb298c41188ba60280b` for both blog and wallet, as reported by `/status/deployed.json` (#1037 and #1038 included) |
| **Source** | Integration site `https://denser.discuss.peerverity.info` (mainnet data, `aidev/integration` build). Every number here comes from this site; no local or fixture build was used. |
| **When** | 2026-10-06, 02:07–03:47 UTC |
| **Lighthouse** | 13.5.0 in the pinned `gitlab-ci-utils/lighthouse` image that `stack/integration/lighthouse.sh` uses; `--cpus 2 --memory 2g`; one run at a time; performance category only |
| **Form factors** | Mobile (Lighthouse default: Moto G Power emulation; simulated 150 ms RTT, 1.6 Mbps, 4× CPU) and desktop (`--preset=desktop`) |
| **Runs** | 3 per route and form factor (324 runs, none failed). The tables show the per-metric median, computed the same way as `scripts/ci-helpers/lighthouse-median.js`. |
| **Accounts and content** | `gtg` (profile and wallet), `hive-160391` (community), tag `photography`. Posts: `@gtg/hive-hardfork-25-jump-starter-kit` (the automated check's post, which opens with a YouTube video, 42 comments), `@ibarra95/visiting-the-desparramaderos-waterfall-nature` (21 KB body, 10 images), and `@hiveio/announcing-the-launch-of-hive-blockchain` (981 replies). |
| **Logged in?** | No. Every route was measured logged out; [Logged-in-only pages](#logged-in-only-pages) says what a session adds. |

**Supporting measurements (same site, same build):**

- **HTML and RSC sizes.** Each route fetched once with `Accept-Encoding: gzip`. *Inline RSC* is the total size of the `self.__next_f.push` scripts in the HTML. The client-navigation RSC size (`RSC: 1` request) is noted in the text where it matters.
- **CPU and API attribution.** Each route loaded with `puppeteer-core` (from the same image) in the Moto G Power viewport, with **real** 4× CPU throttling and no network throttling. A CPU profile was recorded and its self-time mapped to Turbopack modules. Every request was logged with its JSON-RPC method, plus the DOM size and console errors. One browser loaded all routes in turn, so its HTTP cache was warm after the first page. Its CPU numbers are therefore lower bounds, meant for attribution rather than as scores.
- **Chunk contents.** Chunks were downloaded and identified by their content, since production has no source maps.

**Reading Lighthouse here.** Single runs of the same build differ by seconds of LCP, as the
automated check already notes. Comparing my medians with the automated check's medians from an hour
earlier on the same build gives: trending 50 vs 58, post 47 vs 48, profile 45 vs 53, and wallet
transfers 45 vs 46. Treat differences under about 10 points, or about 1.5 s of mobile LCP, as noise.
Two effects dominate the mobile numbers. Read
[How mobile LCP behaves on these pages](#how-mobile-lcp-behaves-on-these-pages) before comparing
routes.

## Contents

1. [Summary](#summary)
2. [How mobile LCP behaves on these pages](#how-mobile-lcp-behaves-on-these-pages)
3. [All routes: mobile and desktop medians](#all-routes-mobile-and-desktop-medians)
4. [LCP sub-parts, long tasks and requests (mobile)](#lcp-sub-parts-long-tasks-and-requests-mobile)
5. [Problems shared across many routes](#problems-shared-across-many-routes)
6. [Top problems ranked by user impact](#top-problems-ranked-by-user-impact)
7. [The two leads from the issue](#the-two-leads-from-the-issue)
8. [Logged-in-only pages](#logged-in-only-pages)
9. [Smaller findings](#smaller-findings)
10. [Ready-to-file follow-up issues](#ready-to-file-follow-up-issues)
11. [Changes to the automated check](#changes-to-the-automated-check)
12. [Reproducing](#reproducing)

## Summary

- **Desktop is mostly fine; mobile is not.** Desktop medians are 83–100 on almost every blog route.
  The exceptions are the 981-reply post (60), wallet `~witnesses` (53, from CLS) and wallet
  `transfers` (62). On mobile, the main feeds, posts and profile post lists score 42–57, and the wallet
  pages that wait for wax score 45–55.
- **Lead 1 (wallet transfers TBT).** The cost is one React render of the 500-row operation history,
  not JS download. When the history arrives inside the measurement window there is **one 4.2–4.5 s
  long task** and TBT is about 6.5 s. When the request times out (1 run in 3), TBT is 1.8 s. That is
  why #1037's 163 KB cut barely moved TBT. See [P5](#p5).
- **Lead 2 (post-page LCP).** On the automated check's post, the LCP element is the YouTube facade
  thumbnail. A `useEffect` creates it after hydration, so **render delay is 1.4 s of the 2.1 s
  observed LCP** (67%). TTFB is 0.6 s, load delay 19 ms, load duration 77 ms. #1038's preload can't
  help an element that doesn't exist until hydration. See [P2](#p2).
- **One post with many replies breaks the post page.** The 981-reply post renders 955 comments in
  one response: 7.7 MB of HTML, 52k DOM nodes, TTFB 3.4–5.7 s and mobile TBT 6.9 s. The 50-per-page
  limit isn't applied. See [P1](#p1).
- **Every wallet page that reads through wax waits for the 948 KB WASM.** Market, proposals,
  transfers, delegations, author-rewards and curation-rewards have mobile LCP of **10.2–11.4 s**.
  Wallet pages that don't wait for it are at 1.1–1.3 s. DR-0002 ("serve Hive API reads through a
  wasm-free client") was never applied to the wallet. See [P6](#p6).
- **Every blog page downloads all 9 languages** (9 chunks, ~98 KB transferred, ~265 KB raw), and
  i18next spends 180–580 ms of 4×-throttled CPU on each load. The wallet does the same with 10
  languages. See [P4](#p4).
- **Feed and profile cards build their summaries on the client from each post's full markdown body.**
  That ships Remarkable (~80 KB transferred) in the initial JS of every feed and profile, and puts
  every full body into the RSC payload (120–290 KB of inline RSC per feed page). See [P3](#p3); this
  is the root of #928's payload.
- **Layout shift.** Community pages shift by 0.16–0.17 on mobile, and the wallet witness table by
  0.72–0.73 on both form factors. These are the only CLS failures. See [P7](#p7) and [P11](#p11).
- **No route has a lazy-loaded LCP image** (`lcp-lazy-loaded` is false on all 108 route and form
  factor medians).
- **Cheap wins:** the wallet favicon points at `/favicon.ico`, which redirects to the blog feed, so
  every wallet page downloads 93 KB of blog HTML and costs the blog server a feed render
  ([P12](#p12)). The Sentry SDK (~47 KB transferred) ships and evaluates with no DSN configured
  ([P13](#p13)).

## How mobile LCP behaves on these pages

Lighthouse's mobile LCP is simulated (Lantern). It starts from an unthrottled observed run and
replays it on the throttled network and CPU. Two consequences explain most of the spread in the
table below.

1. **Mobile LCP takes one of two values.** If the LCP element painted early in the observed run
   (within about 1.2 s, with a render delay under about 0.3 s), the simulated mobile LCP is 1.1–3 s:
   `muted`, community feeds, `search`, `welcome`, the profile list tabs, wallet `/`,
   `communities`, `authorities`, `permissions`, `password`. If it painted later, Lantern puts the
   whole startup JS (700–880 KB on the blog, 465–710 KB plus 948 KB of WASM on the wallet) and its
   4× CPU cost before LCP, and the result is **6–11 s**. Across routes, mobile LCP doesn't correlate
   with bytes (r = 0.12 against JS + HTML transfer), because every blog route ships about the same
   JS. It does follow whether the LCP element waits for script work. So the biggest LCP lever is to
   make the LCP element paint without waiting for hydration or client fetches. Cutting JS mostly
   moves TBT.
2. **The observed render delay on feed images overstates what users see.** Lighthouse records 1–2 s
   of render delay on the feed's first image (`trending`, `hot`, `created`, `[tag]`). The image is
   in the server HTML, `loading="eager"` and `fetchpriority="high"`, preloaded, and loaded by about
   0.5 s; nothing hides it. With real 4× CPU throttling and an unthrottled network, the same pages
   paint that image at **0.4–1.2 s**. The delay comes from the startup script evaluation that
   competes with paint on the 2-CPU measurement container. It shows how much main-thread work runs
   at startup, which is the subject of P3, P4, P9 and P13. It doesn't mean a feed-specific bug delays
   the image.

## All routes: mobile and desktop medians

Median of 3 Lighthouse runs per cell. *JS* is the script transfer size, the same metric as the
automated check's `script-transfer-bytes`. *HTML* is the document's transfer size and its
decompressed size. *RSC inline* is the decompressed size of the flight payload embedded in the
HTML. *LCP lazy* is Lighthouse's `lcp-lazy-loaded` check.

| Route | Mobile perf | LCP s | TBT s | CLS | Desktop perf | LCP s | TBT s | CLS | JS KB | HTML KB (wire / raw) | RSC inline KB | LCP lazy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/blog/trending` | 50 | 8.3 | 1.2 | 0.000 | 93 | 1.4 | 0.1 | 0.002 | 701 | 95 / 367 | 224 | no |
| `/blog/hot` | 51 | 9.7 | 0.9 | 0.000 | 93 | 1.3 | 0.1 | 0.002 | 701 | 82 / 353 | 220 | no |
| `/blog/created` | 49 | 8.0 | 1.3 | 0.002 | 93 | 1.4 | 0.1 | 0.002 | 701 | 77 / 348 | 217 | no |
| `/blog/payout` | 55 | 8.7 | 0.6 | 0.002 | 96 | 0.8 | 0.1 | 0.002 | 701 | 84 / 340 | 223 | no |
| `/blog/muted` | 74 | 1.6 | 1.1 | 0.002 | 97 | 0.5 | 0.1 | 0.002 | 701 | 31 / 234 | 121 | no |
| `/blog/trending/photography` | 51 | 8.7 | 1.0 | 0.002 | 92 | 1.4 | 0.2 | 0.002 | 859 | 110 / 435 | 290 | no |
| `/blog/hot/photography` | 68 | 2.8 | 1.1 | 0.002 | 93 | 1.2 | 0.2 | 0.002 | 859 | 72 / 337 | 204 | no |
| `/blog/created/photography` | 50 | 8.4 | 1.0 | 0.002 | 93 | 1.4 | 0.2 | 0.002 | 859 | 65 / 314 | 180 | no |
| `/blog/payout/photography` | 53 | 8.6 | 0.9 | 0.002 | 95 | 1.1 | 0.1 | 0.002 | 859 | 45 / 251 | 136 | no |
| `/blog/muted/photography` | 81 | 1.4 | 0.8 | 0.001 | 100 | 0.5 | 0.1 | 0.001 | 859 | 18 / 95 | 77 | no |
| `/blog/trending/hive-160391` | 66 | 2.8 | 0.8 | 0.172 | 90 | 1.9 | 0.1 | 0.002 | 859 | 31 / 140 | 104 | no |
| `/blog/hot/hive-160391` | 67 | 2.8 | 1.0 | 0.158 | 91 | 1.8 | 0.1 | 0.002 | 859 | 23 / 109 | 85 | no |
| `/blog/created/hive-160391` | 55 | 3.7 | 1.1 | 0.172 | 92 | 1.3 | 0.1 | 0.002 | 859 | 75 / 344 | 213 | no |
| `/blog/payout/hive-160391` | 63 | 2.7 | 1.4 | 0.158 | 90 | 1.7 | 0.1 | 0.002 | 859 | 23 / 109 | 85 | no |
| `/blog/muted/hive-160391` | 58 | 6.6 | 0.8 | 0.044 | 95 | 1.4 | 0.1 | 0.002 | 859 | 18 / 95 | 77 | no |
| `/blog/roles/hive-160391` | 49 | 6.6 | 0.8 | 0.169 | 94 | 1.6 | 0.0 | 0.002 | 843 | 18 / 91 | 75 | no |
| `/blog/communities` | 60 | 4.5 | 1.5 | 0.002 | 93 | 1.0 | 0.2 | 0.004 | 680 | 29 / 263 | 75 | no |
| `/blog/search` | 83 | 1.2 | 0.7 | 0.003 | 100 | 0.4 | 0.0 | 0.001 | 694 | 8 / 61 | 37 | no |
| `/blog/welcome` | 83 | 1.2 | 0.6 | 0.001 | 100 | 0.4 | 0.0 | 0.001 | 644 | 8 / 42 | 26 | no |
| `/blog/faq.html` | 70 | 4.6 | 0.5 | 0.001 | 100 | 0.5 | 0.0 | 0.001 | 644 | 57 / 232 | 133 | no |
| `/blog/tos.html` | 71 | 4.4 | 0.6 | 0.001 | 100 | 0.4 | 0.0 | 0.001 | 644 | 18 / 87 | 49 | no |
| `/blog/privacy.html` | 83 | 1.2 | 0.7 | 0.001 | 100 | 0.4 | 0.1 | 0.001 | 644 | 21 / 93 | 57 | no |
| `/blog/submit.html` | 82 | 1.2 | 0.7 | 0.001 | 100 | 0.6 | 0.0 | 0.001 | 784 | 6 / 35 | 22 | no |
| `/blog/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit` | 47 | 7.1 | 1.9 | 0.001 | 83 | 1.7 | 0.2 | 0.001 | 857 | 57 / 478 | 161 | no |
| `/blog/hive-163772/@ibarra95/visiting-the-desparramaderos-waterfall-nature` | 44 | 6.4 | 1.7 | 0.001 | 90 | 1.3 | 0.1 | 0.001 | 857 | 82 / 417 | 184 | no |
| `/blog/communityfork/@hiveio/announcing-the-launch-of-hive-blockchain` | 42 | 4.4 | 6.9 | 0.000 | 60 | 1.0 | 1.0 | 0.000 | 857 | 469 / 7552 | 1361 | no |
| `/blog/@gtg` | 45 | 7.0 | 1.5 | 0.001 | 86 | 1.7 | 0.2 | 0.002 | 705 | 66 / 318 | 173 | no |
| `/blog/@gtg/posts` | 50 | 6.7 | 1.5 | 0.001 | 90 | 1.5 | 0.2 | 0.001 | 707 | 67 / 339 | 185 | no |
| `/blog/@gtg/comments` | 57 | 5.0 | 1.4 | 0.001 | 94 | 1.2 | 0.2 | 0.001 | 706 | 25 / 206 | 86 | no |
| `/blog/@gtg/replies` | 51 | 6.0 | 1.4 | 0.001 | 89 | 1.5 | 0.2 | 0.001 | 706 | 25 / 197 | 81 | no |
| `/blog/@gtg/payout` | 62 | 6.5 | 0.6 | 0.001 | 97 | 1.0 | 0.1 | 0.001 | 707 | 19 / 123 | 69 | no |
| `/blog/@gtg/feed` | 69 | 3.1 | 1.1 | 0.002 | 91 | 1.3 | 0.2 | 0.002 | 700 | 81 / 340 | 201 | no |
| `/blog/@gtg/communities` | 78 | 1.6 | 0.7 | 0.001 | 99 | 0.5 | 0.1 | 0.001 | 688 | 13 / 83 | 50 | no |
| `/blog/@gtg/followed` | 81 | 1.4 | 0.8 | 0.001 | 98 | 0.7 | 0.1 | 0.001 | 688 | 14 / 100 | 55 | no |
| `/blog/@gtg/followers` | 81 | 1.6 | 0.8 | 0.001 | 99 | 0.6 | 0.1 | 0.001 | 687 | 14 / 100 | 55 | no |
| `/blog/@gtg/notifications` | 71 | 1.5 | 2.3 | 0.001 | 93 | 0.8 | 0.2 | 0.001 | 692 | 19 / 185 | 61 | no |
| `/blog/@gtg/settings` | 82 | 1.4 | 0.7 | 0.001 | 99 | 0.5 | 0.1 | 0.001 | 692 | 11 / 66 | 45 | no |
| `/blog/@gtg/lists/blacklisted` | 80 | 1.5 | 0.8 | 0.001 | 99 | 0.5 | 0.1 | 0.001 | 692 | 12 / 76 | 44 | no |
| `/blog/@gtg/lists/muted` | 84 | 1.1 | 0.6 | 0.001 | 100 | 0.5 | 0.1 | 0.001 | 692 | 12 / 76 | 44 | no |
| `/blog/@gtg/lists/followed_blacklists` | 78 | 1.3 | 1.0 | 0.001 | 96 | 0.5 | 0.2 | 0.001 | 692 | 12 / 76 | 44 | no |
| `/blog/@gtg/lists/followed_muted_lists` | 79 | 1.2 | 0.9 | 0.001 | 99 | 0.5 | 0.1 | 0.001 | 692 | 12 / 76 | 44 | no |
| `/blog/trending/my` | 80 | 1.3 | 0.7 | 0.001 | 99 | 0.5 | 0.1 | 0.001 | 701 | 18 / 101 | 72 | no |
| `/wallet` | 93 | 1.2 | 0.3 | 0.001 | 100 | 0.3 | 0.0 | 0.002 | 465 | 7 / 28 | 12 | no |
| `/wallet/market` | 52 | 10.5 | 1.0 | 0.001 | 87 | 2.2 | 0.1 | 0.002 | 655 | 5 / 22 | 13 | no |
| `/wallet/proposals` | 52 | 10.2 | 1.0 | 0.000 | 87 | 2.3 | 0.1 | 0.010 | 537 | 6 / 25 | 12 | no |
| `/wallet/~witnesses` | 47 | 1.3 | 1.8 | 0.719 | 53 | 0.5 | 0.6 | 0.734 | 559 | 6 / 26 | 13 | no |
| `/wallet/@gtg/transfers` | 45 | 11.4 | 6.5 | 0.001 | 62 | 2.2 | 0.7 | 0.023 | 711 | 8 / 32 | 18 | no |
| `/wallet/@gtg/delegations` | 55 | 11.0 | 0.8 | 0.000 | 100 | 0.5 | 0.0 | 0.002 | 573 | 7 / 30 | 18 | no |
| `/wallet/@gtg/author-rewards` | 51 | 10.6 | 1.2 | 0.000 | 97 | 0.5 | 0.1 | 0.010 | 536 | 8 / 32 | 18 | no |
| `/wallet/@gtg/curation-rewards` | 52 | 10.6 | 1.1 | 0.001 | 87 | 2.1 | 0.1 | 0.019 | 536 | 8 / 32 | 18 | no |
| `/wallet/@gtg/communities` | 86 | 1.3 | 0.6 | 0.001 | 100 | 0.5 | 0.0 | 0.002 | 551 | 8 / 32 | 18 | no |
| `/wallet/@gtg/authorities` | 81 | 1.3 | 0.8 | 0.001 | 100 | 0.5 | 0.1 | 0.002 | 561 | 7 / 30 | 18 | no |
| `/wallet/@gtg/permissions` | 96 | 1.1 | 0.2 | 0.002 | 100 | 0.5 | 0.0 | 0.002 | 543 | 9 / 37 | 18 | no |
| `/wallet/@gtg/password` | 92 | 1.2 | 0.4 | 0.001 | 100 | 0.4 | 0.0 | 0.002 | 495 | 8 / 35 | 18 | no |

Not measured separately:

- **`/wallet/@acct`** answers `307` to `/wallet/@acct/transfers`, which is measured. The redirect
  adds one round trip (about 0.3 s TTFB on the redirect itself).
- **`/wallet/`** answers `308` to `/wallet`, which is measured.
- **`/created/my`, `/hot/my`, `/payout/my` and `/muted/my`** render the same logged-out page as
  `/trending/my`, which stands in for them.

## LCP sub-parts, long tasks and requests (mobile)

From each route's median mobile run (the run with the median performance score):

- The LCP sub-parts are Lighthouse's `lcp-breakdown-insight`, in ms of the **observed** run. Their
  sum is the observed LCP, which is shorter than the simulated LCP in the table above. Load delay
  and load duration are blank when the LCP element is text.
- Long tasks and the top long-task script are in simulated 4× ms.
- *API calls* counts the Fetch/XHR requests Lighthouse saw; all of them happened after `load`.
- *DOM nodes* comes from the real-throttling profile.

| Route | LCP element (mobile) | TTFB | load delay | load dur. | render delay | observed LCP | long tasks (count / longest) | top long-task script (ms) | API calls (after load) | largest chunk KB | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/blog/trending` | Post image | 347 | 29 | 143 | 2011 | 2530 | 11 / 593 | 27632012ix57n.js (1258) | 2 (2) | 27632012ix57n.js (105) | 1566 |
| `/blog/hot` | Post image | 297 | 15 | 163 | 2013 | 2488 | 10 / 569 | 27632012ix57n.js (1354) | 2 (2) | 27632012ix57n.js (105) | 1520 |
| `/blog/created` | Post image | 334 | 16 | 98 | 1046 | 1495 | 10 / 650 | 27632012ix57n.js (1084) | 2 (2) | 27632012ix57n.js (105) | 1508 |
| `/blog/payout` | The rewards for this comment are s | 247 | — | — | 2173 | 2420 | 11 / 593 | 27632012ix57n.js (1048) | 2 (2) | 27632012ix57n.js (105) | 1398 |
| `/blog/muted` | Photo by CHRIS ROYER Photographie  | 561 | — | — | 139 | 701 | 9 / 603 | 27632012ix57n.js (882) | 2 (2) | 27632012ix57n.js (105) | 1407 |
| `/blog/trending/photography` | Post image | 310 | 28 | 76 | 1063 | 1477 | 12 / 531 | 27632012ix57n.js (1198) | 2 (2) | 27632012ix57n.js (105) | 1545 |
| `/blog/hot/photography` | Post image | 1035 | 27 | 66 | 129 | 1257 | 14 / 675 | 27632012ix57n.js (1817) | 2 (2) | 27632012ix57n.js (105) | 1501 |
| `/blog/created/photography` | Post image | 360 | 22 | 73 | 1072 | 1528 | 11 / 588 | 27632012ix57n.js (1051) | 2 (2) | 27632012ix57n.js (105) | 1499 |
| `/blog/payout/photography` | Post image | 284 | 27 | 72 | 1058 | 1440 | 12 / 602 | 27632012ix57n.js (1087) | 2 (2) | 27632012ix57n.js (105) | 1389 |
| `/blog/muted/photography` | Hive Blog | 327 | — | — | 131 | 458 | 8 / 297 | 27632012ix57n.js (786) | 2 (2) | 27632012ix57n.js (105) | 218 |
| `/blog/trending/hive-160391` | Post image | 320 | 23 | 102 | 79 | 524 | 11 / 295 | 27632012ix57n.js (1065) | 4 (4) | 27632012ix57n.js (105) | 477 |
| `/blog/hot/hive-160391` | Post image | 432 | 23 | 251 | 23 | 730 | 8 / 278 | 27632012ix57n.js (816) | 5 (5) | 27632012ix57n.js (105) | 347 |
| `/blog/created/hive-160391` | Post image | 1785 | 23 | 91 | 105 | 2003 | 12 / 800 | 27632012ix57n.js (1967) | 4 (4) | 27632012ix57n.js (105) | 1556 |
| `/blog/payout/hive-160391` | Post image | 297 | 36 | 105 | 26 | 464 | 13 / 488 | 27632012ix57n.js (1794) | 5 (5) | 27632012ix57n.js (105) | 347 |
| `/blog/muted/hive-160391` | Magic the Forkening, BlockCraft, H | 282 | — | — | 1127 | 1410 | 8 / 216 | 27632012ix57n.js (849) | 4 (4) | 27632012ix57n.js (105) | 280 |
| `/blog/roles/hive-160391` | Magic the Forkening, BlockCraft, H | 518 | — | — | 1003 | 1520 | 10 / 285 | 27632012ix57n.js (1213) | 5 (5) | 27632012ix57n.js (105) | 391 |
| `/blog/communities` | The Future of Web3 Gaming. Battle  | 339 | — | — | 1171 | 1510 | 6 / 674 | 27632012ix57n.js (1171) | 2 (2) | 27632012ix57n.js (105) | 2187 |
| `/blog/search` | Hive Blog | 139 | — | — | 152 | 292 | 7 / 372 | 27632012ix57n.js (695) | 2 (2) | 27632012ix57n.js (105) | 163 |
| `/blog/welcome` | You are entirely responsible for s | 140 | — | — | 117 | 257 | 8 / 334 | 27632012ix57n.js (508) | 2 (2) | 27632012ix57n.js (105) | 206 |
| `/blog/faq.html` | Does it cost anything to post, com | 155 | — | — | 1152 | 1308 | 7 / 234 | 27632012ix57n.js (767) | 2 (2) | 27632012ix57n.js (105) | 1385 |
| `/blog/tos.html` | This agreement (the “Agreement”) b | 138 | — | — | 1151 | 1289 | 6 / 271 | 27632012ix57n.js (786) | 2 (2) | 27632012ix57n.js (105) | 281 |
| `/blog/privacy.html` | By using the Services, you accept  | 168 | — | — | 122 | 290 | 6 / 362 | 27632012ix57n.js (542) | 2 (2) | 27632012ix57n.js (105) | 527 |
| `/blog/submit.html` | Log in to make a post. | 155 | — | — | 143 | 299 | 9 / 307 | 27632012ix57n.js (706) | 2 (2) | 27632012ix57n.js (105) | 156 |
| `/blog/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit` | center > div.videoWrapper > div.yo | 595 | 19 | 77 | 1416 | 2107 | 13 / 1003 | 27632012ix57n.js (2208) | 3 (3) | 27632012ix57n.js (105) | 3405 |
| `/blog/hive-163772/@ibarra95/visiting-the-desparramaderos-waterfall-nature` | E83E50CD-E3FE-4F53-B89F-A787A77B50 | 670 | 60 | 188 | 275 | 1192 | 20 / 990 | 27632012ix57n.js (2844) | 3 (3) | 27632012ix57n.js (105) | 2037 |
| `/blog/communityfork/@hiveio/announcing-the-launch-of-hive-blockchain` | The buzz is real! After weeks of h | 3425 | — | — | 497 | 3922 | 20 / 1476 | 27632012ix57n.js (3235) | 4 (4) | 27632012ix57n.js (105) | 52414 |
| `/blog/@gtg` | Post image | 2409 | 3416 | 82 | 381 | 6287 | 17 / 899 | 27632012ix57n.js (1838) | 2 (2) | 27632012ix57n.js (105) | 1559 |
| `/blog/@gtg/posts` | — | 420 | 489 | 90 | 81 | 1081 | 13 / 920 | 27632012ix57n.js (1827) | 2 (2) | 27632012ix57n.js (105) | 1570 |
| `/blog/@gtg/comments` | — | 409 | — | — | 518 | 927 | 12 / 654 | 27632012ix57n.js (1367) | 2 (2) | 27632012ix57n.js (105) | 1323 |
| `/blog/@gtg/replies` | Post image | 457 | 1160 | 31 | 337 | 1984 | 15 / 779 | 27632012ix57n.js (1915) | 2 (2) | 27632012ix57n.js (105) | 1345 |
| `/blog/@gtg/payout` | Post image | 402 | 44 | 85 | 1068 | 1598 | 7 / 229 | 27632012ix57n.js (579) | 2 (2) | 27632012ix57n.js (105) | 439 |
| `/blog/@gtg/feed` | Post image | 520 | 22 | 82 | 174 | 799 | 14 / 596 | 27632012ix57n.js (1560) | 2 (2) | 27632012ix57n.js (105) | 1562 |
| `/blog/@gtg/communities` | The author has subscribed to the f | 396 | — | — | 188 | 583 | 11 / 416 | 27632012ix57n.js (762) | 2 (2) | 27632012ix57n.js (105) | 282 |
| `/blog/@gtg/followed` | Gandalf the Grey | 383 | — | — | 203 | 586 | 9 / 357 | 27632012ix57n.js (923) | 3 (3) | 27632012ix57n.js (105) | 362 |
| `/blog/@gtg/followers` | Gandalf the Grey | 395 | — | — | 139 | 533 | 10 / 292 | 27632012ix57n.js (838) | 3 (3) | 27632012ix57n.js (105) | 364 |
| `/blog/@gtg/notifications` | @emrebeyler mentioned you and 13 o | 420 | — | — | 193 | 613 | 15 / 751 | 27632012ix57n.js (2724) | 4 (4) | 27632012ix57n.js (105) | 1111 |
| `/blog/@gtg/settings` | Gandalf the Grey | 390 | — | — | 192 | 583 | 10 / 330 | 27632012ix57n.js (957) | 2 (2) | 27632012ix57n.js (105) | 252 |
| `/blog/@gtg/lists/blacklisted` | Accounts Blacklisted By gtg | 422 | — | — | 185 | 607 | 10 / 373 | 27632012ix57n.js (1156) | 2 (2) | 27632012ix57n.js (105) | 269 |
| `/blog/@gtg/lists/muted` | Gandalf the Grey | 403 | — | — | 127 | 530 | 7 / 296 | 27632012ix57n.js (556) | 2 (2) | 27632012ix57n.js (105) | 269 |
| `/blog/@gtg/lists/followed_blacklists` | Gandalf the Grey | 652 | — | — | 145 | 797 | 10 / 357 | 27632012ix57n.js (744) | 2 (2) | 27632012ix57n.js (105) | 269 |
| `/blog/@gtg/lists/followed_muted_lists` | Gandalf the Grey | 396 | — | — | 175 | 570 | 11 / 262 | 27632012ix57n.js (1168) | 2 (2) | 27632012ix57n.js (105) | 269 |
| `/blog/trending/my` | Hive Blog | 230 | — | — | 152 | 382 | 12 / 252 | 27632012ix57n.js (1033) | 2 (2) | 27632012ix57n.js (105) | 377 |
| `/wallet` | Welcome to Hive's official Hive bl | 127 | — | — | 133 | 259 | 4 / 191 | 207q91mt6s7qv.js (486) | 0 (0) | 24us69h_1ng-0.js (99) | 147 |
| `/wallet/market` | 24h volume | 142 | — | — | 2651 | 2793 | 9 / 361 | 207q91mt6s7qv.js (1240) | 4 (4) | 24us69h_1ng-0.js (99) | 438 |
| `/wallet/proposals` | Hive Keychain Development Proposal | 147 | — | — | 1353 | 1500 | 8 / 371 | 207q91mt6s7qv.js (1208) | 3 (3) | 24us69h_1ng-0.js (99) | 530 |
| `/wallet/~witnesses` | Notes: in the list below, the firs | 149 | — | — | 120 | 269 | 18 / 2057 | 207q91mt6s7qv.js (3383) | 4 (4) | 24us69h_1ng-0.js (99) | 4402 |
| `/wallet/@gtg/transfers` | Influence tokens which give you mo | 293 | — | — | 1703 | 1996 | 20 / 4180 | 207q91mt6s7qv.js (6526) | 12 (12) | 24us69h_1ng-0.js (99) | 321 |
| `/wallet/@gtg/delegations` | Resource Credits | 304 | — | — | 1330 | 1635 | 11 / 305 | 207q91mt6s7qv.js (948) | 4 (4) | 24us69h_1ng-0.js (99) | 191 |
| `/wallet/@gtg/author-rewards` | re-brianoflondon-1784989470897 | 298 | — | — | 2018 | 2316 | 8 / 514 | 207q91mt6s7qv.js (1234) | 4 (4) | 24us69h_1ng-0.js (99) | 766 |
| `/wallet/@gtg/curation-rewards` | Potential Curation Reward for: re- | 268 | — | — | 2255 | 2523 | 9 / 431 | 207q91mt6s7qv.js (1212) | 4 (4) | 24us69h_1ng-0.js (99) | 563 |
| `/wallet/@gtg/communities` | IT Wizard, Hive Witness | 309 | — | — | 146 | 455 | 7 / 248 | 207q91mt6s7qv.js (932) | 1 (1) | 24us69h_1ng-0.js (99) | 150 |
| `/wallet/@gtg/authorities` | IT Wizard, Hive Witness | 273 | — | — | 130 | 403 | 9 / 320 | 207q91mt6s7qv.js (969) | 2 (2) | 24us69h_1ng-0.js (99) | 196 |
| `/wallet/@gtg/permissions` | Any password or key is more likely | 292 | — | — | 143 | 435 | 5 / 240 | 207q91mt6s7qv.js (652) | 0 (0) | 24us69h_1ng-0.js (99) | 217 |
| `/wallet/@gtg/password` | Change Password | 281 | — | — | 128 | 409 | 5 / 248 | 207q91mt6s7qv.js (596) | 0 (0) | 24us69h_1ng-0.js (99) | 168 |

How to read the script names. Chunk hashes are specific to build `0f365af4`.

- **`27632012ix57n.js` (blog) and `207q91mt6s7qv.js` (wallet)** hold React DOM, the Next.js client
  runtime and part of the Sentry SDK. Hydration and every component render are attributed to them,
  so "long task in the React chunk" means "rendering", not "this file is too big".
- **Rows named after the page URL** are inline scripts in the HTML, which is mostly the RSC payload
  being evaluated.
- **`Unattributable`** is native work such as style, layout and HTML parsing.

## Problems shared across many routes

These come from the root layouts, shared packages or shared components. Fixing one improves dozens
of routes at once.

| Shared cost | Routes | Evidence | Problem |
|---|---|---|---|
| All UI languages are downloaded and parsed on every load | every blog route (9 languages) and every wallet route (10) | 9 extra script chunks of 10–12 KB each, requested about 925 ms into the load, ~98 KB transferred and ~265 KB raw. i18next module self-time (`207umzrdm6ors.js#953984`) is 180–580 ms of 4× CPU per load (343 ms on `/communities`, 577 ms on the 981-reply post). Source: `preload: languages` in `apps/blog/i18n/client.ts:66` and `apps/wallet/i18n/client.ts:67`. | [P4](#p4) |
| Card summaries rendered from full markdown on the client | all blog feeds, `[tag]`, community feeds, profile `posts`, `comments`, `replies`, `payout`, `feed` | `features/list-of-posts/summary.tsx:52` ('use client') calls `getPostSummary(post.json_metadata, post.body)`, which runs Remarkable (`lib/remmarkable-stripper.ts`) over each full body (`lib/utils.ts:58-95`). Remarkable/linkify (`3ttmw1-t9l7of.js`, 80 KB transferred, 220 KB raw) is in the initial JS of every feed. The feed RSC carries all 20 full bodies as `T` text rows, plus 100 full community objects (37 KB) for the sidebar. | [P3](#p3), with #928 |
| `TimeAgo` costs a lot per instance | every feed, post, comment list, profile tab and wallet history or witness list | Module `#376655` is `packages/ui/components/time-ago.tsx`, and it is the top app module on most pages: 110–160 ms of 4× CPU on feeds and posts, 205 ms on wallet `~witnesses`, 356 ms on the 981-reply post. Each instance builds an `Intl.RelativeTimeFormat` and calls `toLocaleString("en-US",{timeZone:"UTC"})` on every update, parses the cookie, starts its own `setInterval` (line 63), and flips its `key` from `server` to `client` after mount (line 72). That flip remounts every timestamp right after hydration. | [P9](#p9) |
| Turbopack module instantiation | every route | The Turbopack runtime chunk spends 360–500 ms of 4× CPU evaluating module factories on the blog, and about 290–450 ms on a cold wallet load. This grows with the number of modules in the initial graph, so every module P3, P4, P10 and P13 remove also cuts it. | (follows from P3, P4, P10, P13) |
| Sentry SDK in the initial JS with no DSN | every blog and wallet route | About 137 KB raw (~47 KB transferred) of Sentry modules in `27632012ix57n.js` and `184rwuukn4gns.js`. `instrumentation-client.ts` imports `@sentry/nextjs` statically and only checks `env('SENTRY_DSN')` at runtime. The integration site's `__ENV.js` has no `SENTRY_DSN`, so the code is downloaded and evaluated but never used. | [P13](#p13) |
| Radix UI bundle | every route | `24us69h_1ng-0.js` (wallet, 99 KB transferred, 305 KB raw) and `1bh7cj4ta-m1y.js` + `2qg6prye5ihu3.js` (blog, ~60 KB transferred) carry Radix primitives into every page, including wallet `/`, which uses almost none of them. This is the largest wallet chunk. | (smaller finding; part of P10) |
| HiveSense availability probe after idle | every blog route | Two requests after idle: `GET /hivesense-api/` (6.4 KB) and `GET /hivesense-api/posts/search?q=hive…` (`site-header/main-bar.tsx:51-57`). Idle-gated, so no effect on LCP or TBT. It is still 2 of the 2 API calls every logged-out blog page makes. | smaller finding |
| No eager WASM, wax, beekeeper or fonts on the blog | — | No logged-out blog route requests `.wasm`. The blog's 12 KB `2t7okc6itp3uw.js` is the wasm-free read client (DR-0002). Exception: `[tag]` and community routes load the full wax JS foundation (`0-7iuo2j437hf.js`, 67 KB) and zod (`01mc8h006t38g.js`, 16 KB), see [P10](#p10). No web fonts are loaded (Tailwind names local-only Source Sans/Serif Pro). | — |

## Top problems ranked by user impact

Ranked by traffic weight × severity. Traffic weight: posts 5, feeds 5, profiles 4, wallet
transfers 3 (every `/wallet/@acct` redirects there), other wallet pages 2, static pages 1.
Severity is how much of a mid-range phone's load the problem costs (1–5). Problems already being
worked on (#928, #1037, #1038) are referenced, not repeated.

| # | Problem | Routes | Weight × severity | Main evidence |
|---|---|---|---|---|
| <a id="p1"></a>P1 | Posts with many replies render every comment at once | popular posts, which are the most-visited posts | 5 × 5 | 981-reply post: 7.7 MB HTML (444 KB transferred), 955 comments, 52k DOM nodes, TTFB 3.4–5.7 s, mobile TBT 6.9 s, desktop perf 60 |
| <a id="p2"></a>P2 | The post page's LCP waits for hydration (video facade thumbnail; body rendered again on the client) | every post that opens with a YouTube or 3Speak embed; all posts pay the client re-render | 5 × 4 | render delay 1,416 of 2,107 ms observed (67%); real 4× profile LCP 4.7 s, against 2.2 s for an image-led post |
| <a id="p3"></a>P3 | Feed and profile cards build summaries from full bodies on the client | all feeds, `[tag]` and community feeds, five profile tabs | 5 × 3 | 80 KB of Remarkable in the initial JS; 120–290 KB of inline RSC per feed page, mostly full bodies |
| <a id="p4"></a>P4 | All UI languages loaded on every page | every route of both apps | 5 × 3 | 9 locale chunks (~98 KB); i18next 180–580 ms of 4× CPU |
| <a id="p5"></a>P5 | Wallet transfers renders 500 history rows in one commit | `/wallet/@acct/transfers` (the wallet's account landing page) | 3 × 5 | one 4.2–4.5 s long task; TBT 6.5 s with the history and 1.8 s without |
| <a id="p6"></a>P6 | Wallet pages show nothing until wax WASM has loaded | market, proposals, `~witnesses`, transfers, delegations, author-rewards, curation-rewards, authorities | 3 × 5 | mobile LCP 10.2–11.4 s on WASM-gated pages, 1.1–1.3 s on the others; 948 KB `wax.common.wasm` |
| <a id="p7"></a>P7 | Community pages shift the feed column after load | `/[sort]/hive-*` and `/roles/hive-*` | 4 × 3 | mobile CLS 0.158–0.172; culprit `div.col-span-12 … lg:col-span-8` (the feed column) |
| <a id="p8"></a>P8 | Profile SSR waits on uncached API reads | `/@acct` and every profile tab | 4 × 3 | TTFB 0.25–3.8 s on repeated loads of `/@gtg` and `/@gtg/posts`; `/@gtg` median TTFB 2.3 s against 0.3–0.5 s on the tabs |
| <a id="p9"></a>P9 | `TimeAgo` is expensive per instance and remounts after hydration | every list with timestamps, in both apps | 5 × 2 | module `#376655` costs 110–356 ms of 4× CPU per page; a `setInterval` and a remount per instance |
| <a id="p10"></a>P10 | `[tag]` and community routes ship the wax foundation, zod and the full renderer | the 11 `[tag]` and community routes | 4 × 2 | +158 KB JS over the parent feed (859 vs 701 KB): `0-7iuo2j437hf.js` wax 67 KB, `3xzjubxw9mk0w.js` renderer + sanitizer 60 KB, zod 16 KB, community description 20 KB |
| <a id="p11"></a>P11 | The wallet witness list shifts the layout and blocks the main thread | `/wallet/~witnesses` | 2 × 4 | CLS 0.719 mobile and 0.734 desktop; TBT 1.8 s with a 2.06 s longest task; 4.4k DOM nodes |
| <a id="p12"></a>P12 | The wallet favicon redirects to the blog feed | every wallet route | 2 × 2 (cheap fix) | `<link rel="icon" href="/favicon.ico">` → `302 /blog` → 93 KB feed HTML and a server-side feed render per wallet page view |
| <a id="p13"></a>P13 | The Sentry SDK ships and evaluates with no DSN | every route | 5 × 1 | ~137 KB raw (~47 KB transferred) of Sentry modules in the initial JS |

### P1. Posts with many replies render every comment at once

- **Trace.** On `/blog/communityfork/@hiveio/announcing-the-launch-of-hive-blockchain`:
  - TTFB is 3.4 s (mobile) and 5.7 s (desktop); a cold curl took 3.8 s.
  - Mobile TBT is 6.9 s, with 20 long tasks and the longest at 1.48 s. Desktop TBT is 1.0 s and desktop perf 60.
  - Simulated main-thread script evaluation is 35.6 s and style/layout 6.6 s.
  - In the real 4× profile: 12.6 s of CPU, 7.7 s of it native (`(program)`: parse, style, layout) and 523 ms in `querySelectorAll`.
- **Payload.** The HTML is 7.7 MB decompressed and 444 KB transferred. It has 955 `comment-list-item`
  nodes and about 105k elements, including 2.8 MB of `class` attributes and 930 KB of inline SVG
  icons (2,882 `<svg>`). The inline RSC is 1.36 MB, the whole discussion. Client navigation to the
  post fetches a 1.23 MB RSC payload.
- **Responsible code.**
  - `app/[param]/[p2]/[permlink]/page.tsx:141` fetches the whole thread with `bridge.get_discussion`.
  - `content.tsx:252-357` (`paginatedDiscussionState`) is meant to cap a page at
    `MAX_COMMENTS_PER_PAGE = 50`, but on this post all 955 comments render. The HTML has no
    pagination controls, and every item has the depth-1 class.
  - Each comment's `RendererContainer` effect runs **document-wide** `querySelectorAll('sub')`,
    `.threeSpeakWrapper` and `.videoWrapper` (`rendererContainer.tsx:150-156`). That is 955 instances
    each scanning a 52k-node document.
- **Why it ranks first.** Posts with many replies are the most popular posts, so they get the most
  readers, and every metric fails badly on them.

### P2. The post page's LCP waits for hydration

- **Trace.** On `@gtg/hive-hardfork-25-jump-starter-kit` (median mobile run), the LCP element is
  `center > div.videoWrapper > div.yo…`, the YouTube facade `<img>`:
  - TTFB 595 ms, load delay 19 ms, load duration 77 ms, **render delay 1,416 ms**, observed LCP 2,107 ms.
  - Desktop render delay is 1,797 ms of 2,374 ms.
  - With real 4× throttling the LCP is 4.7 s, against 2.2 s for the image-led `@ibarra95` post.
  - Simulated mobile LCP is 7.1 s and TBT 1.9 s.
- **Responsible code.**
  - The facade thumbnail is created in a `useEffect` (`features/post-rendering/rendererContainer.tsx:128-147`,
    `document.createElement('img')`), so it doesn't exist in the server HTML. The server HTML's first
    body image is `star_fork.png` further down. #1038 added the preload and `fetchpriority=high`
    (`FirstBodyImagePreload`), and the image is downloaded by about 0.7 s, but nothing can paint it
    before hydration finishes.
  - The body is rendered with `DefaultRenderer` in a `useMemo` of a client component
    (`rendererContainer.tsx:38-50`). It runs once in SSR and again during hydration, and it ships
    the renderer (`3xzjubxw9mk0w.js`, 60 KB) to the client. The same happens for every comment.
- **Routes.** Every post or comment page. The render delay applies to posts that start with an embed;
  the client re-render applies to all posts.

### P3. Feed and profile cards build summaries from full bodies on the client

- **Evidence.**
  - `summary.tsx:52` calls `getPostSummary(post.json_metadata, post.body)` on the client for each
    card. `extractBodySummary` (`lib/utils.ts:58`) runs Remarkable over the full body and then strips
    it.
  - To make that possible, the RSC payload carries every post's full body as `T` text rows. On
    `/trending` the inline RSC is 224 KB of a 367 KB document; client navigation fetches 203 KB.
  - Remarkable/linkify (`3ttmw1-t9l7of.js`, 80 KB transferred, 220 KB raw) loads on every feed and
    profile route.
  - Inline RSC per route: trending/hot/created/payout 217–224 KB, `/trending/photography` 290 KB,
    `/@gtg` 173 KB, `/@gtg/posts` 185 KB, `/@gtg/feed` 201 KB.
  - The sidebar adds 100 full community objects (37 KB) to every feed.
- **Relation to #928.** #928 is about the trending payload (414 KB decoded). This is its root cause,
  and it applies to every feed and profile list, not only trending. Moving the summary to the server
  lets the payload drop the bodies **and** takes Remarkable out of the client bundle. If #928's fix
  already does this, close the follow-up as covered by #928, after checking that it also covers
  `[tag]`, community and profile lists.

### P4. All UI languages loaded on every page

- **Evidence.** `apps/blog/i18n/client.ts:66` and `apps/wallet/i18n/client.ts:67` pass
  `preload: languages`, so i18next imports the namespace JSON of all 9 (blog) or 10 (wallet)
  languages. On `/blog/trending` that is 9 chunks (`1b7-kcdfmmeu1.js`, `1age201l_vubr.js`, …) of
  10–12 KB each, ~98 KB transferred and ~265 KB raw, requested about 925 ms into the load.
  - i18next's module (`207umzrdm6ors.js#953984`) costs 180–580 ms of 4× CPU per load, the third
    largest single cost after React and the Turbopack runtime.
  - The wallet equivalent is `3-c2cymm6-f2i.js#970638` at 70–135 ms.
- **Routes.** All of them. The language actually used is known from the cookie or `<html lang>`
  before i18next initialises (`getInitialLanguage()`).

### P5. Wallet transfers renders 500 history rows in one commit

See [Lead 1](#lead-1-wallet-transfers-tbt-346--335-s-after-1037) for the full trace.

- `app/[param]/transfers/transfers-page.tsx:50` requests `getAccountOperations(username, undefined, 500, …)`.
- `history-table.tsx:51-72` renders every filtered row with no windowing or paging.
- The formatter class is rebuilt on every render (`history-table.tsx:40-41`) and the filter runs on
  every render (`account-history.tsx:40`).
- Each row has a `TimeAgo` (P9) and a wax `formatter.format` call.

### P6. Wallet pages show nothing until wax WASM has loaded

- **Evidence.**
  - The wallet reads through `getChain()` in about 18 functions of `apps/wallet/lib/hive.ts`, for
    example `getWitnessesByVote` (line 95) and `getAccountOperations` (line 190).
  - `transfers-page.tsx:29,81,92` shows the whole page's spinner until `hiveChainService.reuseHiveChain()`
    returns a chain, for anonymous visitors too.
  - Every WASM-gated page downloads `wax.common.wasm` (948 KB) after load and paints its LCP text only
    after that. That gives render delays of 1.3–2.7 s observed and **mobile LCP of 10.2–11.4 s**:
    market 10.5, proposals 10.2, transfers 11.4, delegations 11.0, author-rewards 10.6,
    curation-rewards 10.6.
  - Wallet routes whose LCP doesn't wait for WASM are at 1.1–1.3 s: `/`, communities, authorities,
    permissions, password.
  - Desktop shows the same split: 2.1–2.3 s against 0.3–0.5 s.
- **Relation to the existing decision.** DR-0002 (`docs/decisions/0002-serve-hive-api-reads-through-a-wasm-free-client.md`)
  moved blog reads to the wasm-free `getReadChain()` and states that "the wallet app still reads
  through wax and is not covered by this decision". Applying it to the wallet's reads is the fix;
  vests→HP and asset formatting have pure-TS equivalents (`ui/lib/asset-math.ts`).

### P7. Community pages shift the feed column after load

- **Evidence.** On `/blog/trending/hive-160391`, `cls-culprits-insight` blames the feed column
  `div.container > div.grid > div.col-span-12 > div.col-span-12` (`col-span-12 mb-5 flex flex-col
  md:col-span-10 lg:col-span-8`) for 0.170 of 0.172.
  - Every community route shifts the same way: trending 0.172, hot 0.158, created 0.172, payout
    0.158, roles 0.169. `muted` is 0.044.
  - Desktop is 0.002.
  - So on mobile, something rendered above the list after load changes height. These pages also make
    two client calls after load that the plain feeds don't, `bridge.list_subscribers` and
    `bridge.account_notifications` (community sidebar and activity).
  - `hot` and `payout` community pages also refetch `bridge.get_ranked_posts` after load.

### P8. Profile SSR waits on uncached API reads

- **Evidence.** The profile layout (`app/[param]/(user-profile)/layout.tsx:87-120`) awaits
  `getAccountFullCached` (React `cache()`, request-scoped only), then reputation and dynamic global
  properties (and Twitter info when third-party APIs are on). It does this on every request with no
  cross-request cache.
  - Four repeated curls gave a TTFB of 0.26–1.55 s on `/@gtg` and 0.24–3.81 s on `/@gtg/posts`.
  - In the Lighthouse runs, `/@gtg` had a median TTFB of 2.3 s; its median mobile run had TTFB 2.4 s
    and LCP load delay 3.4 s.
  - Feeds don't vary like this, because they use the process cache from #1017
    (`apps/blog/lib/feed-cache.ts`, `createFeedCache`).

### P9. `TimeAgo` is expensive per instance and remounts after hydration

- **Evidence.** See the shared-cost table. The minified module is short enough to read whole.
  - Per instance it creates a `Date` from `new Date().toLocaleString("en-US",{timeZone:"UTC"})`
    (which creates a formatter each time), creates an `Intl.RelativeTimeFormat`, reads the cookie, and
    formats a `toLocaleString(lang)` title.
  - It starts its own `setInterval`.
  - It sets state in a mount effect only to flip `key` from `server` to `client`, which unmounts and
    remounts the `<span>` right after hydration.
  - A feed has about 20 instances; a 50-comment post page about 50; the wallet history up to 500; the
    witness list about 250.

### P10. `[tag]` and community routes ship the wax foundation, zod and the full renderer

- **Evidence.** Comparing the scripts of `/blog/trending/photography` with `/blog/trending` gives
  +174 KB transferred:
  - `0-7iuo2j437hf.js` (67 KB, `createWaxFoundation` / `createHiveChain`, the wax JS foundation)
  - `3xzjubxw9mk0w.js` (60 KB, renderer + sanitizer + embeds)
  - `3_r5c4dzvzov9.js` (20 KB, community description)
  - `01mc8h006t38g.js` (16 KB, zod)
- These load on all 11 `[tag]` and community routes, even on a plain tag (`photography`) that has
  no community description.
- The `[tag]` layouts import `features/layouts/community/prefetch-component.tsx` → `community-layout.tsx`
  → `community-description.tsx` (which statically imports `RendererContainer` and
  `@hive/common-hiveio-packages/wax`).
- The existing `initialChunks*` fixture specs, which check that wax stays out of the first JS, don't
  cover a `[tag]` route. That is how this regression of #1023's goal went unnoticed.
- Which import pulls in the wax foundation needs confirming with a bundle trace; the chunk evidence
  above is conclusive about the effect.

### P11. The wallet witness list shifts the layout and blocks the main thread

- **Evidence.** `layout-shifts` blames `tbody[data-testid=witness-table-body]` for 0.719 (mobile)
  and 0.734 (desktop) in 2 of 3 runs on each form factor.
  - The table body starts as a one-row "Loading…" placeholder (`~witnesses/witnesses-page.tsx:213-221`).
  - It is replaced by 250 rows after WASM, `list_witnesses` (through `getChain()`, `lib/hive.ts:95`)
    and `find_accounts` for all 250 owners. The auto-layout table then reflows.
  - Mobile TBT is 1.8 s with a 2.06 s longest task (rendering 250 rows, each with `TimeAgo`), and
    the page has 4.4k DOM nodes.
  - The data is public and the same for every visitor.

### P12. The wallet favicon redirects to the blog feed

- **Evidence.** `apps/wallet/app/layout.tsx:27` declares `icon: '/favicon.ico'` without the
  `/wallet` base path.
  - `/favicon.ico` answers `302 → /blog`, so every wallet page view downloads the blog's trending
    HTML (92–93 KB transferred, visible as `GET /blog` in every wallet profile).
  - It also makes the blog server render a feed.
  - The blog already uses `${basePath}/favicon.ico` (`apps/blog/app/layout.tsx:30`); the
    wallet was missed. #1022 looked at the same class of bug (icon URLs missing the base path)
    on the blog only.

### P13. The Sentry SDK ships and evaluates with no DSN

- **Evidence.** `apps/{blog,wallet}/instrumentation-client.ts` statically imports `init` and
  `captureRouterTransitionStart` from `@sentry/nextjs` and checks `env('SENTRY_DSN')` only at
  runtime. On the integration site `__ENV.js` has no `SENTRY_DSN`, yet about 137 KB raw (~47 KB
  transferred) of Sentry modules are in the initial chunks (`27632012ix57n.js`, `184rwuukn4gns.js`).
  That is a heuristic split of the chunks into Turbopack modules.
- **Note.** Replay is already deferred correctly (`lib/sentry-replay.ts`, loaded after idle).

## The two leads from the issue

### Lead 1: wallet transfers TBT 3.46 → 3.35 s after #1037

TBT on this page is almost all rendering. One React commit of the operation history dominates; the
download size matters little. Evidence from the three mobile runs (desktop shows the same pattern):

| Run | History request (`hivemind-api/accounts/gtg/operations?page-size=500…`) | TBT | Longest task |
|---|---|---|---|
| mobile 1 | failed: no response within the ~5 s wax timeout | 1,787 ms | 398 ms |
| mobile 2 | 200, 43 KB transferred / 259 KB decoded, arrived at 6.8 s | 6,469 ms | **4,180 ms** |
| mobile 3 | 200, 43 KB / 259 KB, arrived at 2.4 s | 6,492 ms | **4,516 ms** |
| desktop 1 | failed (timeout) | 216 ms | 140 ms |
| desktop 2 | 200, arrived at 6.0 s | 1,081 ms | 952 ms |
| desktop 3 | 200, arrived at 2.4 s | 720 ms | 709 ms |

- **What the long task is.** In every run that received the history, the long task is in the React
  chunk (`207q91mt6s7qv.js`, 6.5 s of long tasks in total). It is one synchronous render of
  `AccountHistory` → `HistoryTable`. Per row there is a wax `formatter.format` with the vests
  conversion (`wallet-operations-formatter.tsx`), a `TimeAgo` with its interval and post-mount
  remount (P9), and a memo cell. The formatter class is rebuilt on every render, and the filter
  re-runs on every render.
- **Why the automated median moved so little.** It sits at 3.35 s because it takes the median of
  runs where the history did and didn't arrive inside the TBT window. The history endpoint answered
  in 0.15–0.8 s to curl, but in the Lighthouse runs it took 0.6–5 s or timed out.
- **What else is on the main thread.**
  - React long tasks outside the history total about 1.6 s simulated (the run without
    history).
  - The page's inline scripts take 0.45 s.
  - Recharts takes 0.2 s: `1r82z6ea86wq7.js#94174`, 96 KB transferred, the RC ring chart, rendered
    for anonymous visitors.
  - The wax JS bindings take 0.12 s (`18g9eect_x4_-.js`).
- **Why #1037 didn't move it.** #1037 removed 163 KB of download, but none of this main-thread work.
- **LCP of 11.4 s.** The LCP element is the Hive Power description text. It only renders after the
  `reuseHiveChain()` gate, so the 948 KB WASM, plus `find_accounts`, DGP and feed history, sit on the
  LCP path (P6). Observed render delay is 1.7 s.
- **Duplicate requests.** The page also fires `database_api.find_accounts` and
  `get_dynamic_global_properties` twice each: the profile layout and the page ask for the same data
  under different query keys (`['profileData']` vs `['accountData']`).

### Lead 2: post page LCP unchanged at 8.3 s after #1038

Breakdown of the median mobile run of `@gtg/hive-hardfork-25-jump-starter-kit`:

| Sub-part | ms (observed) | Share |
|---|---|---|
| TTFB | 595 | 28% |
| Resource load delay | 19 | 1% |
| Resource load duration | 77 | 4% |
| **Element render delay** | **1,416** | **67%** |
| Observed LCP | 2,107 | |

- **What dominates.** Render delay dominates because the LCP element, the YouTube facade thumbnail
  (`img.youtube.com/vi/mrwgrOhl7Yw/hqdefault.jpg` through the image proxy, `width=1536`), is created
  by `RendererContainer`'s effect after hydration (P2). #1038's preload makes the download fast,
  which is why load delay and load duration are tiny, but the paint still waits for hydration.
- **The simulated LCP.** Because the LCP comes after hydration, Lantern counts all 857 KB of script
  and its 4× CPU before LCP: 7.1 s in this sweep, 8.3 s in the automated check.
- **The comparison post.** The image-led `@ibarra95` post has a render delay of only 275 ms; its LCP
  image is in the server HTML with `srcset`. It still simulates to 6.4 s, because its observed LCP
  (1.19 s) falls just after the script downloads start (see
  [How mobile LCP behaves](#how-mobile-lcp-behaves-on-these-pages)).
- **The width.** The 1536 px thumbnail (`width=1536`, `format=match`, no `srcset`) is about twice
  what a 412 px viewport at DPR 1.75 needs.

## Logged-in-only pages

`/trending/my` (and the other `/[sort]/my`), `/@acct/feed`, `/@acct/settings` and
`/@acct/notifications` were measured logged out (see the tables). Logged out, `/my` is a short
prompt page (perf 80, LCP 1.3 s). `feed` renders the account's public feed, and `settings` and
`notifications` render their logged-out view (perf 69–82).

`notifications` is the heaviest logged-out tab, with mobile TBT 2.3 s: it renders 1.1k nodes of
notification rows client-side after `find_accounts` and `bridge.account_notifications`.

A logged-in session adds the following on every page (from code; not measured, because the
measurement can't log in):

- **Blog:**
  - `LoggedUserProvider` (`features/votes/hooks/use-logged-user.tsx:40-51`) fetches `getAccountFull`,
    and fetches `getManabar` every 60 s. `getManabar` calls `getManabars`, which calls `getChain()`
    (`packages/transaction/lib/hive-api.ts:41-43`). So **a logged-in user downloads and compiles the
    948 KB wax WASM at mount on every page**, which undoes the idle deferral of `ChainWarmup`.
  - `SignerProvider` dynamically imports the signer and `@transaction/index`.
  - `MainBar` fetches unread notifications.
  - Post pages add one `list_votes` call for every post or comment the user has voted on
    (`features/votes/votes-component.tsx:74-81`, an N+1 pattern).
  - Profiles add two `useFollowingInfiniteQuery(user, 1000)` calls with `StaleTime.NONE`.
- **Wallet:**
  - `SiteHeader` runs `findRcAccounts` (through `getChain()`, so WASM) and `getAccount` on mount.

## Smaller findings

These are not ranked above, but are worth folding into nearby work:

- **Root layout.** It reads `cookies()` (`apps/blog/app/layout.tsx`), so no blog route can be
  statically rendered. Static pages (`faq`, `tos`, `privacy`) still have TTFB of 50–65 ms, so it
  costs little today.
- **Static pages.** They render markdown on the server (`features/static-pages/content-component.tsx`),
  but the RSC payload repeats the rendered HTML string (`faq.html`: 132 KB inline RSC next to 96 KB
  of markup). Their mobile LCP of 4.4–4.6 s (`faq`, `tos`) against 1.2 s (`privacy`) is the
  bimodal-LCP effect: the long text block paints after the startup scripts.
- **Wallet `/`.** It ships 465 KB of JS for a mostly static page (Radix bundle 99 KB, React chunk
  101 KB). It still scores 93/100.
- **Wallet market.** It renders recharts (96 KB) and waits for WASM, with a render delay of 2.65 s.
- **`/communities`.** It renders 100 communities at once (2.2k DOM nodes, 184 KB of markup), with
  mobile TBT 1.5 s and LCP 4.5 s.
- **`/blog/payout`.** Its LCP is a text paragraph ("The rewards for this comment are s…") with a
  2.2 s render delay. That is the same startup-script effect as the feed images.

## Ready-to-file follow-up issues

Each issue below can be filed as it is. They are in rank order. P1–P6 are the top problems; P7–P13
are smaller or cheaper.

---

**Issue P1. Post pages: render only one page of comments for threads with hundreds of replies**

- **Problem.** `/blog/communityfork/@hiveio/announcing-the-launch-of-hive-blockchain` (981 replies)
  server-renders all 955 comments in one response:
  - 7.7 MB HTML (444 KB transferred), 52k DOM nodes, 1.36 MB inline RSC;
  - TTFB 3.4–5.7 s, mobile TBT 6.9 s, desktop perf 60.
  - `paginatedDiscussionState` (`apps/blog/app/[param]/[p2]/[permlink]/content.tsx:252-357`) is
    supposed to cap a page at 50 comments, but this thread renders unpaginated.
  - Each comment's `RendererContainer` effect runs document-wide `querySelectorAll`
    (`rendererContainer.tsx:150-156`), which costs 523 ms of 4× CPU here.
- **Do.**
  1. Find why the 50-comment pagination doesn't apply to this thread. Likely suspects are the
     main-comment detection (`depth`, `parent_author` and `parent_permlink` against `postData`) and
     the page-splitting estimate.
  2. Fix it so the server HTML and hydration contain at most one page.
  3. Send only the current page's comments in the RSC/initial data. Fetch further pages on demand.
  4. Scope the `sub`, `.threeSpeakWrapper` and `.videoWrapper` queries in `RendererContainer` to
     `ref.current`.
- **Acceptance.**
  - The 981-reply post's HTML contains ≤ 50 `comment-list-item` nodes and pagination controls.
  - Its HTML is under 1 MB decompressed.
  - Its mobile Lighthouse median TBT is under 2 s.
  - A fixture spec with a recorded large discussion asserts the comment count and the pagination
    controls.

---

**Issue P2. Post page: put the leading video thumbnail in the server HTML and stop re-rendering the body on the client**

- **Problem.** On posts that open with a YouTube or 3Speak embed, the LCP element is the facade
  thumbnail.
  - `RendererContainer` creates it in a `useEffect` (`features/post-rendering/rendererContainer.tsx:128-147`),
    so it is painted only after hydration.
  - On `@gtg/hive-hardfork-25-jump-starter-kit`: render delay 1,416 of 2,107 ms observed LCP (67%),
    simulated mobile LCP 7.1–8.3 s, real-throttling LCP 4.7 s.
  - The body is also rendered by `DefaultRenderer` inside a client `useMemo` (`rendererContainer.tsx:38-50`),
    so the markdown is rendered again during hydration and the renderer (60 KB transferred) ships
    to every post page.
- **Do.**
  1. Emit the facade thumbnail `<img>` from the renderer, server-side. The first one gets
     `loading="eager"`, `fetchpriority="high"` and a `srcset`/`sizes` through the image proxy (as
     #1019 does for body images); later ones get `loading="lazy"`.
  2. Keep the effect only for click handling.
  3. Render the post body on the server and pass the HTML to the client (or make the body a server
     component), so hydration doesn't re-run the renderer.
- **Acceptance.**
  - The server HTML of the hardfork-25 post contains the facade `<img>` with `fetchpriority="high"`.
  - The median mobile LCP render delay on that route is under 400 ms.
  - The renderer chunk is not in that route's initial JS (`initialChunks` spec).
  - The fixture e2e for post rendering and facades still passes.

---

**Issue P3. Feeds and profiles: compute card summaries on the server and stop shipping full bodies and Remarkable to the client**

- **Problem.**
  - `features/list-of-posts/summary.tsx:52` (client) calls `getPostSummary(post.json_metadata, post.body)`,
    which renders each full markdown body with Remarkable (`lib/utils.ts:58-95`,
    `lib/remmarkable-stripper.ts`).
  - So every feed and profile list carries all full bodies in the RSC payload (217–290 KB inline RSC
    on feed pages, 173–201 KB on profile lists), and loads Remarkable/linkify (`3ttmw1-t9l7of.js`,
    80 KB transferred) in the initial JS.
  - This is the root cause behind #928, and it applies to `[tag]`, community and profile lists too.
- **Do.**
  1. Compute the summary (and the card image) on the server where the first page is fetched, and
     pass a trimmed entry (summary, no `body`) to the client components.
  2. Have client-fetched pages (infinite scroll) use the same trimming in the query function.
  3. Remove the Remarkable import from client code paths.
  4. Coordinate with #928: if its fix already does this, close this issue as covered after checking
     that `[tag]`, community and profile lists are included.
- **Acceptance.**
  - The inline RSC of `/blog/trending` is ≤ 100 KB, and none of the 20 posts' `body` is in it.
  - No Remarkable module is in the initial JS of `/blog/trending` or `/blog/@gtg/posts`.
  - Card summaries are unchanged (fixture spec comparing the rendered summaries of a recorded feed).

---

**Issue P4. i18n: load only the active language instead of all languages on every page (blog and wallet)**

- **Problem.**
  - `preload: languages` in `apps/blog/i18n/client.ts:66` (9 languages) and `apps/wallet/i18n/client.ts:67`
    (10) makes every page import every language's namespace JSON.
  - On `/blog/trending` that is 9 extra chunks, ~98 KB transferred and ~265 KB raw.
  - i18next spends 180–580 ms of 4× CPU per load (module `#953984`).
- **Do.**
  1. Drop `preload: languages`. Initialise with the language from `getInitialLanguage()` (cookie or
     `<html lang>`) and load other languages on `changeLanguage`.
  2. Consider inlining the active language's resources from the server so that the first render
     needs no extra request.
- **Acceptance.**
  - A logged-out English page load requests exactly one locale resource per namespace.
  - Switching language still works (existing language-switch e2e).
  - The i18next CPU share on `/blog/trending` drops by at least half in a CPU profile.

---

**Issue P5. Wallet transfers: render the operation history incrementally instead of 500 rows in one commit**

- **Problem.** When the 500-operation history (`getAccountOperations(…, 500, …)`,
  `apps/wallet/app/[param]/transfers/transfers-page.tsx:50`) arrives, `HistoryTable`
  (`feature/transfers-page/history-table.tsx:51-72`) renders every row synchronously.
  - That is one **4.2–4.5 s long task** on mobile Lighthouse, and TBT is about 6.5 s in those runs
    against 1.8 s when the request times out. It explains why #1037's 163 KB JS cut left TBT at 3.35 s.
  - The formatter class is rebuilt on every render (`history-table.tsx:40-41`) and the filter runs on
    every render (`account-history.tsx:40`).
  - Each row has a `TimeAgo` (own interval plus remount) and a wax `formatter.format`.
  - The page also requests `find_accounts` and `get_dynamic_global_properties` twice each (profile
    layout `['profileData']` vs page `['accountData']`).
- **Do.**
  1. Request and render one page of history (for example 50 operations). Load more on scroll or with
     a button, or keep 500 but window the rows.
  2. Memoize the formatter per `(username, dynamicData, hiveChain)` and the filtered list per
     `(data, filter)`.
  3. Use a single shared time formatter (see the P9 issue).
  4. Reuse the profile layout's account query instead of a second `find_accounts`.
- **Acceptance.**
  - On `/wallet/@gtg/transfers` the longest task is under 500 ms in every mobile Lighthouse run that
    received the history.
  - The median mobile TBT is under 1.5 s.
  - One `find_accounts` and one DGP request per load.
  - The history filters still work (existing wallet e2e).

---

**Issue P6. Wallet: read through the wasm-free client (apply DR-0002 to the wallet) and don't gate pages on the wax chain**

- **Problem.**
  - `apps/wallet/lib/hive.ts` reads through `getChain()` in about 18 functions.
  - `transfers-page.tsx` shows a page-wide spinner until `reuseHiveChain()` resolves.
  - So market, proposals, `~witnesses`, transfers, delegations, author-rewards, curation-rewards and
    authorities download and compile `wax.common.wasm` (948 KB) before or while rendering, for
    anonymous visitors too.
  - Mobile LCP is 10.2–11.4 s on these pages, against 1.1–1.3 s on wallet pages that don't wait for
    WASM. Desktop is 2.1–2.3 s against 0.3–0.5 s.
  - DR-0002 moved blog reads to `getReadChain()` and explicitly left the wallet out.
- **Do.**
  1. Route the wallet's read functions through `getReadChain()` / `read-client.ts`, adding any
     missing REST definitions to `EXTENDED_REST_API_DEFINITION`.
  2. Use the pure-TS asset and vests math (`ui/lib/asset-math.ts`) for display.
  3. Keep `getChain()` for signing, broadcast and wasm-only operations, and for `formatter` only
     where no pure-TS equivalent exists. If the history formatter needs wax, load it after first
     paint rather than gating the page.
  4. Remove the `!hiveChain` condition from page-level loading gates.
  5. Add `anonymousNoWasm` fixture specs for the wallet routes listed above.
- **Acceptance.**
  - Logged-out loads of `/wallet/market`, `/wallet/proposals`, `/wallet/~witnesses` and
    `/wallet/@gtg/delegations` request no `.wasm`.
  - `/wallet/@gtg/transfers` paints balances before any `.wasm` request completes.
  - The mobile Lighthouse median LCP of those routes is under 4 s.
  - The wax-equivalence tests cover the newly routed calls.

---

**Issue P7. Community pages: remove the mobile layout shift of the feed column (CLS 0.16–0.17)**

- **Problem.** On mobile, every community route shifts the feed column
  (`div.col-span-12.mb-5.flex.flex-col.md:col-span-10.lg:col-span-8`) after load: CLS 0.172
  (trending, created), 0.158 (hot, payout), 0.169 (roles), measured on `hive-160391`. Desktop is
  0.002. Content above the list on mobile (community header, description or subscribe block) changes
  height once client data (`bridge.list_subscribers`, `bridge.account_notifications`) or hydration
  arrives.
- **Do.**
  1. Identify the inserted or resized block with a layout-shift trace on a 412 px viewport.
  2. Render it in its final size on the server (the data is already prefetched by
     `PrefetchComponent`), or reserve its space.
  3. While there, give `hot` and `payout` community feeds their `initialData` so they don't refetch
     `bridge.get_ranked_posts` after load.
- **Acceptance.**
  - The mobile Lighthouse median CLS is ≤ 0.05 on `/blog/trending/hive-160391` and
    `/blog/hot/hive-160391`.
  - No `bridge.get_ranked_posts` request after load on `/blog/hot/hive-160391`.

---

**Issue P8. Profile pages: cache the server-side account reads across requests**

- **Problem.**
  - The profile layout (`apps/blog/app/[param]/(user-profile)/layout.tsx:87-120`) awaits
    `getAccountFull` (only request-deduplicated by React `cache()`), then reputation and dynamic
    global properties, on every request.
  - TTFB on `/@gtg` and `/@gtg/posts` ranged from 0.24 s to 3.81 s over repeated loads. In
    Lighthouse, `/@gtg` had a median TTFB of 2.3 s and its median mobile run a 3.4 s LCP load delay.
  - Feeds avoid this with the #1017 process cache.
- **Do.** Serve anonymous profile SSR reads (account, reputation, DGP, and the first page of the
  tab's posts) from a short-lived process cache, as `apps/blog/lib/feed-cache.ts` does for feeds
  (`createFeedCache`, stale-while-revalidate, DR-0001 failover preserved).
- **Acceptance.**
  - Over 10 sequential anonymous loads of `/blog/@gtg`, p90 TTFB is under 600 ms.
  - Profile data stays at most one cache TTL stale.
  - A unit test covers the cache key and expiry.

---

**Issue P9. TimeAgo: share formatters, drop the per-instance interval and the post-mount remount**

- **Problem.** `packages/ui/components/time-ago.tsx` is the most expensive app module on feeds,
  posts and wallet lists: 110–160 ms of 4× CPU per feed or post page, 205 ms on wallet
  `~witnesses`, 356 ms on a 955-comment post.
  - Per instance it builds `Intl.RelativeTimeFormat` and a `toLocaleString(…,{timeZone:"UTC"})` date
    on every update, reads the cookie, and formats a `toLocaleString` title.
  - It starts its own `setInterval` (line 63).
  - It flips `key` from `server` to `client` after mount (line 72), remounting every timestamp right
    after hydration.
- **Do.**
  1. Cache one `Intl.RelativeTimeFormat` and one `DateTimeFormat` per locale at module level.
  2. Compute the age from `Date.now()` and the parsed UTC timestamp, with no locale round-trip.
  3. Drive updates from one shared minute ticker (for example a `useSyncExternalStore` clock).
  4. Replace the key flip with `suppressHydrationWarning` on the text, which it already sets.
  5. Read the language once from context.
- **Acceptance.**
  - The `TimeAgo` module self-time is ≤ 30 ms on `/blog/trending` in a 4× CPU profile.
  - One interval for the whole page (Chrome performance monitor or a unit test).
  - The rendered text and the title are unchanged (unit test over a fixed clock).

---

**Issue P10. `[tag]` and community routes: keep the wax foundation, zod and the renderer out of the initial JS**

- **Problem.** All 11 `[tag]` and community routes load 158 KB more JS than their parent feed
  (859 vs 701 KB): the wax JS foundation (`createWaxFoundation`, 67 KB), the full renderer with
  sanitizer (60 KB), the community description (20 KB) and zod (16 KB). That includes plain tags
  such as `/trending/photography` that show no community description. The `[tag]` layouts import
  `prefetch-component.tsx` → `community-layout.tsx` → `community-description.tsx` (`RendererContainer`,
  `@hive/common-hiveio-packages/wax`). The `initialChunks` fixture specs don't cover a `[tag]` route.
- **Do.**
  1. Trace which import pulls in the wax foundation and zod (bundle analyzer or `next build --debug`).
  2. Make it type-only or lazy.
  3. Load `CommunityDescription` (and with it the renderer) with `next/dynamic` only on community
     routes.
  4. Extend `initialChunks*.spec.ts` with `/trending/<tag>` and `/trending/hive-<id>`.
- **Acceptance.**
  - `/blog/trending/photography` loads no more than 20 KB more script than `/blog/trending`.
  - No wax-foundation or zod module is in the initial JS of `[tag]` routes (fixture spec).

---

**Issue P11. Wallet witnesses: server-render the witness list (CLS 0.72, TBT 1.8 s)**

- **Problem.** On `/wallet/~witnesses`, the table body changes from a one-row "Loading…" placeholder
  to 250 rows after WASM, `list_witnesses` and `find_accounts` for all owners, and the table reflows:
  - CLS 0.719 on mobile and 0.734 on desktop (`tbody[data-testid=witness-table-body]`);
  - mobile TBT 1.8 s with a 2.06 s longest task; 4.4k DOM nodes.
  - The data is public and the same for every visitor.
- **Do.**
  1. Fetch the witness list and owner accounts on the server (wasm-free read client; see the P6
     issue) and render the table with its rows in the HTML.
  2. Keep vote state client-side for logged-in users.
  3. Give the table fixed column widths.
- **Acceptance.**
  - The mobile and desktop Lighthouse median CLS is ≤ 0.05 on `/wallet/~witnesses`.
  - The witness rows are present in the server HTML (JS-off fixture spec).
  - The mobile median TBT is under 1 s.

---

**Issue P12. Wallet: fix the favicon URL that loads the blog feed on every wallet page**

- **Problem.** `apps/wallet/app/layout.tsx:27` declares `icon: '/favicon.ico'`. On the subdirectory
  deployment `/favicon.ico` redirects (`302`) to `/blog`, so every wallet page view downloads the
  blog's trending HTML (92–93 KB transferred) and makes the blog server render a feed. The blog
  uses `${basePath}/favicon.ico`.
- **Do.**
  1. Use the base path for the wallet icon, as the blog does.
  2. Add a fixture assertion that loading a wallet page makes no request outside `/wallet` on the
     site origin.
- **Acceptance.** A logged-out load of `/wallet/@gtg/permissions` makes no request to `/blog` or
  `/favicon.ico`.

---

**Issue P13. Sentry: don't ship or evaluate the client SDK when no DSN is configured**

- **Problem.** `apps/{blog,wallet}/instrumentation-client.ts` imports `@sentry/nextjs` statically and
  checks `SENTRY_DSN` at runtime, so about 137 KB raw (~47 KB transferred) of Sentry code is in the
  initial JS of every page. On deployments without a DSN, such as the integration site, none of it
  is used.
- **Do.**
  1. Load the SDK with a dynamic `import('@sentry/nextjs')` inside the `SENTRY_DSN` check.
  2. Keep `onRouterTransitionStart` as a no-op until it loads.
  3. Or initialise after `load`/idle, as Replay already does.
  4. Confirm with the Sentry docs that early errors are still captured (or accept the trade-off
     explicitly).
- **Acceptance.**
  - With `SENTRY_DSN` unset, no Sentry module is in the initial JS of `/blog/trending` or `/wallet`.
  - With it set, an error thrown after load still reaches Sentry (manual check or a mocked transport
    test).

## Changes to the automated check

This audit adds two routes to the `integration` section of
`scripts/ci-helpers/lighthouse-thresholds.json`. They are high-traffic route types that the four
existing routes don't cover, and they exercise different code paths:

| Route | Why | Today's mobile runs (perf / LCP / TBT / CLS / JS) | Thresholds |
|---|---|---|---|
| `/blog/hive-163772/@ibarra95/visiting-the-desparramaderos-waterfall-nature` | The common post shape: an image-led long post with no leading video. Its LCP is a server-HTML image, unlike the existing post route. | 51/44/41; LCP 5.1–6.4 s; TBT 1.28–2.01 s; CLS 0.001; JS 878 KB | perf ≥ 35, LCP ≤ 8.5 s, TBT ≤ 2.5 s, CLS ≤ 0.1, JS ≤ 930 KB, LCP not lazy |
| `/blog/trending/hive-160391` | Community feeds: community layout, extra client calls, the P7 layout shift and the P10 extra JS | 64/68/66; LCP 2.8–3.3 s; TBT 0.75–0.97 s; CLS 0.172; JS 879 KB | perf ≥ 55, LCP ≤ 4.5 s, TBT ≤ 1.5 s, CLS ≤ 0.2, JS ≤ 930 KB, LCP not lazy |

How the thresholds were set:

- They sit just above the highest of today's three runs: about 1.3× for LCP, about 1.5× for TBT,
  and JS about 6% over the median. Script size barely varies between runs, so a JS increase of
  that size is a real change.
- CLS on the community route is set at 0.2, just above today's 0.172. It is meant to catch a further
  regression; P7's fix should bring it below 0.1, and then the threshold should be tightened.

The check now runs 18 Lighthouse runs per promoted revision instead of 12, about 7 minutes. The
integration upgrade unit's `TimeoutStartSec` goes from 2400 to 3000 s to keep the worst case
(300 s compose wait, 300 s deploy wait, 18 × 120 s) inside the limit. Copy the unit to
`/etc/systemd/system/` again on the host to apply it (`stack/integration/README.md`, *Setup*).
Until then, the practical runtime of about 7 minutes is far below the old 2400 s limit.

## Reproducing

All runs were made from an AIDEV worker against the integration site while it served `0f365af4`.

```bash
IMG=registry.gitlab.com/gitlab-ci-utils/lighthouse@sha256:b9d544ecc3196357d82ce434826c51ccbd57a117e16891570883b937b1713358
SITE=https://denser.discuss.peerverity.info
# one route, mobile then desktop; repeat 3 times each and take the per-metric median
docker run --rm --cpus 2 --memory 2g "$IMG" lighthouse "$SITE/blog/trending" \
  --only-categories=performance --output=json --output-path=stdout --quiet \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" > mobile.json
docker run --rm --cpus 2 --memory 2g "$IMG" lighthouse "$SITE/blog/trending" --preset=desktop \
  --only-categories=performance --output=json --output-path=stdout --quiet \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" > desktop.json
```

Where each number comes from in the report JSON:

| Number | Audit |
|---|---|
| LCP sub-parts | `lcp-breakdown-insight` |
| Long tasks by script | `long-tasks` |
| Per-script CPU | `bootup-time` |
| CLS culprits | `layout-shifts` and `cls-culprits-insight` |
| Chunks | `network-requests` (`resourceType: Script`) |
| Lazy LCP | `lcp-discovery-insight` (the same check as `lighthouse-median.js`) |

**RSC sizes.** Fetch a route with `curl --compressed` and sum the `<script>` bodies that contain
`self.__next_f`. For client-navigation size, repeat the request with the header `RSC: 1`.

**Chunk identity.** Chunk names are content hashes of this build. Identify a chunk by searching its
text, for example `createWaxFoundation` (wax foundation), `invalid_union` (zod), `Remarkable`,
`DetermineComponentFrameRoot` (React DOM), `__SENTRY__`.
