#!/usr/bin/env node
/**
 * The deterministic Lighthouse pass: the integration check's routes, settings and
 * median logic, run against a site served from recorded data with no network
 * (.aidev/run-lighthouse-fixture.sh brings that site up).
 *
 * Per route (the `integration` section of lighthouse-thresholds.json) it runs
 * Lighthouse RUNS_PER_ROUTE times, keeps each run's vitals, transfer totals and
 * every request that left the allowed hosts, and takes the medians. After the
 * routes it reads the replay servers' MISS counters. Lighthouse runs as the integration
 * check runs it, without the full-page screenshot. Writes <out>/result.json in
 * the integration check's shape plus `hermetic` and, given a baseline, `comparison`
 * (lighthouse-compare.js).
 *
 * Exit: 0 hermetic, within thresholds and (with a baseline) no regression;
 *       2 any of those failed; 1 nothing measured (bad usage, unreachable site).
 *
 * Usage: node lighthouse-fixture-check.js --site http://127.0.0.1:PORT --out <dir>
 *        --allowed-host <host:port>... [--miss-counter <url>...] [--baseline <result.json>]
 *        [--revision <label>] [--fixture-set <name>] [--clock <iso>] [--runs N]
 *        [--route <path>...] [--cases <file>]
 * --miss-counter URLs answer JSON with a numeric `misses`; --cases appends
 * junit_write_cases lines (.aidev/junit-helpers.sh), one case per route.
 */

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');
const { RUNS_PER_ROUTE, runLighthouse } = require('./lighthouse-runner');
const { extractRunMetrics, summarizeRuns, findBreaches } = require('./lighthouse-median');
const { extractResourceTotals, offHostRequests } = require('./lighthouse-resources');
const { compareResults, formatComparison } = require('./lighthouse-compare');
const store = require('./lighthouse-integration-store');

// The full-page screenshot is taken after the trace, by growing the viewport to the
// whole page, which loads every lazy image: no metric reads it, and replaying it would
// need recordings of images no measured run fetches.
const LIGHTHOUSE_ARGS = ['--disable-full-page-screenshot'];

function parseOptions() {
  const { values } = parseArgs({
    options: {
      site: { type: 'string' },
      out: { type: 'string' },
      'allowed-host': { type: 'string', multiple: true, default: [] },
      'miss-counter': { type: 'string', multiple: true, default: [] },
      baseline: { type: 'string' },
      revision: { type: 'string', default: 'worktree' },
      'fixture-set': { type: 'string' },
      clock: { type: 'string' },
      runs: { type: 'string', default: String(RUNS_PER_ROUTE) },
      route: { type: 'string', multiple: true, default: [] },
      cases: { type: 'string' },
    },
  });
  const site = values.site?.replace(/\/+$/, '');
  const runs = Number(values.runs);
  if (!/^https?:\/\/[^/]/.test(site || '') || !values.out || !values['allowed-host'].length) {
    throw new Error('usage: --site http://host:port --out <dir> --allowed-host <host:port>... [--miss-counter <url>...] [--baseline <file>] [--runs N] [--route <path>...] [--cases <file>]');
  }
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`--runs must be a positive integer, got ${values.runs}`);
  if (values.baseline && !fs.existsSync(values.baseline)) throw new Error(`--baseline ${values.baseline} does not exist`);
  return { ...values, site, runs, allowedHosts: values['allowed-host'], missCounters: values['miss-counter'] };
}

function selectRoutes(only) {
  const all = JSON.parse(fs.readFileSync(path.join(__dirname, 'lighthouse-thresholds.json'), 'utf8')).integration;
  const unknown = only.filter((route) => !(route in all));
  if (unknown.length) throw new Error(`not an integration route: ${unknown.join(', ')}`);
  return Object.entries(all).filter(([route]) => !only.length || only.includes(route));
}

function runMetrics(report, error, allowedHosts) {
  if (!report) return { error };
  const metrics = extractRunMetrics(report);
  if (metrics.error) return metrics;
  return {
    ...metrics,
    ...extractResourceTotals(report),
    'benchmark-index': report.environment?.benchmarkIndex,
    offHost: offHostRequests(report, allowedHosts),
  };
}

async function measureRoute(options, route, thresholds) {
  const url = `${options.site}${route}`;
  const runs = [];
  let lighthouseVersion;
  for (let i = 0; i < options.runs; i++) {
    const { report, error } = await runLighthouse(url, LIGHTHOUSE_ARGS);
    const metrics = runMetrics(report, error, options.allowedHosts);
    if (report) metrics.report = store.saveReport(options.out, options.revision, route, i, report);
    lighthouseVersion = report?.lighthouseVersion || lighthouseVersion;
    console.log(`  ${route} run ${i + 1}/${options.runs}: ${metrics.error || `perf ${metrics.performance}, LCP ${Math.round(metrics['largest-contentful-paint'])} ms, JS ${metrics['script-transfer-bytes']} B, images ${metrics['image-transfer-bytes']} B, ${metrics['request-count']} requests`}`);
    runs.push(metrics);
  }
  const median = summarizeRuns(runs);
  const offHost = [...new Set(runs.flatMap((run) => run.offHost || []))];
  return { route, url, thresholds, median, breaches: findBreaches(median, thresholds), offHost, runs, lighthouseVersion };
}

