/**
 * Median-of-N Lighthouse summaries and their comparison with thresholds.
 * Pure functions over parsed Lighthouse JSON reports; no I/O.
 *
 * Thresholds name a metric and its limit: `performance` is a floor (0-100), a
 * boolean (`lcp-lazy-loaded`) must equal the median, every other metric is a ceiling.
 */

const FLOOR_METRICS = new Set(['performance']);

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
    if (metric === 'lcp-lazy-loaded') {
      summary[metric] = measured.filter((run) => run[metric]).length * 2 > measured.length;
    } else {
      summary[metric] = median(measured.map((run) => run[metric]));
    }
  }
  return summary;
}

/** Every threshold a route summary breaches, as `{ metric, value, threshold }`. */
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
    if (breached) breaches.push({ metric, value, threshold });
  }
  return breaches;
}

module.exports = { extractRunMetrics, median, summarizeRuns, findBreaches };
