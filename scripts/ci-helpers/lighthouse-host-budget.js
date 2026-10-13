/**
 * A route's absolute budgets judged with an allowance for a slow host. Pure functions;
 * no I/O.
 *
 * Lighthouse's simulated LCP and TBT replay the run's CPU work, so they grow as the
 * host's CPU benchmark (`benchmark-index`) falls. When the route's median benchmark is
 * below the baseline's, the budgets of those metrics are multiplied by
 * baselineBenchmark / hostBenchmark; on a host at or above the baseline, or with no
 * benchmark on either side, the scale is 1 and every budget applies as written. The
 * performance floor, CLS, bytes, request counts and booleans are never scaled.
 */

const { findBreaches } = require('./lighthouse-median');

const HOST_SCALED_METRICS = new Set(['largest-contentful-paint', 'total-blocking-time']);

function hostSpeedOf(median, baselineMedian) {
  const benchmark = median['benchmark-index'];
  const baselineBenchmark = baselineMedian?.['benchmark-index'];
  const measured = typeof benchmark === 'number' && benchmark > 0 && typeof baselineBenchmark === 'number';
  const scale = measured ? Math.max(1, baselineBenchmark / benchmark) : 1;
  return { benchmark, baselineBenchmark, scale };
}

function scaledThresholds(thresholds, scale) {
  return Object.fromEntries(
    Object.entries(thresholds).map(([metric, threshold]) => [
      metric,
      HOST_SCALED_METRICS.has(metric) && typeof threshold === 'number' ? threshold * scale : threshold,
    ])
  );
}

/**
 * `{ hostSpeed, breaches, allowances }` for a route's median against its thresholds.
 * `hostSpeed` is `{ benchmark, baselineBenchmark, scale }`. `breaches` are
 * findBreaches' against the scaled budgets; a scaled metric's breach also carries its
 * written `budget` and the `scale`. `allowances` are the breaches of the written
 * budgets that the scale forgave, in findBreaches' shape plus `budget` and `scale`.
 */
function evaluateBudgets(median, thresholds, baselineMedian) {
  const hostSpeed = hostSpeedOf(median, baselineMedian);
  const { scale } = hostSpeed;
  const annotate = (breach) =>
    scale > 1 && HOST_SCALED_METRICS.has(breach.metric) ? { ...breach, budget: thresholds[breach.metric], scale } : breach;
  const breaches = findBreaches(median, scaledThresholds(thresholds, scale)).map(annotate);
  const counted = new Set(breaches.map((b) => b.metric));
  const allowances = findBreaches(median, thresholds)
    .filter((b) => !counted.has(b.metric))
    .map((b) => ({ ...b, budget: b.threshold, threshold: b.threshold * scale, scale }));
  return { hostSpeed, breaches, allowances };
}

module.exports = { evaluateBudgets };
