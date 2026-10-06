/**
 * The files of the integration Lighthouse check under its output directory:
 *   <revision>.json, latest.json    the results
 *   reports/<revision>/*.json.gz    each run's full Lighthouse report, latest revision only
 *   environment-baseline.json       the environment of the last passes, for the baseline
 *   index.html                      the status page
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { renderStatusPage } = require('./lighthouse-status-page');

const REPORTS_DIR = 'reports';
const BASELINE_FILE = 'environment-baseline.json';
const STATUS_PAGE_PASSES = 10;
const RESULT_FILE = /^[0-9a-f]{40}\.json$/;

function writeAtomically(file, content) {
  fs.writeFileSync(`${file}.tmp`, content);
  fs.renameSync(`${file}.tmp`, file);
}

function writeJson(file, data) {
  writeAtomically(file, JSON.stringify(data, null, 2) + '\n');
}

/** Saves one run's report gzip'd; returns its path relative to `out`. */
function saveReport(out, revision, route, runIndex, report) {
  const slug = route.replace(/^\/+/, '').replace(/[^A-Za-z0-9._-]+/g, '_');
  const relative = `${REPORTS_DIR}/${revision}/${slug}-run${runIndex + 1}.json.gz`;
  fs.mkdirSync(path.join(out, REPORTS_DIR, revision), { recursive: true });
  writeAtomically(path.join(out, relative), zlib.gzipSync(JSON.stringify(report)));
  return relative;
}

/** Removes the reports of every revision but `revision`. */
function pruneReports(out, revision) {
  const dir = path.join(out, REPORTS_DIR);
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    if (entry !== revision) fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

/** The baseline history (oldest first), or none before the first pass that kept one. */
function readHistory(out) {
  const file = path.join(out, BASELINE_FILE);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).passes || [];
}

function writeHistory(out, passes) {
  writeJson(path.join(out, BASELINE_FILE), { passes });
}

/** Rewrites index.html from the newest STATUS_PAGE_PASSES result files. */
function writeStatusPage(out, reportsRevision) {
  const results = fs
    .readdirSync(out)
    .filter((name) => RESULT_FILE.test(name))
    .map((name) => JSON.parse(fs.readFileSync(path.join(out, name), 'utf8')))
    .sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)))
    .slice(0, STATUS_PAGE_PASSES);
  writeAtomically(path.join(out, 'index.html'), renderStatusPage(results, reportsRevision));
}

module.exports = { writeJson, saveReport, pruneReports, readHistory, writeHistory, writeStatusPage };
