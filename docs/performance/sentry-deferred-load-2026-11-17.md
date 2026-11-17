# Sentry with a DSN set: what it cost the page load, and loading it after (2026-11-17)

Once the integration site's `.env` got a DSN, every route's script transfer grew by about 83.6 KB
and TBT rose on almost every route (issue #1655). This profile measures the same production builds
with and without a DSN, before and after the client SDK was moved off the page load.

## Result

With a DSN, the client loaded Sentry during the page load in three chunks, all inside Lighthouse's
trace (blog chunk names; the wallet's are the same code):

| Chunk | Raw / brotli | What it is | Main-thread time per load (4× CPU, median) |
|---|---|---|---|
| `05u49…` | 80 / 25.6 KB | browser SDK, default integrations, browserTracing (pageload span, web-vitals and long-animation-frame observers) | trending 86, hf25 57, wallet 266 ms |
| `3znu2…` | 50 / 15.7 KB | `@sentry/core` | 63 ms in the runs it was attributed separately |
| `129i2…` | 122 / 34.5 KB | Session Replay (rrweb), added on the first idle callback after `load` | trending 113, hf25 159, wallet 97 ms |

Together with three small shared chunks: +84.5 KB script transfer and 180-390 ms of Lighthouse
`bootup-time` per load. The replay share is rrweb's evaluation plus its first full DOM snapshot.
Every session records one, because `replaysOnErrorSampleRate` 1.0 runs replay in buffer mode
for each session not picked for a full replay. The SDK share is evaluation plus `init`. `init`
installs browserTracing's observers whether the trace is sampled or not, because @sentry/nextjs
always adds that integration on the client. `enableLogs` adds nothing measurable: no console
integration is added. The envelopes (a 0.5 KB session, about 3 KB per error) left no main-thread
cost visible in the traces.

The SDK now loads 5 s after `load`, on the next idle callback (at most 5 s later):
`@ui/lib/sentry-deferred-load`, called by both apps' `instrumentation-client.ts`. That is past the
end of Lighthouse's trace, which ends about 2.6 s after `load` (observed time) on these routes.
With a DSN, the pages now load no Sentry code during the page load. TBT and script transfer match
the build without a DSN.

## Measurements

Lighthouse 13.5, mobile simulated, `lighthouse_fixture` on the `lighthouse` recording, 5 runs per
route, CPU benchmark 4,800-4,870. "before" is bcd3812f, "after" is bcd3812f with this change.
Within each tree, both columns are the same build, measured without a DSN and then with
`REACT_APP_SENTRY_DSN` pointing at a local sink that answers the envelopes.

| Route | Tree | TBT, no DSN | TBT, DSN | Script KB, no DSN -> DSN | Sentry chunks in the trace |
|---|---|---|---|---|---|
| `/blog/trending` | before | 158 | 217 | 391.2 -> 475.7 | 6 |
| | after | 151 | 143 | 391.4 -> 391.5 | 0 |
| hf25 post | before | 592 | 689 | 480.5 -> 565.1 | 6 |
| | after | 581 | 562 | 480.8 -> 480.9 | 0 |
| `/wallet/@gtg/transfers` | before | 290 | 324 | 451.2 -> 536.2 | 7 |
| | after | 257 | 243 | 451.3 -> 451.4 | 0 |

The rise is smaller here than on the integration site (+50-120 ms against +250-750 ms). Why was
not investigated: the site serves live data over a real network and runs on another host.

Every page of the fixture pass raises React's recoverable hydration error #418, with or without a
DSN. The harness puts its browser clock script first in `<head>`, which is the likely cause. A
first version of this change loaded the SDK at once on the first collected error, so that error
pulled the whole SDK back into the page load (+83.5 KB, TBT as before). Errors no longer trigger
the load.

## What was given up

- Errors raised before the SDK loads are collected and sent when it loads: uncaught errors,
  unhandled rejections and errors passed to `handleError`. On a page closed before then, about
  5-10 s after `load`, they are lost. In the fixture pass, 10 of 15 loads with a DSN delivered their
  hydration error. In the other 5, Lighthouse closed the page first.
- Breadcrumbs from before the SDK loads are missing (console, fetch, clicks, navigation).
- Page-load transactions are built from the browser's buffered performance entries when the SDK
  loads. Fetches made before then get no spans and no `sentry-trace` header. Router transitions
  before then are not traced, as before.
- Session Replay starts after the SDK loads, so replays miss the first seconds of a visit.
  Its sample rates are unchanged (10% of sessions, buffer mode for the rest).

## Method

- Builds: `.aidev/run-lighthouse-fixture.sh` in the suite's image, on copies of the two trees.
  A local patch to the copy restarted both apps with `REACT_APP_SENTRY_DSN=http://publickey@127.0.0.1:8000/1`
  after the plain pass, measured again, and had `site-router.mjs` answer and log
  `/api/1/envelope/`.
- Sentry chunks: the scripts a DSN run requested that the same build's no-DSN runs did not.
  They were named by grepping the built chunks for SDK markers (`sentry.javascript.`, `rrweb`,
  `pageload`, `__SENTRY__`). Time per chunk is Lighthouse's `bootup-time` total.
- Envelope types came from the sink's log. Before: one error event per load, plus sessions,
  transactions and replays. After: error events, sessions and transactions, all sent after the
  trace.
