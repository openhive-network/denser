/**
 * Whether a Lighthouse pass ran in a degraded environment: its backend probes, or a
 * route's median TTFB, far above the rolling baseline of the passes before it.
 * Pure functions over the probe results and the baseline history; no I/O.
 *
 * A history entry is `{ revision, measuredAt, probes: { before, after }, ttfb: { <route>: ms } }`,
 * where `before` / `after` map a probe name (`api`, `images`, `origin`) to its result
 * `{ medianMs, samples, failures }`.
 */

const { median } = require('./lighthouse-median');

const BASELINE_WINDOW = 20;
const MIN_BASELINE_PASSES = 3;
const DEGRADED_FACTOR = 2;
const DEGRADED_FLOOR_MS = 300;

function isFarAbove(value, baseline) {
  return value >= baseline * DEGRADED_FACTOR && value - baseline >= DEGRADED_FLOOR_MS;
}

// Each pass adds its before and after medians to a probe's values; a key needs
// MIN_BASELINE_PASSES passes that measured it before it has a baseline.
function baselineOf(history) {
  const probeValues = {};
  const ttfbValues = {};
  for (const pass of history) {
    for (const name of new Set([...Object.keys(pass.probes?.before || {}), ...Object.keys(pass.probes?.after || {})])) {
      const values = [pass.probes?.before?.[name]?.medianMs, pass.probes?.after?.[name]?.medianMs].filter(
        (v) => typeof v === 'number'
      );
      if (values.length) (probeValues[name] ||= []).push(values);
    }
    for (const [route, ms] of Object.entries(pass.ttfb || {})) {
      if (typeof ms === 'number') (ttfbValues[route] ||= []).push([ms]);
    }
  }
  const settle = (byKey) =>
    Object.fromEntries(
      Object.entries(byKey)
        .filter(([, passes]) => passes.length >= MIN_BASELINE_PASSES)
        .map(([key, passes]) => [key, median(passes.flat())])
    );
  return { passes: history.length, probes: settle(probeValues), ttfb: settle(ttfbValues) };
}

function probeReasons(phase, probes, baseline) {
  const reasons = [];
  for (const [name, probe] of Object.entries(probes || {})) {
    if (probe.samples > 0 && probe.failures === probe.samples) {
      reasons.push({ kind: 'probe', name, phase, value: 'failed', baseline: baseline[name] });
    } else if (typeof baseline[name] === 'number' && typeof probe.medianMs === 'number' && isFarAbove(probe.medianMs, baseline[name])) {
      reasons.push({ kind: 'probe', name, phase, value: probe.medianMs, baseline: baseline[name] });
    }
  }
  return reasons;
}

/**
 * Classify one pass against the passes before it (`history`, oldest first).
 * Returns `{ status, baseline, reasons }`: `status` is `degraded` when a probe failed
 * every sample, or a probe median (before or after) or a route's TTFB is at least
 * DEGRADED_FACTOR times its baseline and DEGRADED_FLOOR_MS above it; `normal` when
 * nothing is and at least one figure had a baseline; `no-baseline` otherwise.
 */
function classifyEnvironment({ before, after, ttfb }, history) {
  const baseline = baselineOf(history.slice(-BASELINE_WINDOW));
  const reasons = [...probeReasons('before', before, baseline.probes), ...probeReasons('after', after, baseline.probes)];
  for (const [route, ms] of Object.entries(ttfb || {})) {
    const base = baseline.ttfb[route];
    if (typeof base === 'number' && typeof ms === 'number' && isFarAbove(ms, base)) {
      reasons.push({ kind: 'ttfb', route, value: ms, baseline: base });
    }
  }
  const hasBaseline = Object.keys(baseline.probes).length + Object.keys(baseline.ttfb).length > 0;
  const status = reasons.length ? 'degraded' : hasBaseline ? 'normal' : 'no-baseline';
  return { status, baseline, reasons };
}

function probeMedians(probes) {
  return Object.fromEntries(
    Object.entries(probes || {}).map(([name, { medianMs, samples, failures }]) => [name, { medianMs, samples, failures }])
  );
}

/** `history` with this pass appended, cut to the last BASELINE_WINDOW passes. */
function appendToHistory(history, { revision, measuredAt, before, after, ttfb }) {
  const entry = { revision, measuredAt, probes: { before: probeMedians(before), after: probeMedians(after) }, ttfb };
  return [...history, entry].slice(-BASELINE_WINDOW);
}

/** `pass` or `breach`, with ` (environment degraded)` when the environment was. */
function verdictOf(status, environmentStatus) {
  return environmentStatus === 'degraded' ? `${status} (environment degraded)` : status;
}

module.exports = { classifyEnvironment, appendToHistory, verdictOf, BASELINE_WINDOW };
