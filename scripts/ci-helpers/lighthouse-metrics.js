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

// --- LCP / performance diagnostics (printed to the job log only) ---
// Helps pinpoint *which* element drives LCP and which opportunities cost the most.
try {
  const audits = report.audits || {};

  // Robustly find the LCP element node anywhere in the audit details tree
  const lcpEl = audits['largest-contentful-paint-element'];
  const findNode = (v) => {
    if (!v || typeof v !== 'object') return null;
    if (v.type === 'node' && (v.snippet || v.selector)) return v;
    if (v.node && (v.node.snippet || v.node.selector)) return v.node;
    for (const k of Object.keys(v)) {
      const r = findNode(v[k]);
      if (r) return r;
    }
    return null;
  };
  const node = findNode(lcpEl?.details);
  console.log('\n── LCP diagnostics ─────────────────────────────');
  if (node) {
    console.log(`LCP element: ${node.nodeLabel || ''}`);
    console.log(`  selector: ${node.selector || ''}`);
    console.log(`  snippet:  ${(node.snippet || '').slice(0, 200)}`);
  } else {
    console.log('LCP element: (not reported)');
  }

  // LCP phase breakdown (TTFB / load delay / load time / render delay)
  const phases = lcpEl?.details?.items?.find((i) => Array.isArray(i?.items) && i.items.some((x) => x?.phase));
  if (phases) {
    for (const p of phases.items) {
      console.log(`  ${p.phase}: ${Math.round(p.timing)}ms (${Math.round((p.percent || 0) * 100)}%)`);
    }
  }

  // Top opportunities by estimated savings (only real "opportunity" audits,
  // not metric audits whose numericValue is the metric itself)
  const ops = Object.values(audits)
    .filter((a) => a && a.details && a.score !== 1 && a.details.overallSavingsMs > 0)
    .map((a) => ({
      title: a.title,
      savingsMs: Math.round(a.details.overallSavingsMs),
      display: a.displayValue || ''
    }))
    .sort((a, b) => b.savingsMs - a.savingsMs)
    .slice(0, 8);

  console.log('\n── Top opportunities (est. ms) ─────────────────');
  for (const o of ops) {
    console.log(`  ~${String(o.savingsMs).padStart(5)}ms  ${o.title}${o.display ? ` — ${o.display}` : ''}`);
  }

  // Definitive image-vs-JS breakdown from total-byte-weight (always present in LH12).
  const fmt = (s) => (s === null || s === undefined ? 'n/a' : s === 1 ? 'PASS' : Math.round(s * 100) + '/100');
  const classify = (url) => {
    if (/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url) || /images\.hive\.blog/i.test(url)) return 'image';
    if (/\.js(\?|$)/i.test(url) || /_next\/static\/chunks/i.test(url)) return 'js';
    if (/\.css(\?|$)/i.test(url)) return 'css';
    if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url)) return 'font';
    return 'other';
  };
  const byteItems = audits['total-byte-weight']?.details?.items || [];
  const sums = {};
  for (const it of byteItems) {
    const c = classify(it.url || '');
    sums[c] = (sums[c] || 0) + (it.totalBytes || 0);
  }
  console.log('\n── Page weight by type (top requests) ──────────');
  for (const [c, b] of Object.entries(sums).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(Math.round(b / 1024)).padStart(6)} kB  ${c}`);
  }
  console.log('  heaviest individual requests:');
  byteItems
    .slice()
    .sort((a, b) => (b.totalBytes || 0) - (a.totalBytes || 0))
    .slice(0, 12)
    .forEach((it) => {
      console.log(
        `    ${String(Math.round((it.totalBytes || 0) / 1024)).padStart(5)} kB  [${classify(it.url || '')}]  ${(it.url || '').slice(0, 80)}`
      );
    });

  // List which LCP/image/cache audit ids this LH version actually exposes + scores
  const watchRe = /(lcp|image|cache|preconnect|byte|render-blocking|unused|font-display)/i;
  console.log('\n── Relevant audit scores (LH12 ids) ────────────');
  for (const [id, a] of Object.entries(audits)) {
    if (!watchRe.test(id) || !a || a.scoreDisplayMode === 'manual') continue;
    if (a.score === 1 && !a.displayValue) continue; // skip clean, info-less passes
    console.log(`  ${fmt(a.score).padStart(8)}  ${id}${a.displayValue ? ` — ${a.displayValue}` : ''}`);
  }
  console.log('────────────────────────────────────────────────');
} catch (e) {
  console.warn('LCP diagnostics failed (non-fatal):', e.message);
}
