const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadRouteThresholds, routeModes, measureRoute, routeTtfb } = require('./lighthouse-integration-check');
const { RUNS_PER_ROUTE } = require('./lighthouse-runner');

// Lighthouse 13.5 mobile runs of /trending, cut down to the audits the checks read:
// logged out on recorded data, and logged in as blocktrades on the dev server
// (`next dev`, so its bytes are not production's) with the wax WASM.
const loggedOutReport = require('./fixtures/lighthouse-report-trending.json');
const loggedInReport = require('./fixtures/lighthouse-report-trending-logged-in.json');

const REV = 'c'.repeat(40);

function tempOut(t) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'lighthouse-check-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  return out;
}

const AI_SEARCH = '/blog/search?ai=hive%20hardfork%20changes';

test('the logged-out routes are measured in their order, and the logged-in-only ones after them', () => {
  const thresholds = loadRouteThresholds('blocktrades');
  const routes = routeModes(thresholds);
  const loggedOut = Object.keys(thresholds.loggedOut);
  const loggedOutOnly = ['/blog/search?q=hardfork', '/blog/login'];
  assert.deepEqual(
    routes.slice(0, loggedOut.length),
    loggedOut.map((route) => ({ route, modes: loggedOutOnly.includes(route) ? ['loggedOut'] : ['loggedOut', 'loggedIn'] }))
  );
  assert.ok(loggedOut.includes(AI_SEARCH) && loggedOut.includes('/blog/communities'));
  assert.deepEqual(routes.slice(loggedOut.length), [
    { route: '/blog/@blocktrades', modes: ['loggedIn'] },
    { route: '/blog/@blocktrades/notifications', modes: ['loggedIn'] },
    { route: '/wallet/@blocktrades/transfers', modes: ['loggedIn'] },
    { route: '/blog/for-you', modes: ['loggedIn'] },
  ]);
});

test('the TTFB baseline takes the logged-out routes but an AI search, whose TTFB is hivesense\'s cache', () => {
  const route = (path, mode, ms) => ({ route: path, mode, median: { backend: { 'server-response-time': ms } } });
  assert.deepEqual(
    routeTtfb([
      route('/blog/trending', 'loggedOut', 2),
      route('/blog/trending', 'loggedIn', 68),
      route(AI_SEARCH, 'loggedOut', 1890),
      route('/blog/search?q=hardfork', 'loggedOut', 1170),
    ]),
    { '/blog/trending': 2, '/blog/search?q=hardfork': 1170 }
  );
});

test('a route alternates its logged-out and logged-in runs, and keeps a result per mode', async (t) => {
  const out = tempOut(t);
  const calls = [];
  const run = async (url, mode) => {
    calls.push(mode);
    return { report: mode === 'loggedIn' ? loggedInReport : loggedOutReport, error: null };
  };
  const route = '/trending';
  const thresholds = {
    loggedOut: { [route]: { 'wasm-transfer-bytes': 0 } },
    loggedIn: { [route]: { 'wasm-transfer-bytes': 1000000 } },
  };
  const upstreams = { origin: '127.0.0.1:53655', images: 'images.hive.blog', api: ['api.hive.blog'] };

  const { lighthouseVersion, results } = await measureRoute(
    { site: 'http://127.0.0.1:53655', revision: REV, out, upstreams, run },
    { route, modes: ['loggedOut', 'loggedIn'] },
    thresholds
  );

  assert.deepEqual(calls, Array.from({ length: RUNS_PER_ROUTE }, () => ['loggedOut', 'loggedIn']).flat());
  assert.equal(lighthouseVersion, '13.5.0');
  assert.deepEqual(results.map((r) => [r.route, r.mode, r.runs.length]), [
    [route, 'loggedOut', RUNS_PER_ROUTE],
    [route, 'loggedIn', RUNS_PER_ROUTE],
  ]);
  const [loggedOut, loggedIn] = results;
  assert.equal(loggedOut.median['wasm-transfer-bytes'], 0);
  assert.equal(loggedIn.median['wasm-transfer-bytes'], 2452652);
  assert.deepEqual(loggedOut.breaches, []);
  assert.deepEqual(loggedIn.breaches, [{ metric: 'wasm-transfer-bytes', value: 2452652, threshold: 1000000 }]);
  assert.equal(loggedIn.runs[0].report, `reports/${REV}/trending-loggedIn-run1.json.gz`);
  assert.equal(loggedOut.runs[0].report, `reports/${REV}/trending-run1.json.gz`);
  assert.equal(fs.readdirSync(path.join(out, 'reports', REV)).length, 2 * RUNS_PER_ROUTE);
});
