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

// --- Page-weight diagnostics: does wax.common.wasm still download? (job log only) ---
try {
  const audits = report.audits || {};
  const classify = (url) => {
    if (/\.wasm(\?|$)/i.test(url)) return 'wasm';
    if (/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url) || /images\.hive\.blog/i.test(url)) return 'image';
    if (/\.js(\?|$)/i.test(url) || /_next\/static\/chunks/i.test(url)) return 'js';
    if (/\.css(\?|$)/i.test(url)) return 'css';
    if (/\.(woff2?|ttf|otf)(\?|$)/i.test(url)) return 'font';
    return 'other';
  };
  const items = audits['total-byte-weight']?.details?.items || [];
  const sums = {};
  for (const it of items) {
    const c = classify(it.url || '');
    sums[c] = (sums[c] || 0) + (it.totalBytes || 0);
  }
  console.log('\n── Page weight by type (top requests) ──────────');
  for (const [c, b] of Object.entries(sums).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(Math.round(b / 1024)).padStart(6)} kB  ${c}`);
  }
  console.log('  heaviest requests:');
  items
    .slice()
    .sort((a, b) => (b.totalBytes || 0) - (a.totalBytes || 0))
    .slice(0, 10)
    .forEach((it) => console.log(`    ${String(Math.round((it.totalBytes || 0) / 1024)).padStart(5)} kB  [${classify(it.url || '')}]  ${(it.url || '').slice(0, 80)}`));
  const wasm = items.filter((it) => /\.wasm/i.test(it.url || ''));
  console.log(`\n  wax/WASM downloaded on this page: ${wasm.length ? wasm.map((w) => Math.round((w.totalBytes || 0) / 1024) + 'kB').join(', ') : 'NONE ✅'}`);
  console.log('────────────────────────────────────────────────');
} catch (e) {
  console.warn('Page-weight diagnostics failed (non-fatal):', e.message);
}
