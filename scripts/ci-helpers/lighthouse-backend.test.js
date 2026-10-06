const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractBackendTiming, summarizeBackend } = require('./lighthouse-backend');
const { extractRunMetrics, summarizeRuns } = require('./lighthouse-median');

// A Lighthouse 13.5 mobile run of /trending, cut down to the audits the check reads.
const recorded = require('./fixtures/lighthouse-report-trending.json');
const UPSTREAMS = { origin: '127.0.0.1:50675', images: 'images.hive.blog', api: ['api.hive.blog', 'api.openhive.network'] };

test('extractBackendTiming reads TTFB, the LCP breakdown, the LCP resource and the upstream hosts of a recorded report', () => {
  assert.deepEqual(extractBackendTiming(recorded, UPSTREAMS), {
    'server-response-time': 206,
    'lcp-ttfb': 209,
    'lcp-resource-load-delay': 29,
    'lcp-resource-load-duration': 315,
    'lcp-element-render-delay': 92,
    'lcp-resource': { host: 'images.hive.blog', transferBytes: 15656, durationMs: 314 },
    'image-transfer-bytes': 423148,
    hosts: {
      '127.0.0.1:50675': { role: 'origin', requests: 38, transferBytes: 10634489, medianMs: 15, maxMs: 208 },
      'images.hive.blog': { role: 'images', requests: 50, transferBytes: 438949, medianMs: 186, maxMs: 981 },
      'api.hive.blog': { role: 'api', requests: 2, transferBytes: 6991, medianMs: 313, maxMs: 497 },
    },
  });
});

test('extractBackendTiming sums unlisted hosts under `other`', () => {
  const backend = extractBackendTiming(recorded, { origin: 'elsewhere.example', images: 'images.hive.blog', api: [] });
  assert.deepEqual(Object.keys(backend.hosts).sort(), ['images.hive.blog', 'other']);
  assert.equal(backend.hosts.other.role, 'other');
  assert.equal(backend.hosts.other.requests, 40, 'the 38 origin and 2 API requests');
});

test('extractBackendTiming has no LCP resource for a text LCP element', () => {
  const textLcp = structuredClone(recorded);
  const breakdown = textLcp.audits['lcp-breakdown-insight'].details.items;
  breakdown[0].items = breakdown[0].items.filter((row) => ['timeToFirstByte', 'elementRenderDelay'].includes(row.subpart));
  breakdown[1].snippet = '<h1 class="title">';
  const backend = extractBackendTiming(textLcp, UPSTREAMS);
  assert.equal(backend['lcp-resource'], null);
  assert.equal(backend['lcp-ttfb'], 209);
  assert.equal(backend['lcp-resource-load-delay'], undefined);
});

test('extractBackendTiming copes with a report that has none of the audits', () => {
  assert.deepEqual(extractBackendTiming({ audits: {} }, UPSTREAMS), {
    'server-response-time': undefined,
    'lcp-resource': null,
    'image-transfer-bytes': undefined,
    hosts: {},
  });
});

test('summarizeBackend takes per-figure medians, the most common LCP host, and per-host medians', () => {
  const run = (ttfb, lcpHost, lcpMs, apiMs) => ({
    'server-response-time': ttfb,
    'lcp-resource': lcpHost ? { host: lcpHost, transferBytes: 1000, durationMs: lcpMs } : null,
    hosts: { 'api.hive.blog': { role: 'api', requests: 2, transferBytes: 7000, medianMs: apiMs, maxMs: apiMs * 2 } },
  });
  const summary = summarizeBackend([
    run(200, 'images.hive.blog', 300, 100),
    run(900, 'images.hive.blog', 500, 400),
    run(250, 'other.example', 50, 150),
  ]);
  assert.equal(summary['server-response-time'], 250);
  assert.deepEqual(summary['lcp-resource'], { host: 'images.hive.blog', transferBytes: 1000, durationMs: 400 });
  assert.deepEqual(summary.hosts['api.hive.blog'], { role: 'api', requests: 2, transferBytes: 7000, medianMs: 150, maxMs: 300 });
});

test('summarizeRuns leaves a run\'s backend to summarizeBackend', () => {
  const run = { ...extractRunMetrics(recorded), backend: extractBackendTiming(recorded, UPSTREAMS) };
  const summary = summarizeRuns([run, run]);
  assert.equal(summary.performance, 32);
  assert.equal(summary.backend, undefined);
});
