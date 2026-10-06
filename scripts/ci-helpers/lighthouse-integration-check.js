#!/usr/bin/env node
/**
 * Median-of-3 Lighthouse check of the integration site for one deployed revision.
 *
 * Waits until <site>/status/deployed.json reports <revision> for every app it
 * measures, then runs Lighthouse (mobile, its default form factor) RUNS_PER_ROUTE
 * times per route, one run at a time. The routes and their limits are the
 * `integration` section of lighthouse-thresholds.json. Each run keeps its vitals and
 * its backend timing (lighthouse-backend.js); the backend is probed just before and
 * just after the routes (lighthouse-probe.js), and the pass is classified against the
 * environment of the passes before it (lighthouse-environment.js). Writes
 * <out>/<revision>.json, <out>/latest.json, the full reports, the baseline and the
 * status page (lighthouse-integration-store.js).
 *
 * Exit: 0 every median within its thresholds, 2 a threshold breached (whatever the
 *       environment), 1 nothing measured (bad usage, or the revision never deployed).
 *
 * Usage: node lighthouse-integration-check.js --site https://host --revision <sha>
 *        --out <dir> --api-node <url> [--api-node <url>...] [--probe-image <url>]
 *        [--wait-timeout <seconds>]
 * The first --api-node is the node the site's server reads from, and the one probed;
 * every --api-node's host is summarized as an API host.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { parseArgs } = require('util');
const { extractRunMetrics, summarizeRuns, findBreaches } = require('./lighthouse-median');
const { extractBackendTiming, summarizeBackend, hostOf } = require('./lighthouse-backend');
const { probeTargets, probeEnvironment, DEFAULT_PROBE_IMAGE } = require('./lighthouse-probe');
const { classifyEnvironment, appendToHistory, verdictOf } = require('./lighthouse-environment');
const store = require('./lighthouse-integration-store');

const RUNS_PER_ROUTE = 3;
const DEPLOYED_POLL_MS = 15_000;
const LIGHTHOUSE_RUN_TIMEOUT_MS = 120_000;
const REVISION_PATTERN = /^[0-9a-f]{40}$/;
const CHROME_FLAGS = '--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage';

function parseOptions() {
  const { values } = parseArgs({
    options: {
      site: { type: 'string' },
      revision: { type: 'string' },
      out: { type: 'string' },
      'api-node': { type: 'string', multiple: true, default: [] },
      'probe-image': { type: 'string', default: DEFAULT_PROBE_IMAGE },
      'wait-timeout': { type: 'string', default: '600' },
    },
  });
  const site = values.site?.replace(/\/+$/, '');
  const waitSeconds = Number(values['wait-timeout']);
  const apiNodes = values['api-node'];
  const urls = [site, ...apiNodes, values['probe-image']];
  if (!REVISION_PATTERN.test(values.revision || '') || !values.out || !apiNodes.length || !urls.every((u) => /^https?:\/\/[^/]/.test(u || ''))) {
    throw new Error('usage: --site https://host --revision <40-hex sha> --out <dir> --api-node https://node [--probe-image <url>] [--wait-timeout <s>]');
  }
  if (!Number.isFinite(waitSeconds) || waitSeconds < 0) {
    throw new Error(`--wait-timeout must be a number of seconds, got ${values['wait-timeout']}`);
  }
  return {
    site,
    revision: values.revision,
    out: values.out,
    waitMs: waitSeconds * 1000,
    apiNodes,
    probeImage: values['probe-image'],
  };
}

function loadRouteThresholds() {
  const all = JSON.parse(fs.readFileSync(path.join(__dirname, 'lighthouse-thresholds.json'), 'utf8'));
  if (!all.integration || Object.keys(all.integration).length === 0) {
    throw new Error('lighthouse-thresholds.json has no `integration` routes');
  }
  return all.integration;
}

// The app serving a route is its first path segment: /blog/... or /wallet/....
function appOf(route) {
  return route.split('/')[1];
}

async function deployedRevisions(site) {
  const response = await fetch(`${site}/status/deployed.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`deployed.json answered HTTP ${response.status}`);
  const deployed = await response.json();
  return Object.fromEntries(
    Object.entries(deployed.services || {}).map(([app, service]) => [app, service?.revision])
  );
}

async function waitForRevision(site, revision, apps, waitMs) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    let seen;
    try {
      seen = await deployedRevisions(site);
      if (apps.every((app) => seen[app] === revision)) return;
    } catch (err) {
      seen = err.message;
    }
    if (Date.now() >= deadline) {
      throw new Error(`${site} did not serve ${revision} for ${apps.join(', ')} within ${waitMs / 1000}s (last seen: ${JSON.stringify(seen)})`);
    }
    await new Promise((resolve) => setTimeout(resolve, DEPLOYED_POLL_MS));
  }
}

function runLighthouse(url) {
  const args = [url, '--output=json', '--output-path=stdout', '--quiet', `--chrome-flags=${CHROME_FLAGS}`];
  return new Promise((resolve) => {
    execFile('lighthouse', args, { maxBuffer: 256 * 1024 * 1024, timeout: LIGHTHOUSE_RUN_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) {
        resolve({ report: null, error: `lighthouse failed: ${err.message.split('\n')[0]} ${stderr.trim().split('\n').pop() || ''}` });
        return;
      }
      try {
        resolve({ report: JSON.parse(stdout), error: null });
      } catch (parseErr) {
        resolve({ report: null, error: `lighthouse output is not JSON: ${parseErr.message}` });
      }
    });
  });
}

function runMetrics(report, error, upstreams) {
  if (!report) return { error };
  const metrics = extractRunMetrics(report);
  return metrics.error ? metrics : { ...metrics, backend: extractBackendTiming(report, upstreams) };
}

async function measureRoute({ site, revision, out, upstreams }, route, thresholds) {
  const url = `${site}${route}`;
  const runs = [];
  let lighthouseVersion;
  for (let i = 0; i < RUNS_PER_ROUTE; i++) {
    const { report, error } = await runLighthouse(url);
    const metrics = runMetrics(report, error, upstreams);
    if (report) metrics.report = store.saveReport(out, revision, route, i, report);
    lighthouseVersion = report?.lighthouseVersion || lighthouseVersion;
    console.log(`  ${route} run ${i + 1}/${RUNS_PER_ROUTE}: ${metrics.error || `perf ${metrics.performance}, LCP ${Math.round(metrics['largest-contentful-paint'])} ms, TTFB ${metrics.backend['server-response-time']} ms`}`);
    runs.push(metrics);
  }
  const median = summarizeRuns(runs);
  if (median.measuredRuns) median.backend = summarizeBackend(runs.filter((run) => run.backend).map((run) => run.backend));
  return { route, url, thresholds, median, breaches: findBreaches(median, thresholds), runs, lighthouseVersion };
}

function formatProbes(probes) {
  return Object.entries(probes)
    .map(([name, p]) => `${name} ${p.medianMs ?? '?'} ms${p.failures ? ` (${p.failures}/${p.samples} failed)` : ''}`)
    .join(', ');
}

function printSummary(result) {
  console.log(`\nLighthouse median of ${RUNS_PER_ROUTE} for ${result.revision} on ${result.site}:`);
  for (const route of result.routes) {
    const m = route.median;
    const icon = route.breaches.length ? '❌' : '✅';
    console.log(`  ${icon} ${route.route}: perf ${m.performance}, LCP ${Math.round(m['largest-contentful-paint'])} ms, TBT ${Math.round(m['total-blocking-time'])} ms, CLS ${m['cumulative-layout-shift']?.toFixed(3)}, JS ${Math.round((m['script-transfer-bytes'] || 0) / 1024)} KiB, TTFB ${m.backend?.['server-response-time']} ms`);
    for (const b of route.breaches) {
      console.log(`      breach: ${b.metric} = ${b.value} (threshold ${b.threshold})`);
    }
  }
  const env = result.environment;
  console.log(`\nEnvironment: ${env.status}; probes before: ${formatProbes(env.before)}; after: ${formatProbes(env.after)}`);
  for (const reason of env.reasons) console.log(`      degraded: ${JSON.stringify(reason)}`);
  console.log(result.status === 'pass' ? '\n✅ All medians meet thresholds.' : `\n❌ Thresholds breached${env.status === 'degraded' ? ' (environment degraded)' : ''} (advisory: nothing is rolled back).`);
}

function routeTtfb(routes) {
  return Object.fromEntries(routes.map((r) => [r.route, r.median.backend?.['server-response-time']]));
}

async function main() {
  const { site, revision, out, waitMs, apiNodes, probeImage } = parseOptions();
  const routeThresholds = loadRouteThresholds();
  const routes = Object.keys(routeThresholds);
  const apps = [...new Set(routes.map(appOf))];

  console.log(`Waiting for ${site}/status/deployed.json to report ${revision} for ${apps.join(', ')}...`);
  await waitForRevision(site, revision, apps, waitMs);

  fs.mkdirSync(out, { recursive: true });
  const upstreams = { origin: hostOf(site), images: hostOf(probeImage), api: apiNodes.map(hostOf) };
  const targets = probeTargets({ site, apiNode: apiNodes[0], imageUrl: probeImage });
  console.log('Probing the backend before the routes...');
  const before = await probeEnvironment(targets);
  const measured = [];
  for (const route of routes) {
    measured.push(await measureRoute({ site, revision, out, upstreams }, route, routeThresholds[route]));
  }
  console.log('Probing the backend after the routes...');
  const after = await probeEnvironment(targets);

  const ttfb = routeTtfb(measured);
  const history = store.readHistory(out);
  const environment = { before, after, ...classifyEnvironment({ before, after, ttfb }, history) };
  const status = measured.some((r) => r.breaches.length) ? 'breach' : 'pass';
  const result = {
    revision,
    site,
    measuredAt: new Date().toISOString(),
    formFactor: 'mobile',
    runsPerRoute: RUNS_PER_ROUTE,
    lighthouseVersion: measured.find((r) => r.lighthouseVersion)?.lighthouseVersion,
    status,
    verdict: verdictOf(status, environment.status),
    environment,
    routes: measured.map(({ lighthouseVersion: _version, ...route }) => route),
  };

  store.writeJson(path.join(out, `${revision}.json`), result);
  store.writeJson(path.join(out, 'latest.json'), result);
  store.writeHistory(out, appendToHistory(history, { revision, measuredAt: result.measuredAt, before, after, ttfb }));
  store.writeStatusPage(out, revision);
  store.pruneReports(out, revision);
  printSummary(result);
  return result.status === 'pass' ? 0 : 2;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`lighthouse-integration-check: ${err.message}`);
    process.exit(1);
  }
);
