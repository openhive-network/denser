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
