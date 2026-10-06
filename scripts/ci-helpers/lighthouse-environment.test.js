const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyEnvironment, appendToHistory, verdictOf, BASELINE_WINDOW } = require('./lighthouse-environment');

const ROUTE = '/blog/trending';

function probes(apiMs, { imagesMs = 100, failures = 0 } = {}) {
  return {
    api: { medianMs: apiMs, samples: 5, failures },
    images: { medianMs: imagesMs, samples: 5, failures: 0 },
  };
}

function historyOf(count, { apiMs = 100, ttfbMs = 400 } = {}) {
  let history = [];
  for (let i = 0; i < count; i++) {
    history = appendToHistory(history, { revision: `r${i}`, measuredAt: `t${i}`, before: probes(apiMs), after: probes(apiMs), ttfb: { [ROUTE]: ttfbMs } });
  }
  return history;
}

test('a pass within its baseline is normal', () => {
  const env = classifyEnvironment({ before: probes(150), after: probes(110), ttfb: { [ROUTE]: 450 } }, historyOf(5));
  assert.equal(env.status, 'normal');
  assert.deepEqual(env.reasons, []);
  assert.deepEqual(env.baseline, { passes: 5, probes: { api: 100, images: 100 }, ttfb: { [ROUTE]: 400 } });
});

test('a probe is degraded only at twice its baseline and at least 300 ms above it', () => {
  const history = historyOf(5);
  const classify = (apiMs) => classifyEnvironment({ before: probes(100), after: probes(apiMs), ttfb: {} }, history);
  assert.equal(classify(399).status, 'normal', '3.99x but only +299 ms');
  assert.deepEqual(classify(400).reasons, [{ kind: 'probe', name: 'api', phase: 'after', value: 400, baseline: 100 }]);

  const slowHistory = historyOf(5, { apiMs: 1000 });
  const slow = (apiMs) => classifyEnvironment({ before: probes(apiMs), after: {}, ttfb: {} }, slowHistory);
  assert.equal(slow(1900).status, 'normal', '+900 ms but under 2x');
  assert.equal(slow(2000).status, 'degraded');
});

test('a route whose TTFB is far above its baseline marks the pass degraded', () => {
  const env = classifyEnvironment({ before: probes(100), after: probes(100), ttfb: { [ROUTE]: 1200, '/blog/new': 5000 } }, historyOf(5));
  assert.equal(env.status, 'degraded');
  assert.deepEqual(env.reasons, [{ kind: 'ttfb', route: ROUTE, value: 1200, baseline: 400 }], 'a route with no history has no baseline');
});

test('a probe that failed every sample marks the pass degraded, a partly failed one does not', () => {
  const failed = { api: { medianMs: undefined, samples: 5, failures: 5 } };
  assert.deepEqual(classifyEnvironment({ before: failed, after: {}, ttfb: {} }, []).reasons, [
    { kind: 'probe', name: 'api', phase: 'before', value: 'failed', baseline: undefined },
  ]);
  const env = classifyEnvironment({ before: probes(100, { failures: 2 }), after: {}, ttfb: {} }, historyOf(5));
  assert.equal(env.status, 'normal');
});

test('a figure needs three earlier passes before it has a baseline', () => {
  const slow = { before: probes(5000), after: probes(5000), ttfb: { [ROUTE]: 9000 } };
  assert.equal(classifyEnvironment(slow, historyOf(2)).status, 'no-baseline');
  assert.equal(classifyEnvironment(slow, historyOf(3)).status, 'degraded');
});

test('the baseline is the median of the last passes of the window only', () => {
  let history = historyOf(BASELINE_WINDOW, { apiMs: 2000 });
  history = [...history, ...historyOf(BASELINE_WINDOW, { apiMs: 100 })];
  const env = classifyEnvironment({ before: probes(500), after: probes(500), ttfb: {} }, history);
  assert.equal(env.baseline.probes.api, 100, 'the slow passes have left the window');
  assert.equal(env.baseline.passes, BASELINE_WINDOW);
  assert.equal(env.status, 'degraded');
});

test('appendToHistory keeps the probe medians of the last passes', () => {
  const history = historyOf(BASELINE_WINDOW + 3);
  assert.equal(history.length, BASELINE_WINDOW);
  assert.equal(history[0].revision, 'r3');
  const next = appendToHistory([], {
    revision: 'r',
    measuredAt: 't',
    before: { api: { url: 'https://api.hive.blog', medianMs: 90, maxMs: 300, samples: 5, failures: 1, errors: ['HTTP 502'] } },
    after: {},
    ttfb: { [ROUTE]: 300 },
  });
  assert.deepEqual(next, [
    { revision: 'r', measuredAt: 't', probes: { before: { api: { medianMs: 90, samples: 5, failures: 1 } }, after: {} }, ttfb: { [ROUTE]: 300 } },
  ]);
});

test('verdictOf names a degraded environment', () => {
  assert.equal(verdictOf('breach', 'degraded'), 'breach (environment degraded)');
  assert.equal(verdictOf('breach', 'normal'), 'breach');
  assert.equal(verdictOf('pass', 'no-baseline'), 'pass');
});
