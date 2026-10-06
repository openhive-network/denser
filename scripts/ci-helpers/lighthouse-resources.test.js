const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractResourceTotals, offHostRequests } = require('./lighthouse-resources');

// A Lighthouse 13.5 mobile run of /trending on the live API, cut down to the audits the check reads.
const recorded = require('./fixtures/lighthouse-report-trending.json');

test('extractResourceTotals reads image bytes, all bytes and the request count of a recorded report', () => {
  assert.deepEqual(extractResourceTotals(recorded), {
    'image-transfer-bytes': 423148,
    'total-transfer-bytes': 11062149,
    'request-count': 89,
  });
});

test('extractResourceTotals leaves out what a report has no resource summary for', () => {
  assert.deepEqual(extractResourceTotals({ audits: {} }), {
    'image-transfer-bytes': undefined,
    'total-transfer-bytes': undefined,
    'request-count': undefined,
  });
});

test('offHostRequests names every request to a host outside the allowed ones, once each', () => {
  const offHost = offHostRequests(recorded, ['127.0.0.1:50675']);
  assert.equal(offHost.length, new Set(offHost).size);
  assert.ok(offHost.length > 0);
  assert.deepEqual([...new Set(offHost.map((url) => new URL(url).host))].sort(), ['api.hive.blog', 'images.hive.blog']);
});

test('offHostRequests finds nothing when every host is allowed, and ignores data: and blob: URLs', () => {
  assert.deepEqual(offHostRequests(recorded, ['127.0.0.1:50675', 'images.hive.blog', 'api.hive.blog']), []);
  const report = {
    audits: {
      'network-requests': {
        details: {
          items: [
            { url: 'data:image/png;base64,AAAA' },
            { url: 'blob:http://127.0.0.1:8000/0b7c' },
            { url: 'http://127.0.0.1:8000/blog' },
            { url: 'http://127.0.0.1:8201/u/gtg/avatar' },
            { url: 'https://images.hive.blog/u/gtg/avatar' },
          ],
        },
      },
    },
  };
  assert.deepEqual(offHostRequests(report, ['127.0.0.1:8000', '127.0.0.1:8201']), ['https://images.hive.blog/u/gtg/avatar']);
});
