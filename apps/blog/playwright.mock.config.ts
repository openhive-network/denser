import { defineConfig, devices } from '@playwright/test';
require('dotenv').config({ path: './.env.local' });

/**
 * Playwright config for mock server tests.
 *
 * These tests run against a local mock server (port 8100) that intercepts
 * specific Hive API calls and proxies the rest to the real API.
 *
 * Usage:
 *   pnpm --filter @hive/blog test:mock
 */

const MOCK_SERVER_PORT = 8100;

process.env.REACT_APP_API_ENDPOINT = `http://localhost:${MOCK_SERVER_PORT}`;

export default defineConfig({
  testDir: './playwright/tests/mock',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  /* Disable parallelization - mock server is shared across tests */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    baseURL: process.env.CI ? process.env.DENSER_URL : 'http://localhost:3000',
    trace: {
      mode: 'retain-on-failure',
      screenshots: true,
      snapshots: true,
      sources: true
    },
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium-mock',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
