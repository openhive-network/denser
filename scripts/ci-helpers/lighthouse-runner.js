/**
 * One Lighthouse run of a URL: mobile (Lighthouse's default form factor), headless
 * Chrome, JSON report on stdout. Shared by the integration check (live site) and the
 * fixture check (recorded data), so both measure with the same settings. Each run is
 * its own process with its own Chrome; only the parsed report comes back.
 */

const { execFile } = require('child_process');
const path = require('path');

const RUNS_PER_ROUTE = 5;
const LIGHTHOUSE_RUN_TIMEOUT_MS = 120_000;
const CHROME_FLAGS = '--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage';
const LOGGED_IN_RUN = path.join(__dirname, 'lighthouse-logged-in-run.js');

function runForReport(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { maxBuffer: 256 * 1024 * 1024, timeout: LIGHTHOUSE_RUN_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) {
        resolve({ report: null, error: `lighthouse failed: ${err.message.split('\n')[0]} ${stderr.trim().split('\n').pop() || ''}` });
        return;
      }
      try {
        resolve({ report: JSON.parse(stdout), error: null });
      } catch (parseErr) {
        resolve({ report: null, error: `lighthouse output is not JSON: ${parseErr.message}` });
      }
    });
  });
}

/**
 * Resolves `{ report, error }`: the parsed report, or why there is none. Never rejects.
 * `extraArgs` are appended to the lighthouse command line.
 */
function runLighthouse(url, extraArgs = []) {
  return runForReport('lighthouse', [url, '--output=json', '--output-path=stdout', '--quiet', `--chrome-flags=${CHROME_FLAGS}`, ...extraArgs]);
}

/**
 * runLighthouse's run, logged in on `site` as `observer` (lighthouse-logged-in-run.js).
 * Resolves `{ report, error }`; never rejects.
 */
function runLighthouseLoggedIn(url, site, observer) {
  return runForReport(process.execPath, [LOGGED_IN_RUN, url, '--site', site, '--observer', observer]);
}

module.exports = { RUNS_PER_ROUTE, CHROME_FLAGS, runLighthouse, runLighthouseLoggedIn };
