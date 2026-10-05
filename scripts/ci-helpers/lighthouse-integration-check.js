#!/usr/bin/env node
/**
 * Median-of-3 Lighthouse check of the integration site for one deployed revision.
 *
 * Waits until <site>/status/deployed.json reports <revision> for every app it
 * measures, then runs Lighthouse (mobile, its default form factor) RUNS_PER_ROUTE
 * times per route, one run at a time. The routes and their limits are the
 * `integration` section of lighthouse-thresholds.json. Writes <out>/<revision>.json
 * and <out>/latest.json.
 *
 * Exit: 0 every median within its thresholds, 2 a threshold breached,
 *       1 nothing measured (bad usage, or the revision never deployed).
 *
 * Usage: node lighthouse-integration-check.js --site https://host --revision <sha>
 *        --out <dir> [--wait-timeout <seconds>]
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { parseArgs } = require('util');
const { extractRunMetrics, summarizeRuns, findBreaches } = require('./lighthouse-median');

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
      'wait-timeout': { type: 'string', default: '600' },
    },
  });
  const site = values.site?.replace(/\/+$/, '');
  const waitSeconds = Number(values['wait-timeout']);
  if (!site || !/^https?:\/\//.test(site) || !REVISION_PATTERN.test(values.revision || '') || !values.out) {
    throw new Error('usage: --site https://host --revision <40-hex sha> --out <dir> [--wait-timeout <s>]');
  }
  if (!Number.isFinite(waitSeconds) || waitSeconds < 0) {
    throw new Error(`--wait-timeout must be a number of seconds, got ${values['wait-timeout']}`);
  }
  return { site, revision: values.revision, out: values.out, waitMs: waitSeconds * 1000 };
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

async function measureRoute(site, route, thresholds) {
  const url = `${site}${route}`;
  const runs = [];
  let lighthouseVersion;
  for (let i = 0; i < RUNS_PER_ROUTE; i++) {
    const { report, error } = await runLighthouse(url);
    const metrics = report ? extractRunMetrics(report) : { error };
    lighthouseVersion = report?.lighthouseVersion || lighthouseVersion;
    console.log(`  ${route} run ${i + 1}/${RUNS_PER_ROUTE}: ${metrics.error || `perf ${metrics.performance}, LCP ${Math.round(metrics['largest-contentful-paint'])} ms`}`);
    runs.push(metrics);
  }
  const median = summarizeRuns(runs);
  return { route, url, thresholds, median, breaches: findBreaches(median, thresholds), runs, lighthouseVersion };
}

function writeAtomically(file, data) {
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(`${file}.tmp`, file);
}

function printSummary(result) {
  console.log(`\nLighthouse median of ${RUNS_PER_ROUTE} for ${result.revision} on ${result.site}:`);
  for (const route of result.routes) {
    const m = route.median;
    const icon = route.breaches.length ? '❌' : '✅';
    console.log(`  ${icon} ${route.route}: perf ${m.performance}, LCP ${Math.round(m['largest-contentful-paint'])} ms, TBT ${Math.round(m['total-blocking-time'])} ms, CLS ${m['cumulative-layout-shift']?.toFixed(3)}, JS ${Math.round((m['script-transfer-bytes'] || 0) / 1024)} KiB`);
    for (const b of route.breaches) {
      console.log(`      breach: ${b.metric} = ${b.value} (threshold ${b.threshold})`);
    }
  }
  console.log(result.status === 'pass' ? '\n✅ All medians meet thresholds.' : '\n❌ Thresholds breached (advisory: nothing is rolled back).');
}

async function main() {
  const { site, revision, out, waitMs } = parseOptions();
  const routeThresholds = loadRouteThresholds();
  const routes = Object.keys(routeThresholds);
  const apps = [...new Set(routes.map(appOf))];

  console.log(`Waiting for ${site}/status/deployed.json to report ${revision} for ${apps.join(', ')}...`);
  await waitForRevision(site, revision, apps, waitMs);

  const measured = [];
  for (const route of routes) {
    measured.push(await measureRoute(site, route, routeThresholds[route]));
  }
  const result = {
    revision,
    site,
    measuredAt: new Date().toISOString(),
    formFactor: 'mobile',
    runsPerRoute: RUNS_PER_ROUTE,
    lighthouseVersion: measured.find((r) => r.lighthouseVersion)?.lighthouseVersion,
    status: measured.some((r) => r.breaches.length) ? 'breach' : 'pass',
    routes: measured.map(({ lighthouseVersion: _version, ...route }) => route),
  };

  fs.mkdirSync(out, { recursive: true });
  writeAtomically(path.join(out, `${revision}.json`), result);
  writeAtomically(path.join(out, 'latest.json'), result);
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
