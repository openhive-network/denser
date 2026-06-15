#!/usr/bin/env node
/**
 * Convert Lighthouse JSON report to GitLab metrics format (OpenMetrics/Prometheus)
 * Usage: node lighthouse-metrics.js <report.json> [app_name]
 */

const fs = require('fs');

const reportFile = process.argv[2] || 'lighthouse.report.json';
const appName = process.argv[3] || process.env.TURBO_APP_NAME || 'app';
const metricsFile = 'metrics.txt';

if (!fs.existsSync(reportFile)) {
  console.error(`Report file not found: ${reportFile}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const lines = [];

// Category scores (0-100)
const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
for (const category of categories) {
  const score = Math.round((report.categories?.[category]?.score || 0) * 100);
  lines.push(`lighthouse_score{category="${category}",app="${appName}"} ${score}`);
}

// Core Web Vitals
const metrics = {
  'first-contentful-paint': 'lighthouse_fcp_ms',
  'largest-contentful-paint': 'lighthouse_lcp_ms',
  'total-blocking-time': 'lighthouse_tbt_ms',
  'cumulative-layout-shift': 'lighthouse_cls',
  'speed-index': 'lighthouse_speed_index_ms',
  'interactive': 'lighthouse_tti_ms',
};

for (const [auditId, metricName] of Object.entries(metrics)) {
  const value = report.audits?.[auditId]?.numericValue;
  if (value !== undefined) {
    const formatted = metricName === 'lighthouse_cls' ? value.toFixed(4) : Math.round(value);
    lines.push(`${metricName}{app="${appName}"} ${formatted}`);
  }
}

fs.writeFileSync(metricsFile, lines.join('\n') + '\n');
console.log(`Metrics written to ${metricsFile}`);
console.log(lines.join('\n'));

// --- LCP phase breakdown: pinpoint whether LCP is gated by TTFB, load or render ---
// (job log only). Confirms the dominant driver of the failing LCP metric.
try {
  const audits = report.audits || {};
  const ms = (id) => audits[id]?.numericValue;
  const ttfb = ms('server-response-time'); // document Time To First Byte
  const fcp = ms('first-contentful-paint');
  const lcp = ms('largest-contentful-paint');

  console.log('\n── LCP phase breakdown ─────────────────────────');
  const row = (label, v) => console.log(`  ${label.padEnd(26)} ${v === undefined ? 'n/a' : Math.round(v) + ' ms'}`);
  row('TTFB (server response)', ttfb);
  row('FCP', fcp);
  row('LCP', lcp);
  if (ttfb !== undefined && fcp !== undefined && lcp !== undefined) {
    const preFcp = Math.max(0, fcp - ttfb);
    const fcpToLcp = Math.max(0, lcp - fcp);
    console.log('  ── derived phases ──');
    row('  1. TTFB (wait for server)', ttfb);
    row('  2. TTFB→FCP (download/parse)', preFcp);
    row('  3. FCP→LCP (load/render delay)', fcpToLcp);
    const phases = [['TTFB', ttfb], ['TTFB→FCP', preFcp], ['FCP→LCP', fcpToLcp]].sort((a, b) => b[1] - a[1]);
    console.log(`  ➜ dominant LCP phase: ${phases[0][0]} (${Math.round(phases[0][1])} ms, ${Math.round((phases[0][1] / lcp) * 100)}% of LCP)`);
  }

  // Try the audit-provided phase table too (more precise when LCP element is reported)
  const lcpEl = audits['largest-contentful-paint-element'];
  const phaseTable = lcpEl?.details?.items?.find((i) => Array.isArray(i?.items) && i.items.some((x) => x?.phase));
  if (phaseTable) {
    console.log('  ── audit-reported phases ──');
    for (const p of phaseTable.items) console.log(`     ${String(p.phase).padEnd(14)} ${Math.round(p.timing)} ms (${Math.round((p.percent || 0) * 100)}%)`);
  }

  // Likely culprits for a slow FCP→LCP on a text element
  for (const id of ['font-display', 'render-blocking-insight', 'render-blocking-resources', 'lcp-discovery-insight', 'network-server-latency']) {
    const a = audits[id];
    if (!a) continue;
    const score = a.score === null || a.score === undefined ? 'n/a' : a.score === 1 ? 'PASS' : Math.round(a.score * 100) + '/100';
    const saved = a.details?.overallSavingsMs ? ` (~${Math.round(a.details.overallSavingsMs)}ms)` : '';
    console.log(`  ${score.padStart(8)}  ${id}${a.displayValue ? ` — ${a.displayValue}` : ''}${saved}`);
  }
  console.log('────────────────────────────────────────────────');
} catch (e) {
  console.warn('LCP phase diagnostics failed (non-fatal):', e.message);
}
