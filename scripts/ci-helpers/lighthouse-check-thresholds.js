#!/usr/bin/env node
/**
 * Check Lighthouse scores against defined thresholds
 * Exits with code 1 if any score falls below its threshold
 *
 * Usage: node lighthouse-check-thresholds.js <report.json> <app_name>
 */

const fs = require('fs');
const path = require('path');

const reportFile = process.argv[2];
const appName = process.argv[3];

if (!reportFile || !appName) {
  console.error('Usage: node lighthouse-check-thresholds.js <report.json> <app_name>');
  process.exit(1);
}

if (!fs.existsSync(reportFile)) {
  console.error(`Report file not found: ${reportFile}`);
  process.exit(1);
}

const thresholdsPath = path.join(__dirname, 'lighthouse-thresholds.json');
const thresholds = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
const appThresholds = thresholds[appName];

if (!appThresholds) {
  console.error(`No thresholds defined for app: ${appName}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const categories = report.categories || {};

let failed = false;

console.log(`\nLighthouse threshold check for "${appName}":`);
console.log('─'.repeat(50));

for (const [category, threshold] of Object.entries(appThresholds)) {
  const score = Math.round((categories[category]?.score || 0) * 100);
  const pass = score >= threshold;

  if (!pass) failed = true;

  const icon = pass ? '✅' : '❌';
  console.log(`  ${icon} ${category}: ${score} (threshold: ${threshold})`);
}

console.log('─'.repeat(50));

if (failed) {
  console.error('\n❌ Lighthouse scores below thresholds — failing the job.');
  process.exit(1);
} else {
  console.log('\n✅ All Lighthouse scores meet thresholds.');
}
