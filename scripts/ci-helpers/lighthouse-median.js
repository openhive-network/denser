#!/usr/bin/env node
/**
 * Pick the median Lighthouse run (by performance score) out of N runs and
 * promote it to the canonical report paths the rest of the pipeline consumes.
 *
 * A single cold Lighthouse run is noisy (we have observed the same commit score
 * anywhere from 70 to 86). Taking the median of several runs removes cold-start
 * and network-jitter outliers so the threshold check and the MR comment reflect
 * a stable number.
 *
 * Reads:  <app>-lh-run-1.report.json ... <app>-lh-run-N.report.json (+ .html)
 * Writes: <app>-lighthouse.report.json and <app>-lighthouse.report.html
 *
 * Usage: node lighthouse-median.js <app_name> <num_runs>
 */

const fs = require('fs');

const app = process.argv[2];
const runs = parseInt(process.argv[3], 10);

if (!app || !Number.isInteger(runs) || runs < 1) {
  console.error('Usage: node lighthouse-median.js <app_name> <num_runs>');
  process.exit(1);
}

const candidates = [];
for (let i = 1; i <= runs; i++) {
  const jsonPath = `${app}-lh-run-${i}.report.json`;
  if (!fs.existsSync(jsonPath)) {
    console.warn(`Run ${i} report missing (${jsonPath}) — skipping.`);
    continue;
  }
  try {
    const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const perf = report.categories?.performance?.score;
    if (typeof perf !== 'number') {
      console.warn(`Run ${i} has no performance score — skipping.`);
      continue;
    }
    candidates.push({ i, perf, jsonPath, htmlPath: `${app}-lh-run-${i}.report.html` });
  } catch (e) {
    console.warn(`Run ${i} report unreadable — skipping: ${e.message}`);
  }
}

if (candidates.length === 0) {
  console.error('No usable Lighthouse runs found — cannot compute median.');
  process.exit(1);
}

// Sort ascending by performance, pick the middle element (lower-middle for even counts).
candidates.sort((a, b) => a.perf - b.perf);
const median = candidates[Math.floor((candidates.length - 1) / 2)];

console.log(`\nLighthouse runs for "${app}" (performance, sorted):`);
for (const c of candidates) {
  const mark = c === median ? ' ← median (promoted)' : '';
  console.log(`  run ${c.i}: ${Math.round(c.perf * 100)}${mark}`);
}
console.log(`Spread: ${Math.round(candidates[0].perf * 100)}–${Math.round(candidates[candidates.length - 1].perf * 100)} across ${candidates.length} run(s).`);

fs.copyFileSync(median.jsonPath, `${app}-lighthouse.report.json`);
if (fs.existsSync(median.htmlPath)) {
  fs.copyFileSync(median.htmlPath, `${app}-lighthouse.report.html`);
}
console.log(`Promoted run ${median.i} to ${app}-lighthouse.report.{json,html}\n`);
