const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const store = require('./lighthouse-integration-store');

const REV_A = 'a'.repeat(40);
const REV_B = 'b'.repeat(40);

function tempOut(t) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'lighthouse-store-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  return out;
}

test('reports are saved gzip\'d per revision, and only the latest revision\'s are kept', (t) => {
  const out = tempOut(t);
  store.saveReport(out, REV_A, '/blog/trending', 0, { lighthouseVersion: 'old' });
  const saved = store.saveReport(out, REV_B, '/blog/@gtg/transfers', 2, { lighthouseVersion: '13.5.0' });
  assert.equal(saved, `reports/${REV_B}/blog_gtg_transfers-run3.json.gz`);

  store.pruneReports(out, REV_B);
  assert.deepEqual(fs.readdirSync(path.join(out, 'reports')), [REV_B]);
  const report = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, saved))));
  assert.equal(report.lighthouseVersion, '13.5.0');
});

test('the baseline history round-trips, and starts empty', (t) => {
  const out = tempOut(t);
  assert.deepEqual(store.readHistory(out), []);
  store.writeHistory(out, [{ revision: REV_A, ttfb: { '/blog/trending': 400 } }]);
  assert.deepEqual(store.readHistory(out), [{ revision: REV_A, ttfb: { '/blog/trending': 400 } }]);
});

test('the status page lists the result files newest first, old and new alike', (t) => {
  const out = tempOut(t);
  store.writeJson(path.join(out, `${REV_A}.json`), { revision: REV_A, measuredAt: '2026-10-06T10:05:00Z', status: 'pass', routes: [] });
  store.writeJson(path.join(out, `${REV_B}.json`), {
    revision: REV_B,
    measuredAt: '2026-10-06T17:45:00Z',
    status: 'breach',
    verdict: 'breach (environment degraded)',
    environment: { status: 'degraded', reasons: [] },
    routes: [],
  });
  store.writeJson(path.join(out, 'latest.json'), { revision: REV_B });
  store.writeHistory(out, []);

  store.writeStatusPage(out, REV_B);
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.ok(html.indexOf(REV_B) < html.indexOf(REV_A), 'newest first');
  assert.match(html, /breach \(environment degraded\)/);
});
