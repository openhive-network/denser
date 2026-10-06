const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractRunMetrics, median, summarizeRuns, findBreaches } = require('./lighthouse-median');
const thresholds = require('./lighthouse-thresholds.json');

function fakeReport({ score = 0.5, lcp = 8000, tbt = 900, cls = 0.01, scriptBytes = 700000, lazyLcp } = {}) {
  const audits = {
    'largest-contentful-paint': { numericValue: lcp },
    'total-blocking-time': { numericValue: tbt },
    'cumulative-layout-shift': { numericValue: cls },
    'resource-summary': {
      details: {
        items: [
          { resourceType: 'total', transferSize: scriptBytes * 3 },
          { resourceType: 'script', transferSize: scriptBytes },
        ],
      },
    },
  };
  if (lazyLcp !== undefined) {
    audits['lcp-discovery-insight'] = {
      details: { items: [{ type: 'checklist', items: { eagerlyLoaded: { value: !lazyLcp } } }, { type: 'node' }] },
    };
  }
  return { categories: { performance: { score } }, audits };
}

test('extractRunMetrics reads score, vitals, script bytes and the LCP lazy-load check', () => {
  assert.deepEqual(extractRunMetrics(fakeReport({ score: 0.51, lazyLcp: true })), {
    performance: 51,
    'largest-contentful-paint': 8000,
    'total-blocking-time': 900,
    'cumulative-layout-shift': 0.01,
    'script-transfer-bytes': 700000,
    'lcp-lazy-loaded': true,
  });
  assert.equal(extractRunMetrics(fakeReport({ lazyLcp: false }))['lcp-lazy-loaded'], false);
  assert.equal(extractRunMetrics(fakeReport())['lcp-lazy-loaded'], false, 'a text LCP element is not lazy');
});

test('extractRunMetrics reports a run Lighthouse could not measure', () => {
  const report = { runtimeError: { code: 'NO_FCP', message: 'The page did not paint' }, categories: {}, audits: {} };
  assert.deepEqual(extractRunMetrics(report), { error: 'NO_FCP: The page did not paint' });
  assert.deepEqual(extractRunMetrics({ categories: {}, audits: {} }), { error: 'report has no performance score' });
});

test('median takes the middle value, or the mean of the middle two', () => {
  assert.equal(median([8400, 4000, 5100]), 5100);
  assert.equal(median([4000, 8400]), 6200);
  assert.equal(median([undefined, 3]), 3);
  assert.equal(median([]), undefined);
});

test('summarizeRuns is the per-metric median of the measured runs', () => {
  const runs = [
    extractRunMetrics(fakeReport({ score: 0.45, lcp: 8400, lazyLcp: true })),
    extractRunMetrics(fakeReport({ score: 0.6, lcp: 4000, lazyLcp: false })),
    { error: 'lighthouse failed: timeout' },
    extractRunMetrics(fakeReport({ score: 0.5, lcp: 5100, lazyLcp: true })),
  ];
  const summary = summarizeRuns(runs);
  assert.equal(summary.measuredRuns, 3);
  assert.deepEqual(summary.errors, ['lighthouse failed: timeout']);
  assert.equal(summary.performance, 50);
  assert.equal(summary['largest-contentful-paint'], 5100);
  assert.equal(summary['lcp-lazy-loaded'], true, 'two of three runs saw a lazy LCP image');
});

test('findBreaches: performance is a floor, metrics are ceilings, booleans must match', () => {
  const limits = {
    performance: 40,
    'largest-contentful-paint': 10000,
    'cumulative-layout-shift': 0.1,
    'lcp-lazy-loaded': false,
  };
  const passing = { measuredRuns: 3, performance: 40, 'largest-contentful-paint': 10000, 'cumulative-layout-shift': 0.05, 'lcp-lazy-loaded': false };
  assert.deepEqual(findBreaches(passing, limits), []);

  const regressed = { measuredRuns: 3, performance: 39, 'largest-contentful-paint': 12000, 'lcp-lazy-loaded': true };
  assert.deepEqual(findBreaches(regressed, limits), [
    { metric: 'performance', value: 39, threshold: 40 },
    { metric: 'largest-contentful-paint', value: 12000, threshold: 10000 },
    { metric: 'cumulative-layout-shift', value: 'not measured', threshold: 0.1 },
    { metric: 'lcp-lazy-loaded', value: true, threshold: false },
  ]);
});

test('findBreaches flags a route with no successful run', () => {
  assert.deepEqual(findBreaches({ measuredRuns: 0, errors: ['x'] }, { performance: 40 }), [
    { metric: 'measurement', value: 'no successful run', threshold: 'at least one' },
  ]);
});

test('every integration threshold names a route of an app and a metric a run produces', () => {
  const produced = Object.keys(extractRunMetrics(fakeReport({ lazyLcp: false })));
  const routes = Object.entries(thresholds.integration);
  assert.ok(routes.length > 0);
  for (const [route, limits] of routes) {
    assert.match(route, /^\/(blog|wallet)\//);
    for (const [metric, limit] of Object.entries(limits)) {
      assert.ok(produced.includes(metric), `${route}: unknown metric ${metric}`);
      assert.equal(typeof limit, metric === 'lcp-lazy-loaded' ? 'boolean' : 'number', `${route}: ${metric}`);
    }
  }
});
