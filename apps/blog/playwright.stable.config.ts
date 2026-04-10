import { defineConfig, devices } from '@playwright/test';
require('dotenv').config({ path: './.env.local' });

/* The same default value as in site.ts */
process.env.REACT_APP_API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://api.hive.blog';

/**
 * Stable E2E test suite configuration.
 * Runs only on Chromium for maximum stability.
 * See: https://gitlab.syncad.com/hive/denser/-/wikis/E2E-Tests---Stable-Suite-for-Anonymous-User
 */
export default defineConfig({
  testDir: './playwright/tests/e2e/stable',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* Serial execution locally to avoid overloading localhost; parallel on CI */
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI
    ? [
        [
          'html',
          {
            open: 'never',
            outputFolder: `playwright-report/stable/${process.env.SHARD_INDEX}`
          }
        ],
        ['junit', { outputFile: `junit/stable/${process.env.SHARD_INDEX}/results.xml` }],
        ['list', { printSteps: false }]
      ]
    : 'html',
  use: {
    actionTimeout: 0,
    baseURL: process.env.CI ? process.env.DENSER_URL : 'http://localhost:3000',
    trace: {
      mode: 'retain-on-failure',
      screenshots: true,
      snapshots: !process.env.CI,
      sources: true
    },
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
