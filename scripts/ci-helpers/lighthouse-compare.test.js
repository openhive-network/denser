const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compareResults, formatComparison } = require('./lighthouse-compare');

function result(routes, extra = {}) {
  return {
    revision: 'base',
    measuredAt: '2026-10-06T00:00:00.000Z',
    routes: Object.entries(routes).map(([route, median]) => ({ route, median: { measuredRuns: 3, ...median } })),
    ...extra,
  };
}

const TRENDING = {
  performance: 60,
  'largest-contentful-paint': 3000,
  'total-blocking-time': 400,
  'cumulative-layout-shift': 0.01,
  'script-transfer-bytes': 700000,
  'image-transfer-bytes': 300000,
  'total-transfer-bytes': 1200000,
  'request-count': 60,
};

test('an identical pass compares clean, metric by metric', () => {
  const comparison = compareResults(result({ '/blog/trending': TRENDING }), result({ '/blog/trending': TRENDING }));
  assert.equal(comparison.status, 'pass');
  assert.deepEqual(comparison.regressions, []);
  assert.deepEqual(comparison.baseline, { revision: 'base', measuredAt: '2026-10-06T00:00:00.000Z' });
  const js = comparison.routes[0].metrics['script-transfer-bytes'];
  assert.deepEqual(js, { baseline: 700000, current: 700000, delta: 0, limit: 14000, regressed: false });
});

test('100 KB more eager JavaScript on /trending is a regression; CPU-noise-sized LCP and TBT moves are not', () => {
  const current = result({
    '/blog/trending': {
      ...TRENDING,
      'script-transfer-bytes': TRENDING['script-transfer-bytes'] + 100 * 1024,
      'total-transfer-bytes': TRENDING['total-transfer-bytes'] + 100 * 1024,
      'largest-contentful-paint': 3600,
      'total-blocking-time': 590,
    },
  });
  const comparison = compareResults(current, result({ '/blog/trending': TRENDING }));
  assert.equal(comparison.status, 'regression');
  assert.deepEqual(
    comparison.regressions.map((r) => r.metric),
    ['script-transfer-bytes', 'total-transfer-bytes']
  );
  assert.equal(comparison.regressions[0].delta, 102400);
});

test('bytes within 2% and a request more are within tolerance; three requests more are not', () => {
  const within = compareResults(
    result({ '/blog/trending': { ...TRENDING, 'image-transfer-bytes': 305000, 'request-count': 61 } }),
    result({ '/blog/trending': TRENDING })
  );
  assert.equal(within.status, 'pass');
  const beyond = compareResults(result({ '/blog/trending': { ...TRENDING, 'request-count': 63 } }), result({ '/blog/trending': TRENDING }));
  assert.deepEqual(beyond.regressions.map((r) => [r.metric, r.delta]), [['request-count', 3]]);
});

test('a performance score is a regression when it drops, never when it rises', () => {
  const drop = compareResults(result({ '/blog/trending': { ...TRENDING, performance: 45 } }), result({ '/blog/trending': TRENDING }));
  assert.deepEqual(drop.regressions.map((r) => r.metric), ['performance']);
  const rise = compareResults(result({ '/blog/trending': { ...TRENDING, performance: 90 } }), result({ '/blog/trending': TRENDING }));
  assert.equal(rise.status, 'pass');
});

test('on a host more than 15% slower than the baseline, CPU-bound regressions are advisory; byte regressions still count', () => {
  const baseline = result({ '/wallet/@gtg/transfers': { ...TRENDING, 'benchmark-index': 2900 } });
  const slowerHost = { ...TRENDING, 'benchmark-index': 1700, 'total-blocking-time': 1000, performance: 45 };
  const slower = compareResults(result({ '/wallet/@gtg/transfers': slowerHost }), baseline);
  assert.equal(slower.status, 'pass');
  assert.deepEqual(slower.advisories.map((a) => a.metric), ['total-blocking-time', 'performance']);
  assert.deepEqual(slower.routes[0].benchmark, { baseline: 2900, current: 1700, hostSlower: true });

  const withBytes = compareResults(result({ '/wallet/@gtg/transfers': { ...slowerHost, 'script-transfer-bytes': 800000 } }), baseline);
  assert.deepEqual(withBytes.regressions.map((r) => r.metric), ['script-transfer-bytes']);

  const sameHost = compareResults(result({ '/wallet/@gtg/transfers': { ...slowerHost, 'benchmark-index': 2600 } }), baseline);
  assert.deepEqual(sameHost.regressions.map((r) => r.metric), ['total-blocking-time', 'performance']);
  assert.deepEqual(sameHost.advisories, []);
  assert.ok(formatComparison(slower).some((line) => /CPU benchmark 2900 -> 1700, host slower/.test(line)));
});

test('a route that measured nothing regresses; routes measured on one side only are listed, not judged', () => {
  const current = result({ '/blog/trending': { measuredRuns: 0 }, '/blog/new': TRENDING });
  current.routes[0].median = { measuredRuns: 0, errors: ['NO_FCP'] };
  const comparison = compareResults(current, result({ '/blog/trending': TRENDING, '/wallet/@gtg/transfers': TRENDING }));
  assert.equal(comparison.status, 'regression');
  assert.deepEqual(comparison.regressions, [{ route: '/blog/trending', metric: 'measurement', baseline: 3, current: 0 }]);
  assert.deepEqual(comparison.unmatched.sort(), ['/blog/new', '/wallet/@gtg/transfers']);
});

test('formatComparison marks each regressed metric', () => {
  const current = result({ '/blog/trending': { ...TRENDING, 'script-transfer-bytes': 802400 } });
  const lines = formatComparison(compareResults(current, result({ '/blog/trending': TRENDING })));
  assert.match(lines[0], /baseline of base/);
  assert.ok(lines.some((line) => /❌ script-transfer-bytes: 683\.6 KiB -> 783\.6 KiB \(\+100\.0 KiB, tolerance 13\.7 KiB\)/.test(line)));
  assert.ok(lines.some((line) => /^ +largest-contentful-paint: 3000 ms -> 3000 ms \(±0 ms, tolerance 750 ms\)$/.test(line)));
});
