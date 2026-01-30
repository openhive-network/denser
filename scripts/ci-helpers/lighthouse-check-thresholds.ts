#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportFile = process.argv[2];
const appName = process.argv[3];

if (!reportFile || !appName) {
  console.error("Usage: tsx lighthouse-check-thresholds.ts <report.json> <app_name>");
  process.exit(1);
}

if (!fs.existsSync(reportFile)) {
  console.error(`Report file not found: ${reportFile}`);
  process.exit(1);
}

const thresholdsPath = path.join(__dirname, "lighthouse-thresholds.json");
const thresholds = JSON.parse(fs.readFileSync(thresholdsPath, "utf8")) as Record<string, Record<string, number>>;
const appThresholds = thresholds[appName];

if (!appThresholds) {
  console.error(`No thresholds defined for app: ${appName}`);
  process.exit(1);
}

interface LighthouseReport {
  categories?: Record<string, { score?: number }>;
}

const report = JSON.parse(fs.readFileSync(reportFile, "utf8")) as LighthouseReport;
const categories = report.categories || {};

let failed = false;

console.log(`\nLighthouse threshold check for "${appName}":`);
console.log("─".repeat(50));

for (const [category, threshold] of Object.entries(appThresholds)) {
  const score = Math.round((categories[category]?.score || 0) * 100);
  const pass = score >= threshold;

  if (!pass) failed = true;

  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon} ${category}: ${score} (threshold: ${threshold})`);
}

console.log("─".repeat(50));

if (failed) {
  console.error("\n❌ Lighthouse scores below thresholds — failing the job.");
  process.exit(1);
} else {
  console.log("\n✅ All Lighthouse scores meet thresholds.");
}
