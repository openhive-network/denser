# React Compiler on Next 16 / React 19 (2026-10-08)

An evaluation of the React Compiler (`reactCompiler` in `next.config.js` with
`babel-plugin-react-compiler@1.0.0`) on top of `aidev/integration` at `d65080fd`
(#1008). The goal was less main-thread work on the post page (integration Lighthouse:
450 ms TBT, 2.8 s main-thread work) and fewer PostForm re-renders (#854).

**Outcome: not enabled.** Compiled app-wide, every blog page ships 18–25 KiB more
JavaScript, and load-time TBT and main-thread work do not go down. The compiler only
pays off on re-renders, where the editor's renders drop by about 64%. Neither app's
`next.config.js` is changed.

## Method

- **Page load:** the deterministic Lighthouse pass (`aidev test run --slot system`,
  `.aidev/run-lighthouse-fixture.sh`): production builds of both apps served from the
  `lighthouse` recording, offline, Lighthouse 13.5 mobile defaults, 5 runs per route.
  It was run once without the compiler and once with `reactCompiler: true` in both
  apps, back to back on the same host. Main-thread work and script bootup come from
  the runs' `mainthread-work-breakdown` and `bootup-time` audits. Main-thread time is
  also given normalised to a CPU benchmark index of 2850, because Lighthouse's CPU
  benchmark of the host varied by a few percent between runs (2725–2894).
- **Re-renders (#854):** a throwaway Playwright spec run through the fixture suite
  (`aidev test run --slot full --suite fixture_e2e -- <spec>`, production build,
  `postCreate` recording, logged in). The spec installs a minimal React DevTools
  global hook and counts committed renders per commit: PostForm itself, and every
  component inside PostForm's subtree. In a production build PostForm is recognised
  by a string literal only its body holds. The script opens `/submit.html`, types a
  28-character title and a 53-character body at 60 ms per key, then idles 4 s twice.
  Counts were identical across 3 repeats, except the load phase's commit count with
  the compiler on (23–24).

## Page load (medians of 5 runs)

| route | TBT off → on | main-thread off → on | normalised main-thread | JS transfer off → on |
|---|---|---|---|---|
| `/blog/trending` | 318 → 346 ms | 2217 → 2355 ms | +8.6% | 385.5 → 403.9 KiB |
| `/blog/trending/hive-160391` | 354 → 330 ms | 1625 → 1617 ms | −2.6% | 397.4 → 422.3 KiB |
| HF25 post (`@gtg`) | 1061 → 1083 ms | 3769 → 3785 ms | +0.1% | 463.1 → 486.3 KiB |
| `@ibarra95` post | 588 → 716 ms | 3340 → 3762 ms | +3.3% | 463.1 → 486.3 KiB |
| `/blog/@gtg` | 318 → 345 ms | 2141 → 2261 ms | +4.6% | 389.7 → 408.5 KiB |
| `/wallet/@gtg/transfers` | 907 → 715 ms | 3950 → 3726 ms | −4.4% | 472.9 → 485.1 KiB |

The extra JavaScript is the compiled components' memo-cache code. It shows up as
script parse/compile time on every blog route (+6 to +14 ms). Script evaluation
rises on four of the five blog routes: a page load renders each component once, and
the compiler only saves work on later renders. The JS growth breaches the Lighthouse pass's 2 KiB
`script-transfer-bytes` tolerance on all five blog routes.

The wallet is the one route that looks better. That is a single 5-run median on one
route whose JavaScript also grew. It is not enough to enable the compiler there.

## Re-renders while editing (#854)

| phase | compiler | commits | PostForm renders | renders in PostForm's subtree |
|---|---|---|---|---|
| page load | off / on | 25 / 23–24 | 5 / 5 | 2314 / 1627 |
| typing title and body | off / on | 167 / 86 | 82 / 82 | 40 223 / 14 623 |
| 4 s after the last key | off / on | 5 / 3 | 2 / 2 | 969 / 357 |
| next 4 s | off / on | 0 / 0 | 0 / 0 | 0 / 0 |

The #854 loop is visible as the two PostForm renders after typing stops: the autosave
write is echoed back as a same-tab `StorageEvent`. The compiler cannot remove those,
because a state update re-renders the component that owns the state. It makes each
one cheaper by skipping unchanged children. #854's own suggested fixes (don't
dispatch the event for same-tab writes, or ignore the hook's own writes) remove the
renders themselves.

PostForm itself is **not** compiled. The compiler bails out on it with
`Support value blocks (conditional, logical, optional chaining, etc) within a
try/catch statement`, caused by the `||` inside `fetchProxyAuthToken`'s `try`. The
gain above comes from the compiled components inside it (the `@hive/ui` form and
tooltip wrappers, blog components). Annotation mode with `'use memo'` on PostForm
alone was measured too, and the counts were identical to compiler-off.

## Coverage

In `infer` mode the compiler compiles 525 functions in the 429 `.tsx` files of the
blog, wallet and `@hive/ui`, and skips 86. The most common reasons:

| count | reason |
|---|---|
| 35 | This value cannot be modified (mutating props, hook results or state) |
| 12 | Cannot access refs during render |
| 11 | Value blocks within a try/catch statement |
| 9 | `try` with a `finally` clause |
| 7 | Existing memoization could not be preserved |
| 6 | A React ESLint rule is disabled in the component |

## Behaviour with the compiler enabled

The whole fixture suite was run once with `reactCompiler: true` in both apps
(`aidev test run --slot full --suite fixture_e2e`):

- **Blog:** 341 passed, 2 skipped. The expected failures (`test.fail` SSR and SEO gaps
  #903, #932) failed as expected.
- **Wallet:** 11 passed, 1 failed. WALLET-ANON-WASM-01 (`/market`) rendered the error
  boundary ("Something went wrong!") instead of the market statistics, on both
  attempts. `MarketPage` itself compiles. The component that throws was not
  identified, and this run alone does not show that the failure is caused by the
  compiler.

## If this is revisited

- The test-runtime image for a lockfile with `babel-plugin-react-compiler: ^1.0.0` in
  both apps' devDependencies was pushed while measuring:
  `registry.gitlab.syncad.com/hive/denser/aidev-tests@sha256:61d68f69f44d26fd44c5d91bb470fc531de7bd3acf6574d3e1766bce01817f87`
  (tag `aidev-d9ec5c4f241acb6a`). `build.sh` reuses it only if the regenerated lockfile
  is byte-identical; re-resolving `eslint-plugin-turbo: latest` can make it differ.
- Annotation mode limits the cost to the components that re-render a lot. It only
  helps when those components themselves compile: PostForm would first need the
  `try` block in `fetchProxyAuthToken` moved out of the component.
- Load-time TBT on the post page is dominated by script evaluation of the initial
  render, not by re-renders. That cost is reduced by loading less code, not by
  memoization.
