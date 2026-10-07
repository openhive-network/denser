/**
 * The integration Lighthouse status page: one section per pass, newest first, with
 * its verdict, its environment block (probes before and after, baseline, why it was
 * degraded) and per route the median vitals, the simulated LCP next to the observed
 * paints (each with its runs), TTFB, LCP breakdown and upstream hosts.
 * A pure function of the parsed result files; every field may be missing, as it is
 * in result files written before it existed.
 */

const { SIMULATED_ONLY_OBSERVED_LCP_MS } = require('./lighthouse-median');

const PROBE_NAMES = ['api', 'images', 'origin'];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function ms(value) {
  return typeof value === 'number' ? `${Math.round(value)} ms` : '—';
}

function kib(value) {
  return typeof value === 'number' ? `${Math.round(value / 1024)} KiB` : '—';
}

function plain(value) {
  return value === undefined || value === null ? '—' : escapeHtml(value);
}

function probeCell(probe) {
  if (!probe) return '—';
  const failures = probe.failures ? ` <span class="bad">${probe.failures}/${probe.samples} failed</span>` : '';
  return `${ms(probe.medianMs)}${failures}`;
}

function reasonText(reason) {
  const where = reason.kind === 'ttfb' ? `TTFB of ${reason.route}` : `${reason.name} probe ${reason.phase}`;
  const value = typeof reason.value === 'number' ? ms(reason.value) : reason.value;
  return escapeHtml(`${where}: ${value} (baseline ${ms(reason.baseline)})`);
}

function renderEnvironment(environment) {
  if (!environment) return '<p class="muted">No environment probes in this result.</p>';
  const baseline = environment.baseline?.probes || {};
  const rows = PROBE_NAMES.map(
    (name) =>
      `<tr><th>${name}</th><td>${probeCell(environment.before?.[name])}</td><td>${probeCell(environment.after?.[name])}</td><td>${ms(baseline[name])}</td></tr>`
  ).join('');
  const reasons = (environment.reasons || []).map((r) => `<li>${reasonText(r)}</li>`).join('');
  const status = environment.status === 'degraded' ? `<span class="bad">degraded</span>` : plain(environment.status);
  return `<p>Environment: ${status} (baseline of ${plain(environment.baseline?.passes)} earlier passes)</p>
<table><tr><th>probe</th><th>before</th><th>after</th><th>baseline</th></tr>${rows}</table>
${reasons ? `<ul>${reasons}</ul>` : ''}`;
}

function renderHosts(hosts) {
  const entries = Object.entries(hosts || {});
  if (!entries.length) return '—';
  return entries
    .map(([host, h]) => `${escapeHtml(host)}: ${plain(h.requests)} req, ${kib(h.transferBytes)}, ${ms(h.medianMs)} median / ${ms(h.maxMs)} max`)
    .join('<br>');
}

function renderLcp(backend) {
  if (!backend) return '—';
  const parts = `TTFB ${ms(backend['lcp-ttfb'])}, delay ${ms(backend['lcp-resource-load-delay'])}, load ${ms(backend['lcp-resource-load-duration'])}, render ${ms(backend['lcp-element-render-delay'])}`;
  const resource = backend['lcp-resource'];
  const from = resource ? `<br>${plain(resource.host)}: ${kib(resource.transferBytes)} in ${ms(resource.durationMs)}` : '';
  return parts + from;
}

// The median, and under it each run's value: the spread is what tells a simulation
// artifact from a slow page.
function withRuns(median, runs, metric) {
  const values = (runs || []).filter((run) => !run.error).map((run) => run[metric]);
  if (!values.some((v) => typeof v === 'number')) return ms(median);
  return `${ms(median)}<br><span class="muted">runs: ${values.map(ms).join(', ')}</span>`;
}

function breachText(b) {
  const label = b.simulatedOnly ? ` <span class="sim">simulated-only: observed ${ms(b.observed)}</span>` : '';
  return `<span class="bad">${escapeHtml(b.metric)} = ${plain(b.value)} (threshold ${plain(b.threshold)})</span>${label}`;
}

