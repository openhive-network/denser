import { defineConfig, devices } from '@playwright/test';
require('dotenv').config({ path: './.env.local' });

/**
 * Playwright configuration for Percy visual testing.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './playwright/tests/visual',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  /* Percy requires sequential execution */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  /* Percy requires single worker */
  workers: 1,
  reporter: [['list', { printSteps: true }]],
  use: {
    actionTimeout: 0,
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'off',
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
