const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateBudgets } = require('./lighthouse-host-budget');
const thresholds = require('./lighthouse-thresholds.json');

const IBARRA = '/blog/hive-163772/@ibarra95/visiting-the-desparramaderos-waterfall-nature';
const BUDGETS = thresholds.integration[IBARRA];
const BASELINE = { measuredRuns: 3, 'benchmark-index': 2863, 'largest-contentful-paint': 6678 };

function median(overrides) {
  return {
    measuredRuns: 3,
    performance: 50,
    'largest-contentful-paint': 6700,
    'observed-largest-contentful-paint': 1320,
    'total-blocking-time': 600,
    'cumulative-layout-shift': 0.01,
    'script-transfer-bytes': 900000,
    'wasm-transfer-bytes': 0,
    'lcp-lazy-loaded': false,
    'benchmark-index': 2863,
    ...overrides,
  };
}

test('a 10,951 ms simulated LCP on a host 25% slower than the baseline is an allowance, not a breach', () => {
  const { hostSpeed, breaches, allowances } = evaluateBudgets(
    median({ 'largest-contentful-paint': 10951, 'benchmark-index': 2133 }),
    BUDGETS,
    BASELINE
  );
  assert.deepEqual(breaches, []);
  assert.equal(hostSpeed.benchmark, 2133);
  assert.equal(hostSpeed.baselineBenchmark, 2863);
  assert.ok(Math.abs(hostSpeed.scale - 2863 / 2133) < 1e-9);
  assert.equal(allowances.length, 1);
  const [lcp] = allowances;
  assert.equal(lcp.metric, 'largest-contentful-paint');
  assert.equal(lcp.value, 10951);
  assert.equal(lcp.budget, 8500);
  assert.equal(Math.round(lcp.threshold), 11409);
  assert.equal(lcp.scale, hostSpeed.scale);
});

test('on a host at or above the baseline benchmark the written budgets apply unchanged', () => {
  for (const benchmark of [2863, 3200]) {
    const { hostSpeed, breaches, allowances } = evaluateBudgets(
      median({ 'largest-contentful-paint': 8600, 'benchmark-index': benchmark }),
      BUDGETS,
      BASELINE
    );
    assert.equal(hostSpeed.scale, 1);
    assert.deepEqual(allowances, []);
    assert.deepEqual(breaches, [
      { metric: 'largest-contentful-paint', value: 8600, threshold: 8500, simulatedOnly: true, observed: 1320 },
    ]);
  }
});

test('a real LCP regression on a normal-speed host fails', () => {
  const { breaches } = evaluateBudgets(
    median({ 'largest-contentful-paint': 12000, 'observed-largest-contentful-paint': 4000, 'benchmark-index': 2840 }),
    BUDGETS,
    BASELINE
  );
  assert.deepEqual(breaches.map((b) => [b.metric, b.value]), [['largest-contentful-paint', 12000]]);
  assert.equal(Math.round(breaches[0].threshold), 8569);
});

test('a slow host still breaches beyond the scaled budget, and the breach shows the scaling', () => {
  const { breaches } = evaluateBudgets(
    median({ 'largest-contentful-paint': 13000, 'observed-largest-contentful-paint': 4000, 'benchmark-index': 2133 }),
    BUDGETS,
    BASELINE
  );
  assert.equal(breaches.length, 1);
  assert.equal(breaches[0].metric, 'largest-contentful-paint');
  assert.equal(breaches[0].budget, 8500);
  assert.equal(Math.round(breaches[0].threshold), 11409);
  assert.ok(Math.abs(breaches[0].scale - 2863 / 2133) < 1e-9);
});

test('a slow host scales TBT too but never bytes or the performance floor', () => {
  const { breaches, allowances } = evaluateBudgets(
    median({ 'benchmark-index': 1431.5, 'total-blocking-time': 4000, 'script-transfer-bytes': 940000, performance: 30 }),
    BUDGETS,
    BASELINE
  );
  assert.deepEqual(breaches, [
    { metric: 'performance', value: 30, threshold: 35 },
    { metric: 'script-transfer-bytes', value: 940000, threshold: 930000 },
  ]);
  assert.deepEqual(allowances, [{ metric: 'total-blocking-time', value: 4000, budget: 2500, threshold: 5000, scale: 2 }]);
});

test('without a baseline benchmark the budgets apply as written', () => {
  for (const baseline of [undefined, { measuredRuns: 3 }]) {
    const { hostSpeed, breaches } = evaluateBudgets(
      median({ 'largest-contentful-paint': 10951, 'benchmark-index': 2133 }),
      BUDGETS,
      baseline
    );
    assert.equal(hostSpeed.scale, 1);
    assert.deepEqual(breaches.map((b) => b.metric), ['largest-contentful-paint']);
  }
});

test('a route with no successful run still breaches on measurement', () => {
  const { breaches, allowances } = evaluateBudgets({ measuredRuns: 0, errors: ['x'] }, BUDGETS, BASELINE);
  assert.deepEqual(breaches, [{ metric: 'measurement', value: 'no successful run', threshold: 'at least one' }]);
  assert.deepEqual(allowances, []);
});
