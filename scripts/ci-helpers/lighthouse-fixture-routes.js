/**
 * The routes of the deterministic Lighthouse pass: the `integration` routes of
 * lighthouse-thresholds.json that its recording covers. A route added to the
 * integration check after the recording was made has no responses to replay (every
 * request it makes would MISS), so the pass leaves it out, and names it, until the set
 * is recorded again (.aidev/README.md, "Refreshing the recordings").
 */

const fs = require('fs');
const path = require('path');

function integrationRoutes() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'lighthouse-thresholds.json'), 'utf8')).integration;
}

/**
 * `{ routes, unrecorded }`: `routes` the `[route, thresholds]` entries, in the
 * thresholds file's order, of the integration routes the recording's `_lighthouse.json`
 * lists (every one without a `recordingFile`, as when recording), `unrecorded` the
 * integration routes it does not list.
 */
function fixtureRoutes(recordingFile) {
  const all = Object.entries(integrationRoutes());
  if (!recordingFile) return { routes: all, unrecorded: [] };
  const recorded = new Set(JSON.parse(fs.readFileSync(recordingFile, 'utf8')).routes || []);
  return {
    routes: all.filter(([route]) => recorded.has(route)),
    unrecorded: all.map(([route]) => route).filter((route) => !recorded.has(route)),
  };
}

module.exports = { fixtureRoutes };
