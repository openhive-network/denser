/**
 * Settings the blog's and the wallet's Playwright configs share. Each config
 * spreads what it needs and overrides the rest.
 *
 * Everything that reads process.env is a function: a config loads its dotenv
 * files after its imports run, and must see those values.
 */
import { devices, type PlaywrightTestConfig, type Project } from '@playwright/test';
import { testTimeout } from './support/timeouts';

/** Test and expect() timeouts, and the test.only guard on CI. */
export function baseConfig() {
  return {
    /* Maximum time one test can run for. */
    timeout: testTimeout('playwright:test', 60 * 1000),
    expect: {
      /* Maximum time expect() should wait for the condition to be met. */
      timeout: testTimeout('playwright:expect', 10 * 1000)
    },
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI
  };
}

/** Full-HD viewport for headless runs. */
export const FULL_HD_VIEWPORT = { width: 1920, height: 1080 };

/**
 * Browser options with a trace kept for each failed test. `snapshots` adds the
 * DOM snapshots to it.
 */
export function browserUse(snapshots: boolean) {
  return {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    // Fixed: 0 is no limit, which no load can need stretched.
    actionTimeout: 0,
    trace: {
      mode: 'retain-on-failure',
      screenshots: true,
      snapshots,
      sources: true
    },
    viewport: FULL_HD_VIEWPORT,
    ignoreHTTPSErrors: true
  } satisfies PlaywrightTestConfig['use'];
}

export const DESKTOP_BROWSER_PROJECTS: Project[] = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } }
];

/**
 * The e2e suite (playwright/tests/e2e) as CI runs it: sharded, against
 * DENSER_URL, with per-shard reports under PROJECT/SHARD_INDEX. Locally it
 * targets `localBaseURL`.
 */
export function e2eConfig(localBaseURL: string) {
  const shardDir = `${process.env.PROJECT}/${process.env.SHARD_INDEX}`;
  return {
    ...baseConfig(),
    testDir: './playwright/tests/e2e',
    fullyParallel: true,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Use 2 workers on CI for better test parallelism within each shard */
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI
      ? [
          ['html', { open: 'never', outputFolder: `playwright-report/${shardDir}` }],
          ['junit', { outputFile: `junit/${shardDir}/results.xml` }],
          // junit has no notion of "passed on retry"; the JSON report does, and
          // scripts/ci/flake-report.mjs reads it from the job artifacts (#971).
          ['json', { outputFile: `junit/${shardDir}/results.json` }],
          // e2e-report-aggregate-* merges the shards' blobs into one HTML report.
          ['blob', { outputDir: 'blob-report' }],
          ['list', { printSteps: false }]
        ]
      : 'html',
    use: {
      ...browserUse(!process.env.CI),
      baseURL: process.env.CI ? process.env.DENSER_URL : localBaseURL
    },
    projects: DESKTOP_BROWSER_PROJECTS
  } satisfies PlaywrightTestConfig;
}

/**
 * What a local run of the e2e suite (`pw:test:local*`) changes in
 * e2eConfig(): a single worker on CI, an HTML report, a trace without DOM
 * snapshots, HTTPS errors not ignored, and `baseURL` everywhere.
 */
export function localE2eOverrides(baseURL: string) {
  return {
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
      // Fixed: 0 is no limit, which no load can need stretched.
      actionTimeout: 0,
      baseURL,
      trace: 'retain-on-failure',
      viewport: FULL_HD_VIEWPORT
    }
  } satisfies PlaywrightTestConfig;
}

/**
 * `node server.js` of a Next.js standalone build in `nextDir`, after copying
 * in the static files and public/ the build leaves out.
 *
 * `pnpm start:standalone` bakes the build-time __ENV.js into the standalone's
 * public/ *before* react-env has a chance to write a fresh copy, so at runtime
 * the client bundle would load stale values (e.g. the REACT_APP_API_ENDPOINT
 * from .env.local instead of the test's API). This repeats the same steps but
 * copies the freshly-written __ENV.js into the standalone public/ right before
 * starting node.
 */
export function standaloneServerCommand(app: string, nextDir = '.next') {
  const appDir = `${nextDir}/standalone/apps/${app}`;
  return [
    `rm -rf ${appDir}/.next/static ${appDir}/public`,
    `cp -r ${nextDir}/static ${appDir}/.next/static`,
    `cp -r public ${appDir}/public`,
    `react-env -- sh -c "cp -f public/__ENV.js ${appDir}/public/__ENV.js && node ${appDir}/server.js"`
  ].join(' && ');
}

/** webServer options for a server the suite starts itself, piping its output. */
export function ownWebServerOptions() {
  return {
    reuseExistingServer: !process.env.CI,
    timeout: testTimeout('playwright:web-server', 120 * 1000),
    stdout: 'pipe',
    stderr: 'pipe'
  } as const;
}