async function readMisses(counters) {
  const misses = {};
  for (const url of counters) {
    try {
      const response = await fetch(url);
      misses[url] = (await response.json()).misses;
    } catch (err) {
      misses[url] = `unreadable: ${err.message}`;
    }
  }
  return misses;
}

function hermeticOf(routes, misses) {
  const offHost = routes.flatMap((r) => r.offHost.map((url) => ({ route: r.route, url })));
  const replayMisses = Object.entries(misses).filter(([, n]) => n !== 0);
  return { status: offHost.length || replayMisses.length ? 'leaked' : 'hermetic', offHost, misses };
}

function statusOf(routes, hermetic, comparison) {
  if (hermetic.status !== 'hermetic') return 'leaked';
  if (routes.some((r) => r.breaches.length)) return 'breach';
  return comparison?.status === 'regression' ? 'regression' : 'pass';
}

function routeCaseLines(result) {
  const lines = [];
  for (const r of result.routes) {
    const problems = [
      ...r.breaches.map((b) => `${b.metric} ${b.value} breaches ${b.threshold}`),
      ...(result.comparison?.regressions || []).filter((x) => x.route === r.route).map((x) => `${x.metric} regressed ${x.baseline} -> ${x.current}`),
      ...r.offHost.map((url) => `request left the host: ${url}`),
    ];
    lines.push(['case', r.route, problems.length ? 'fail' : 'pass', 0, problems.join('; ')].join('\t'));
    for (const metric of ['largest-contentful-paint', 'observed-largest-contentful-paint', 'total-blocking-time', 'script-transfer-bytes', 'image-transfer-bytes', 'request-count']) {
      lines.push(['property', `${r.route} ${metric}`, r.median[metric] ?? ''].join('\t'));
    }
  }
  const leakedMisses = Object.entries(result.hermetic.misses).filter(([, n]) => n !== 0);
  lines.push(['case', 'no unrecorded request reached a replay server', leakedMisses.length ? 'fail' : 'pass', 0,
    leakedMisses.map(([url, n]) => `${url}: ${n} misses`).join('; ')].join('\t'));
  return lines;
}

function printSummary(result) {
  console.log(`\nLighthouse median of ${result.runsPerRoute} on recorded data (${result.environment.fixtureSet || 'fixture'}, clock ${result.environment.clock || 'live'}):`);
  const regressed = new Set((result.comparison?.regressions || []).map((r) => r.route));
  for (const route of result.routes) {
    const m = route.median;
    const icon = route.breaches.length || route.offHost.length || regressed.has(route.route) ? '❌' : '✅';
    if (!m.measuredRuns) {
      console.log(`  ❌ ${route.route}: no successful run (${m.errors.join('; ')})`);
      continue;
    }
    console.log(`  ${icon} ${route.route}: perf ${m.performance}, LCP ${Math.round(m['largest-contentful-paint'])} ms (observed ${Math.round(m['observed-largest-contentful-paint'])} ms), TBT ${Math.round(m['total-blocking-time'])} ms, CLS ${m['cumulative-layout-shift']?.toFixed(3)}, JS ${m['script-transfer-bytes']} B, images ${m['image-transfer-bytes']} B, ${m['request-count']} requests`);
    for (const b of route.breaches) console.log(`      breach: ${b.metric} = ${b.value} (threshold ${b.threshold})${b.simulatedOnly ? `, simulated-only: observed ${Math.round(b.observed)} ms` : ''}`);
    for (const url of route.offHost) console.log(`      left the host: ${url}`);
  }
  console.log(`Hermetic: ${result.hermetic.status}; replay misses ${JSON.stringify(result.hermetic.misses)}`);
  if (result.comparison) console.log(`\n${formatComparison(result.comparison).join('\n')}`);
  else console.log('\nNo baseline: nothing compared.');
  console.log(`\n${result.status === 'pass' ? '✅' : '❌'} ${result.status}`);
}

async function main() {
  const options = parseOptions();
  const routes = selectRoutes(options.route);
  fs.mkdirSync(options.out, { recursive: true });

  const measured = [];
  for (const [route, thresholds] of routes) measured.push(await measureRoute(options, route, thresholds));
  const hermetic = hermeticOf(measured, await readMisses(options.missCounters));
  const result = {
    revision: options.revision,
    site: options.site,
    measuredAt: new Date().toISOString(),
    formFactor: 'mobile',
    runsPerRoute: options.runs,
    lighthouseVersion: measured.find((r) => r.lighthouseVersion)?.lighthouseVersion,
    environment: { mode: 'fixture', fixtureSet: options['fixture-set'], clock: options.clock },
    hermetic,
    routes: measured.map(({ lighthouseVersion: _version, ...route }) => route),
  };
  if (options.baseline) result.comparison = compareResults(result, JSON.parse(fs.readFileSync(options.baseline, 'utf8')));
  result.status = result.verdict = statusOf(result.routes, hermetic, result.comparison);

  store.writeJson(path.join(options.out, 'result.json'), result);
  if (options.cases) fs.appendFileSync(options.cases, routeCaseLines(result).join('\n') + '\n');
  printSummary(result);
  if (!measured.some((r) => r.median.measuredRuns)) return 1;
  return result.status === 'pass' ? 0 : 2;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`lighthouse-fixture-check: ${err.message}`);
    process.exit(1);
  }
);
