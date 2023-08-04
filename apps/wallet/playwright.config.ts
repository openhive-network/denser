import { defineConfig, devices } from '@playwright/test';
require('dotenv').config({ path: './.env.local' });

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/* The same default value as in site.ts */
process.env.REACT_APP_API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://api.hive.blog';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './playwright/tests/e2e',
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 10 * 1000
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /*
    Reporter to use. See https://playwright.dev/docs/test-reporters
    List reporter may have to be replaced with dot reporter if
    the number of tests increases.
  */
  reporter: process.env.CI
    ? [
        [
          'html',
          {
            open: 'never',
            outputFolder: `playwright-report/${process.env.PROJECT}/${process.env.SHARD_INDEX}`
          }
        ],
        ['junit', { outputFile: `junit/${process.env.PROJECT}/${process.env.SHARD_INDEX}/results.xml` }],
        ['list', { printSteps: false }]
      ]
    : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,

    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? process.env.DENSER_URL : 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: {
      mode: 'retain-on-failure',
      screenshots: true,
      snapshots: !process.env.CI,
      sources: true
    },

    /* Set viewport for headless to be full-hd */
    viewport: { width: 1920, height: 1080 }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ..devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ]

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
