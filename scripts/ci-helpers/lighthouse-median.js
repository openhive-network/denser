/**
 * Median-of-N Lighthouse summaries and their comparison with thresholds.
 * Pure functions over parsed Lighthouse JSON reports; no I/O.
 *
 * Thresholds name a metric and its limit: `performance` is a floor (0-100), a
 * boolean (`lcp-lazy-loaded`) must equal the median, every other metric is a ceiling.
 *
 * The judged LCP is Lighthouse's simulation (Lantern, slow 4G). The `observed-*`
 * metrics are the paints the browser actually made in the run; they are recorded,
 * not judged.
 */

const FLOOR_METRICS = new Set(['performance']);
// An LCP breach whose median observed LCP is below this is a simulation artifact:
// the page painted fast, and only Lantern's replay of the requests around it is slow.
const SIMULATED_ONLY_OBSERVED_LCP_MS = 2500;

/** Metrics read from one report, or `{ error }` when Lighthouse could not measure the page. */
function extractRunMetrics(report) {
  if (report.runtimeError) {
    return { error: `${report.runtimeError.code}: ${report.runtimeError.message}` };
  }
  const audits = report.audits || {};
  const score = report.categories?.performance?.score;
  if (typeof score !== 'number') {
    return { error: 'report has no performance score' };
  }
  const scriptRow = (audits['resource-summary']?.details?.items || []).find(
    (item) => item.resourceType === 'script'
  );
  return {
    performance: Math.round(score * 100),
    'largest-contentful-paint': audits['largest-contentful-paint']?.numericValue,
    'total-blocking-time': audits['total-blocking-time']?.numericValue,
    'cumulative-layout-shift': audits['cumulative-layout-shift']?.numericValue,
    'script-transfer-bytes': scriptRow?.transferSize,
    'lcp-lazy-loaded': lcpIsLazyLoaded(audits),
    ...observedPaints(audits),
  };
}

function observedPaints(audits) {
  const observed = audits.metrics?.details?.items?.[0] || {};
  return {
    'observed-first-contentful-paint': observed.observedFirstContentfulPaint,
    'observed-largest-contentful-paint': observed.observedLargestContentfulPaint,
  };
}

// Lighthouse's own "LCP resources should not use loading=lazy" check: absent when the
// LCP element is not an image.
function lcpIsLazyLoaded(audits) {
  const checklist = (audits['lcp-discovery-insight']?.details?.items || []).find(
    (item) => item.type === 'checklist'
  );
  return checklist?.items?.eagerlyLoaded?.value === false;
}

function median(values) {
  const sorted = values.filter((v) => typeof v === 'number').sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The per-metric median of a route's runs. `lcp-lazy-loaded` is true when most
 * measured runs saw it. `measuredRuns` counts the runs that produced metrics.
 */
function summarizeRuns(runs) {
  const measured = runs.filter((run) => !run.error);
  const summary = { measuredRuns: measured.length, errors: runs.filter((r) => r.error).map((r) => r.error) };
  if (measured.length === 0) return summary;
  for (const metric of Object.keys(measured[0])) {
    // Nested figures (a run's `backend`) have their own summary.
    if (typeof measured[0][metric] === 'object') continue;
    if (metric === 'lcp-lazy-loaded') {
      summary[metric] = measured.filter((run) => run[metric]).length * 2 > measured.length;
    } else {
      summary[metric] = median(measured.map((run) => run[metric]));
    }
  }
  return summary;
}

/**
 * Every threshold a route summary breaches, as `{ metric, value, threshold }`. An LCP
 * breach whose median observed LCP is under SIMULATED_ONLY_OBSERVED_LCP_MS also carries
 * `simulatedOnly: true` and that `observed` value.
 */
function findBreaches(summary, thresholds) {
  if (summary.measuredRuns === 0) {
    return [{ metric: 'measurement', value: 'no successful run', threshold: 'at least one' }];
  }
  const breaches = [];
  for (const [metric, threshold] of Object.entries(thresholds)) {
    const value = summary[metric];
    if (typeof threshold === 'boolean') {
      if (value !== threshold) breaches.push({ metric, value, threshold });
      continue;
    }
    if (typeof value !== 'number') {
      breaches.push({ metric, value: 'not measured', threshold });
      continue;
    }
    const breached = FLOOR_METRICS.has(metric) ? value < threshold : value > threshold;
    if (breached) breaches.push({ metric, value, threshold, ...simulatedOnlyLabel(metric, summary) });
  }
  return breaches;
}

function simulatedOnlyLabel(metric, summary) {
  const observed = summary['observed-largest-contentful-paint'];
  if (metric !== 'largest-contentful-paint' || typeof observed !== 'number') return {};
  return observed < SIMULATED_ONLY_OBSERVED_LCP_MS ? { simulatedOnly: true, observed } : {};
}

/** Whether `routes` breach, and every breach is labelled `simulatedOnly`. */
function isSimulatedOnly(routes) {
  const breaches = routes.flatMap((route) => route.breaches);
  return breaches.length > 0 && breaches.every((breach) => breach.simulatedOnly);
}

module.exports = { extractRunMetrics, median, summarizeRuns, findBreaches, isSimulatedOnly, SIMULATED_ONLY_OBSERVED_LCP_MS };
