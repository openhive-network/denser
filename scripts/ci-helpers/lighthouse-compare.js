/**
 * Per-route comparison of two Lighthouse results of the same route set: a baseline
 * and the current pass, both in the shape the integration and fixture checks write
 * (`routes[].median`). Pure functions; no I/O.
 *
 * A metric regresses when it moves the wrong way by more than its tolerance:
 * max(relative * baseline, absolute). The defaults suit a deterministic pass
 * (recorded data, no network): bytes and request counts are reproducible, so their
 * bounds are tight; LCP and TBT still follow the host's CPU, so theirs are loose.
 * Script bytes take no relative share: rebuilds of one tree serve identical chunks,
 * and passes differ by a few response-header bytes, so 2 KiB is any real change.
 *
 * When a route's median `benchmark-index` (Lighthouse's CPU benchmark of each run) is
 * more than HOST_SLOWER_RATIO below the baseline's, the host was slower than when the
 * baseline was measured: a CPU-bound metric that regressed is then an advisory, listed
 * but not failing the comparison. Bytes and request counts do not depend on the CPU.
 */

const DEFAULT_TOLERANCES = {
  'script-transfer-bytes': { relative: 0, absolute: 2048 },
  'image-transfer-bytes': { relative: 0.02, absolute: 2048 },
  'total-transfer-bytes': { relative: 0.02, absolute: 4096 },
  'request-count': { relative: 0, absolute: 2 },
  'largest-contentful-paint': { relative: 0.25, absolute: 500 },
  'total-blocking-time': { relative: 0.5, absolute: 250 },
  'cumulative-layout-shift': { relative: 0, absolute: 0.05 },
  performance: { relative: 0, absolute: 10, lowerIsWorse: true },
};
const CPU_BOUND = new Set(['largest-contentful-paint', 'total-blocking-time', 'performance']);
const HOST_SLOWER_RATIO = 0.15;

function hostWasSlower(baselineMedian, currentMedian) {
  const before = baselineMedian['benchmark-index'];
  const after = currentMedian['benchmark-index'];
  return typeof before === 'number' && typeof after === 'number' && after < before * (1 - HOST_SLOWER_RATIO);
}

function compareMetric(baseline, current, { relative, absolute, lowerIsWorse = false }) {
  const delta = current - baseline;
  const limit = Math.max(relative * Math.abs(baseline), absolute);
  const worse = lowerIsWorse ? -delta : delta;
  return { baseline, current, delta, limit, regressed: worse > limit };
}

function compareRoute(route, baselineMedian, currentMedian, tolerances) {
  if (!currentMedian?.measuredRuns) {
    return { route, metrics: {}, regressions: [{ route, metric: 'measurement', baseline: baselineMedian.measuredRuns, current: 0 }], advisories: [] };
  }
  const hostSlower = hostWasSlower(baselineMedian, currentMedian);
  const benchmark = { baseline: baselineMedian['benchmark-index'], current: currentMedian['benchmark-index'], hostSlower };
  const metrics = {};
  const regressions = [];
  const advisories = [];
  for (const [metric, tolerance] of Object.entries(tolerances)) {
    const before = baselineMedian[metric];
    const after = currentMedian[metric];
    if (typeof before !== 'number' || typeof after !== 'number') continue;
    metrics[metric] = compareMetric(before, after, tolerance);
    if (!metrics[metric].regressed) continue;
    (hostSlower && CPU_BOUND.has(metric) ? advisories : regressions).push({ route, metric, ...metrics[metric] });
  }
  return { route, benchmark, metrics, regressions, advisories };
}

/**
 * `{ baseline, status, routes, regressions, advisories, unmatched }`: `status` is
 * `regression` when any route regressed, else `pass`. `advisories` are the CPU-bound
 * regressions of routes measured on a slower host. `unmatched` names the routes only
 * one side measured; a route the baseline has no figures for is not judged.
 */
function compareResults(current, baseline, tolerances = DEFAULT_TOLERANCES) {
  const baselineRoutes = new Map((baseline.routes || []).map((r) => [r.route, r.median]));
  const currentRoutes = new Map((current.routes || []).map((r) => [r.route, r.median]));
  const routes = [];
  for (const [route, currentMedian] of currentRoutes) {
    const baselineMedian = baselineRoutes.get(route);
    if (baselineMedian?.measuredRuns) routes.push(compareRoute(route, baselineMedian, currentMedian, tolerances));
  }
  const unmatched = [...new Set([...baselineRoutes.keys(), ...currentRoutes.keys()])].filter(
    (route) => !baselineRoutes.has(route) || !currentRoutes.has(route)
  );
  const regressions = routes.flatMap((r) => r.regressions);
  return {
    baseline: { revision: baseline.revision, measuredAt: baseline.measuredAt },
    status: regressions.length ? 'regression' : 'pass',
    routes: routes.map(({ regressions: _r, advisories: _a, ...route }) => route),
    regressions,
    advisories: routes.flatMap((r) => r.advisories),
    unmatched,
  };
}

function formatValue(metric, value) {
  if (metric.endsWith('-bytes')) return `${(value / 1024).toFixed(1)} KiB`;
  if (metric === 'cumulative-layout-shift') return value.toFixed(3);
  if (metric === 'performance' || metric === 'request-count') return String(value);
  return `${Math.round(value)} ms`;
}

function routeHeading(route, benchmark) {
  if (typeof benchmark?.baseline !== 'number' || typeof benchmark?.current !== 'number') return `  ${route}`;
  const note = benchmark.hostSlower ? ', host slower: CPU-bound regressions are advisory' : '';
  return `  ${route} (CPU benchmark ${Math.round(benchmark.baseline)} -> ${Math.round(benchmark.current)}${note})`;
}

/** Text lines: one per route and metric, marking each regression (❌) and advisory (⚠️). */
function formatComparison(comparison) {
  const lines = [`Against the baseline of ${comparison.baseline.revision || 'unknown revision'} (${comparison.baseline.measuredAt || 'unknown time'}):`];
  for (const { route, benchmark, metrics } of comparison.routes) {
    lines.push(routeHeading(route, benchmark));
    for (const [metric, m] of Object.entries(metrics)) {
      const sign = m.delta > 0 ? '+' : m.delta < 0 ? '-' : '±';
      const mark = !m.regressed ? '  ' : benchmark?.hostSlower && CPU_BOUND.has(metric) ? '⚠️' : '❌';
      lines.push(
        `    ${mark} ${metric}: ${formatValue(metric, m.baseline)} -> ${formatValue(metric, m.current)} ` +
          `(${sign}${formatValue(metric, Math.abs(m.delta))}, tolerance ${formatValue(metric, m.limit)})`
      );
    }
  }
  for (const r of comparison.regressions.filter((x) => x.metric === 'measurement')) {
    lines.push(`  ❌ ${r.route}: no successful run (the baseline had ${r.baseline})`);
  }
  if (comparison.unmatched.length) lines.push(`  not compared (measured on one side only): ${comparison.unmatched.join(', ')}`);
  return lines;
}

module.exports = { DEFAULT_TOLERANCES, compareResults, formatComparison };
