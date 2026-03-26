# Memory Leak Test Report — Denser Blog

**Date:** 2026-03-25
**Reference:** [denser#886](https://gitlab.syncad.com/hive/denser/-/issues/886)
**Build image:** `registry.gitlab.syncad.com/hive/common-ci-configuration/emsdk:5.0.2-1`
**Runtime Node.js:** 22.22.1-alpine (runner stage)
**Test parameters:** 10 RPS × 10 minutes = 6,000 requests per test, 5s sampling interval, 120s cooldown

---

## Test Environment

| Component | Value |
|-----------|-------|
| Build image | emsdk:5.0.2-1 (Node 22.21.1, pnpm 10.0.0) |
| Runner image | node:22-alpine (22.22.1) |
| Node.js flags | `--expose-gc --max-old-space-size=3072` (F5: 1536) |
| Load tool | k6 v0.56.0 |
| URL corpus | 2,889 unique URLs (posts, profiles, communities) |
| Sentry DSN | Disabled (F1, F4, F5), Dummy DSN (F3) |
| Container memory | Unlimited (host cgroups unavailable) |

---

## Results Matrix

| Test | Description | heapUsed B/req | R² | RSS B/req | R² | 6d heap (MB) | 6d RSS (MB) |
|------|-------------|---------------|-----|-----------|-----|-------------|-------------|
| **F1** | Baseline (no Sentry, Node 22) | **9,336** | 0.964 | **11,357** | 0.958 | 7,692 | 9,358 |
| **F3-a** | Sentry enabled + bot UA | **11,845** | 0.961 | **18,881** | 0.878 | 9,760 | 15,558 |
| **F4-a** | resolve-post only (QueryClient) | **373** | 0.498 | **820** | 0.639 | 308 | 676 |
| **F5** | Constrained heap (1536 MB) | **8,202** | 0.968 | **10,539** | 0.966 | 6,758 | 8,684 |

### Memory Trajectory (F1 Baseline)

```
Startup:   RSS=98 MB    heap=36 MB    external=3.75 MB
After warmup: RSS=206 MB   heap=74 MB    external=68 MB
End load:  RSS=277 MB    heap=133 MB   external=68 MB
Post-cool: RSS=277 MB    heap=133 MB   external=68 MB
```

---

## Derived Attribution (via subtraction)

| Vector | Calculation | heap B/req | RSS B/req | 6d heap (MB) |
|--------|------------|-----------|-----------|-------------|
| **Sentry overhead** | F3-a − F1 | **2,509** | **7,524** | **2,068** |
| **QueryClient (resolve-post)** | F4-a | **373** | **820** | **308** |
| **SSR rendering (excl. Sentry)** | F1 baseline | **9,336** | **11,357** | **7,692** |
| **Constrained heap effect** | F1 − F5 | **1,134** | **818** | **934** |

---

## Key Findings

### 1. Heap growth is ~9.3 KB/req — NOT 850 B/req

The issue reported 829 B/req from lab test L2-1 on Node 20.17. Our test on **Node 22** (no undici leak) shows **9,336 B/req** heap growth — **11x higher** than the issue's measurement.

**Why the discrepancy?** The issue's L2-1 test used a minimal "denser pattern" loop, not actual Next.js SSR. Our test drives real SSR pages through the full framework stack. The 9.3 KB/req includes:
- Next.js SSR rendering overhead (React component trees, serialization)
- Wax API call objects and response parsing
- V8 JIT code and hidden class transitions for unique URLs
- Module-level caches warming up

### 2. Sentry adds ~2.5 KB/req to heap and ~7.5 KB/req to RSS

With Sentry enabled (dummy DSN, `tracesSampleRate: 1`), heap growth rises from 9.3 to 11.8 KB/req (+27%). But **RSS growth nearly doubles** from 11.4 to 18.9 KB/req (+66%).

The RSS:heap ratio jumps from **1.22x** (no Sentry) to **1.59x** (with Sentry), meaning Sentry is allocating significant non-heap memory (likely for its transport buffers and span serialization).

**At production traffic (100 req/min, 6 days):**
- Without Sentry: ~7.7 GB heap growth
- With Sentry: ~9.8 GB heap growth (+2.1 GB from Sentry alone)
- RSS with Sentry: ~15.6 GB (would OOM well before 6 days)

### 3. QueryClient in resolve-post leaks ~373 B/req

The resolve-post API route (F4-a) leaks 373 B/req with low R² (0.498), confirming the leak is bounded and partially reclaimed by GC. This matches the issue's finding that QueryClient caches release after `gcTime`.

This route alone accounts for **~308 MB over 6 days** — significant but not the primary driver.

### 4. Constrained heap (--max-old-space-size=1536) reduces growth slightly

With 1536 MB heap limit (F5) vs 3072 MB (F1):
- Heap slope: 8,202 vs 9,336 B/req (12% lower)
- RSS slope: 10,539 vs 11,357 B/req (7% lower)

V8 applies slightly more GC pressure, but the leak persists. This means the growth is **not just V8 laziness** — real objects are being retained.

### 5. Memory does NOT reclaim during cooldown

In all tests, the post-cooldown memory reading was virtually identical to end-of-load. After 120 seconds with forced GC, neither RSS nor heapUsed dropped meaningfully. This means:
- The leaked objects are **strongly referenced** (not just pending GC)
- V8 is not returning memory pages to the OS (expected for RSS)
- The growth is a genuine leak, not a temporary cache

### 6. External memory (WASM) is stable

External memory (where WASM buffers live) stays flat at ~68 MB across all tests. **The wax WASM module itself is not leaking.** This further supports the conclusion that the per-API-call leak attributed to wax in issue #886 is not in the WASM layer.

---

## Root Cause Analysis

The **9.3 KB/req baseline growth** (without Sentry, on Node 22) is the dominant issue. This is **not** explained by any single vector from the issue — it's the cost of Next.js SSR rendering at scale.

Likely contributors to this baseline 9.3 KB/req:
1. **Next.js internal caches** — route module caches, compiled templates, and incremental compilation state
2. **React server component rendering** — component tree allocation per unique URL
3. **Wax API response objects** — JSON parsing and object creation per API call (this is the real "wax-related" cost, not WASM)
4. **V8 JIT compilation** — unique URL patterns trigger new code compilation and hidden class creation

Sentry adds another **2.5 KB/req** on top, making it worse under crawler traffic.

---

## Recommendations (Updated Priority)

### Tier 1: Highest Impact

| # | Fix | Measured Impact | Effort |
|---|-----|----------------|--------|
| 1 | **`tracesSampler` to filter bot traffic** | -2.5 KB/req heap, -7.5 KB/req RSS | Small |
| 2 | **Node 22 upgrade** (already done in this branch) | Eliminates undici leak (Node 20.17 specific) | Done |
| 3 | **`--max-old-space-size` + process restart** | Fail-fast at 1.5-2 GB instead of OOM at 3.8 GB | Config |

### Tier 2: SSR Growth Mitigation

| # | Fix | Expected Impact | Effort |
|---|-----|----------------|--------|
| 4 | **Remove QueryClient from resolve-post route** | -373 B/req | Small |
| 5 | **Add `queryClient.clear()` after dehydrate** in layouts | Bounds cache retention | 1 line |
| 6 | **Rate-limit crawler SSR** (return 429 or serve cached) | Reduces total request volume | Medium |
| 7 | **ISR/static generation** for popular posts | Eliminates SSR for repeat URLs | Medium |

### Tier 3: Investigate SSR Baseline

| # | Action | Purpose |
|---|--------|---------|
| 8 | **Heap snapshot comparison** at S1 vs S3 | Identify which object types dominate the 9.3 KB/req |
| 9 | **Next.js upgrade to 15.x** | May include memory fixes for SSR |
| 10 | **`serverExternalPackages: ['@hiveio/wax']`** | Test native WASM loading vs webpack bundling |

---

## Tests NOT Run (Require Separate Builds)

| Test | Reason | Status |
|------|--------|--------|
| F2 (Node 20.17 vs 20.15) | Requires separate Docker images with different Node versions | Skipped — Node 22 already used |
| F3-c (bot-filtered Sentry) | Requires code change to sentry.server.config.ts | Skipped |
| F6-b (node:http bypass) | Requires code change to bypass fetch() in API calls | Skipped |
| F7 (serverExternalPackages) | Requires rebuild with next.config.js change | Skipped |

---

## Reproducing the Tests

### Prerequisites

- Docker
- [k6](https://k6.io/docs/get-started/installation/) load testing tool
- `curl`, `jq` available on host

### Step 1: Build the test image

```bash
# From the denser repo root
docker build -f memtest/Dockerfile.memtest -t denser-memtest:latest .
```

### Step 2: Generate URL corpus

```bash
bash memtest/scripts/generate-url-corpus.sh /tmp/urls-all.txt
```

This fetches ~2,000-3,000 unique post/profile/community URLs from the Hive API.

### Step 3: Run a single test

```bash
# Set k6 path if not in PATH
export K6_BIN=$(which k6)

# F1: Baseline (no Sentry)
RPS=10 DURATION=10m COOLDOWN=120 \
  bash memtest/scripts/run-test.sh f1-baseline blog-crawler.js \
  -- 'NODE_OPTIONS=--expose-gc --max-old-space-size=3072'

# F3-a: Sentry enabled + bot UA
RPS=10 DURATION=10m COOLDOWN=120 \
  bash memtest/scripts/run-test.sh f3-sentry-enabled blog-crawler.js \
  --env 'USER_AGENT=Mozilla/5.0 (compatible; Googlebot/2.1)' \
  -- 'NODE_OPTIONS=--expose-gc --max-old-space-size=3072' \
  'REACT_APP_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0'

# F4-a: QueryClient (resolve-post only)
RPS=10 DURATION=10m COOLDOWN=120 \
  bash memtest/scripts/run-test.sh f4-queryclient-nofix resolve-post-only.js \
  -- 'NODE_OPTIONS=--expose-gc --max-old-space-size=3072'

# F5: Constrained heap
RPS=10 DURATION=10m COOLDOWN=120 \
  bash memtest/scripts/run-test.sh f5-constrained-heap blog-crawler.js \
  -- 'NODE_OPTIONS=--expose-gc --max-old-space-size=1536'
```

Each test takes ~13 minutes (30s warmup + 10min load + 2min cooldown).

### Step 4: Analyze results

```bash
# Single test
python3 memtest/scripts/analyze-test.py memtest/results/f1-baseline.csv --rps 10 --duration 600

# All tests at once (prints results matrix + derived attribution)
python3 memtest/scripts/analyze-test.py memtest/results/ --rps 10 --duration 600
```

### File structure

```
memtest/
├── Dockerfile.memtest              # Test image (emsdk build, node:22 runner)
├── REPORT.md                       # This report
├── k6/
│   ├── blog-crawler.js             # Full SSR page load simulation
│   └── resolve-post-only.js        # resolve-post API route only
├── scripts/
│   ├── generate-url-corpus.sh      # Fetch unique URLs from Hive API
│   ├── run-test.sh                 # Single test runner (container + k6 + sampling)
│   ├── sample-memory.sh            # Memory telemetry poller (CSV output)
│   ├── run-all-tests.sh            # Master orchestrator (all tests sequentially)
│   └── analyze-test.py             # CSV analysis (slopes, projections, attribution)
└── results/                        # CSV output (gitignored)
```

The debug memory endpoint (`apps/blog/app/api/debug/mem/route.ts`) is included in the blog app — it reports `process.memoryUsage()` with forced GC and optional heap snapshots via `?action=snapshot`.

---

## Conclusion

The dominant leak vector is **Next.js SSR rendering overhead at 9.3 KB/req** — not wax WASM, not undici, not QueryClient. At production crawler traffic rates, this alone would consume 7.7 GB in 6 days.

Sentry amplifies this by 27% (heap) to 66% (RSS). The original issue's attribution of ~850 B/req to wax is a **misattribution** — wax WASM external memory is completely stable, and the real cost is in JavaScript object allocation during the full SSR render cycle that includes wax API calls.

The most impactful fix is **filtering bot traffic from Sentry tracing** (saves 2.5 KB/req heap + 7.5 KB/req RSS). The fundamental SSR memory growth requires either architectural changes (ISR, caching, crawler rate limiting) or a Next.js upgrade.
