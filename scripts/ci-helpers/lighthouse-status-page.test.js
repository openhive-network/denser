const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderStatusPage } = require('./lighthouse-status-page');

const REV_NEW = 'a'.repeat(40);
const REV_OLD = 'b'.repeat(40);

// A result file as the check wrote it before it recorded backend timing.
const oldResult = {
  revision: REV_OLD,
  measuredAt: '2026-10-06T10:05:00.000Z',
  status: 'breach',
  routes: [
    {
      route: '/blog/trending',
      median: { measuredRuns: 3, performance: 41, 'largest-contentful-paint': 5600, 'cumulative-layout-shift': 0.01 },
      breaches: [{ metric: 'largest-contentful-paint', value: 12000, threshold: 10000 }],
      runs: [],
    },
  ],
};

const newResult = {
  revision: REV_NEW,
  measuredAt: '2026-10-06T17:45:00.000Z',
  status: 'breach',
  verdict: 'breach (environment degraded)',
  environment: {
    status: 'degraded',
    before: { api: { medianMs: 950, samples: 5, failures: 0 }, images: { medianMs: 120, samples: 5, failures: 2 } },
    after: { api: { medianMs: 870, samples: 5, failures: 0 } },
    baseline: { passes: 12, probes: { api: 110 }, ttfb: {} },
    reasons: [{ kind: 'probe', name: 'api', phase: 'before', value: 950, baseline: 110 }],
  },
  routes: [
    {
      route: '/blog/<script>',
      median: {
        measuredRuns: 3,
        performance: 30,
        backend: {
          'server-response-time': 1234,
          'lcp-ttfb': 1240,
          'lcp-resource': { host: 'images.hive.blog', transferBytes: 20480, durationMs: 777 },
          hosts: { 'api.hive.blog': { role: 'api', requests: 4, transferBytes: 8192, medianMs: 321, maxMs: 654 } },
        },
      },
      breaches: [],
      runs: [{ report: 'reports/x/run1.json.gz' }, { error: 'timeout' }],
    },
  ],
};

test('the status page shows the verdict, environment, TTFB and upstream hosts of a pass', () => {
  const html = renderStatusPage([newResult], REV_NEW);
  assert.match(html, /breach \(environment degraded\)/);
  assert.match(html, /Environment: <span class="bad">degraded<\/span> \(baseline of 12 earlier passes\)/);
  assert.match(html, /<tr><th>api<\/th><td>950 ms<\/td><td>870 ms<\/td><td>110 ms<\/td><\/tr>/);
  assert.match(html, /120 ms <span class="bad">2\/5 failed<\/span>/);
  assert.match(html, /api probe before: 950 ms \(baseline 110 ms\)/);
  assert.match(html, /<td>1234 ms<\/td>/, 'the route TTFB');
  assert.match(html, /images\.hive\.blog: 20 KiB in 777 ms/);
  assert.match(html, /api\.hive\.blog: 4 req, 8 KiB, 321 ms median \/ 654 ms max/);
  assert.match(html, /<a href="reports\/x\/run1\.json\.gz">run 1<\/a>/);
  assert.ok(html.includes('/blog/&#60;script&#62;') && !html.includes('<script>'), 'route names are escaped');
});

test('a result file without the new fields still renders', () => {
  const html = renderStatusPage([newResult, oldResult], REV_NEW);
  const oldSection = html.slice(html.indexOf(REV_OLD));
  assert.match(oldSection, /<span class="bad">breach<\/span>/);
  assert.match(oldSection, /No environment probes in this result/);
  assert.match(oldSection, /\/blog\/trending/);
  assert.match(oldSection, /<td>5600 ms<\/td>/);
  assert.match(oldSection, /largest-contentful-paint = 12000 \(threshold 10000\)/);
  assert.match(oldSection, /<td>—<\/td>/, 'missing figures show as a dash');
});

test('only the revision whose reports are kept links them', () => {
  assert.doesNotMatch(renderStatusPage([newResult], REV_OLD), /run1\.json\.gz/);
  assert.match(renderStatusPage([], REV_NEW), /No passes measured yet/);
});
