import { defineConfig, devices } from '@playwright/test';
require('dotenv').config({ path: '../../stack/mirrornet-stack.env' });
require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: './test.env' });

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/* The same default value as in site.ts */
process.env.REACT_APP_API_ENDPOINT = "https://14.bc.fqdn.pl:8083/";
if (process.env.REACT_APP_API_ENDPOINT.substr(-1) != '/') process.env.REACT_APP_API_ENDPOINT += '/';


/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './playwright/tests/testnet_e2e',
  /* Maximum time one test can run for. */
  timeout: 120 * 1000,
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
  /* Opt out of parallel tests. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
      [
        'html',
        {
          open: 'never',
          outputFolder: `playwright-report/`
        }
      ],
      ['junit', { outputFile: `junit/results.xml` }],
      ['list', { printSteps: false }]
    ]
    : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,

    /* Base URL to use in actions like `await page.goto('/')`. */
    /* baseURL: process.env.DENSER_URL || `https://${process.env.PUBLIC_HOSTNAME}:${process.env.BLOG_PORT}/`,*/
    baseURL: `https://14.bc.fqdn.pl:3000/`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    /* Set viewport for headless to be full-hd */
    viewport: { width: 1920, height: 1080 },

    /* Ignore SSL errors. */
    ignoreHTTPSErrors: true,

    /* Disable CORS */
    bypassCSP: true,

    /* Additional launch options */
    launchOptions: {
      args: ['--disable-web-security', '--ignore-certificate-errors'], // add this to disable cors
    },

    // /* Additional context options */
    // contextOptions: {
    //   /* Disable service workers. */
    //   serviceWorkers: 'block'
    // }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // dependencies: ['setup']
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // dependencies: ['setup']
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // dependencies: ['setup']
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
    //   use: { channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { channel: 'chrome' },
    // },
  ]

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  // },
});
