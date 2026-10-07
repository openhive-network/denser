/**
 * One Lighthouse run of a URL: mobile (Lighthouse's default form factor), headless
 * Chrome, JSON report on stdout. Shared by the integration check (live site) and the
 * fixture check (recorded data), so both measure with the same settings.
 */

const { execFile } = require('child_process');

const RUNS_PER_ROUTE = 5;
const LIGHTHOUSE_RUN_TIMEOUT_MS = 120_000;
const CHROME_FLAGS = '--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage';

/**
 * Resolves `{ report, error }`: the parsed report, or why there is none. Never rejects.
 * `extraArgs` are appended to the lighthouse command line.
 */
function runLighthouse(url, extraArgs = []) {
  const args = [url, '--output=json', '--output-path=stdout', '--quiet', `--chrome-flags=${CHROME_FLAGS}`, ...extraArgs];
  return new Promise((resolve) => {
    execFile('lighthouse', args, { maxBuffer: 256 * 1024 * 1024, timeout: LIGHTHOUSE_RUN_TIMEOUT_MS }, (err, stdout, stderr) => {
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

module.exports = { RUNS_PER_ROUTE, runLighthouse };
