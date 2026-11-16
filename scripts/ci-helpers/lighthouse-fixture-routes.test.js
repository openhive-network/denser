const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fixtureRoutes } = require('./lighthouse-fixture-routes');
const thresholds = require('./lighthouse-thresholds.json');

function recording(t, routes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lighthouse-fixture-routes-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, '_lighthouse.json');
  fs.writeFileSync(file, JSON.stringify({ clock: '2026-10-06T20:50:09Z', routes }));
  return file;
}

test('without a recording, as when recording one, every integration route is measured', () => {
  assert.deepEqual(fixtureRoutes(undefined), { routes: Object.entries(thresholds.integration), unrecorded: [] });
});

test('a replay measures the integration routes its recording lists, in the thresholds\' order, and names the rest', (t) => {
  const [first, second, ...rest] = Object.keys(thresholds.integration);
  const { routes, unrecorded } = fixtureRoutes(recording(t, [second, first, '/blog/no-longer-measured']));
  assert.deepEqual(routes, [
    [first, thresholds.integration[first]],
    [second, thresholds.integration[second]],
  ]);
  assert.deepEqual(unrecorded, rest);
});