function renderReports(route) {
  const links = (route.runs || [])
    .map((run, i) => (run.report ? `<a href="${escapeHtml(run.report)}">run ${i + 1}</a>` : ''))
    .filter(Boolean);
  return links.length ? `<br>reports: ${links.join(' ')}` : '';
}

function renderRoute(route, withReports) {
  const m = route.median || {};
  const backend = m.backend;
  const breaches = (route.breaches || []).map(breachText);
  const cls = typeof m['cumulative-layout-shift'] === 'number' ? m['cumulative-layout-shift'].toFixed(3) : '—';
  return `<tr class="${breaches.length ? 'breach' : ''}"><td>${plain(route.route)}${withReports ? renderReports(route) : ''}${breaches.length ? `<br>${breaches.join('<br>')}` : ''}</td>
<td>${plain(m.performance)}</td><td>${withRuns(m['largest-contentful-paint'], route.runs, 'largest-contentful-paint')}</td>
<td>${withRuns(m['observed-largest-contentful-paint'], route.runs, 'observed-largest-contentful-paint')}</td>
<td>${withRuns(m['observed-first-contentful-paint'], route.runs, 'observed-first-contentful-paint')}</td><td>${ms(m['total-blocking-time'])}</td><td>${cls}</td>
<td>${kib(m['script-transfer-bytes'])}</td><td>${ms(backend?.['server-response-time'])}</td><td>${renderLcp(backend)}</td>
<td>${kib(backend?.['image-transfer-bytes'])}</td><td>${renderHosts(backend?.hosts)}</td></tr>`;
}

function renderPass(result, reportsRevision) {
  const verdict = result.verdict || result.status;
  const verdictClass = result.status === 'pass' ? 'ok' : 'bad';
  return `<section>
<h2><code>${plain(result.revision)}</code> <span class="${verdictClass}">${plain(verdict)}</span></h2>
<p class="muted">${plain(result.measuredAt)} · ${plain(result.formFactor)} · median of ${plain(result.runsPerRoute)} · Lighthouse ${plain(result.lighthouseVersion)}</p>
${renderEnvironment(result.environment)}
<table><tr><th>route</th><th>perf</th><th>LCP (simulated)</th><th>LCP (observed)</th><th>FCP (observed)</th><th>TBT</th><th>CLS</th><th>JS</th><th>TTFB</th><th>LCP breakdown</th><th>images</th><th>upstream hosts</th></tr>
${(result.routes || []).map((route) => renderRoute(route, result.revision === reportsRevision)).join('\n')}</table>
</section>`;
}

/**
 * The HTML page for `results`, the parsed result files, newest first. Runs of
 * `reportsRevision`, the one revision whose full reports are kept, link them.
 */
function renderStatusPage(results, reportsRevision) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Lighthouse integration check</title>
<style>
body{font:14px/1.4 system-ui,sans-serif;margin:1.5rem;color:#222}
table{border-collapse:collapse;margin:.5rem 0}th,td{border:1px solid #ccc;padding:.25rem .5rem;text-align:left;vertical-align:top}
.ok{color:#176f2c}.bad{color:#b00020}.muted{color:#666}.sim{color:#8a5a00}tr.breach{background:#fff4f4}
</style></head><body>
<h1>Lighthouse integration check</h1>
<p class="muted">Raw results: <a href="latest.json">latest.json</a>. Full Lighthouse reports (gzip'd JSON) are kept for the latest revision only.
Thresholds judge the simulated LCP (slow 4G); the observed paints are what the run's browser drew. An LCP breach whose median observed LCP is under ${SIMULATED_ONLY_OBSERVED_LCP_MS / 1000} s is marked simulated-only.</p>
${results.length ? results.map((result) => renderPass(result, reportsRevision)).join('\n') : '<p>No passes measured yet.</p>'}
</body></html>
`;
}

module.exports = { renderStatusPage };
