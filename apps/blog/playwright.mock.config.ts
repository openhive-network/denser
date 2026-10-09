import { defineConfig, devices } from '@playwright/test';
import { baseConfig, browserUse } from '../../playwright/shared-config';
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
  ...baseConfig(),
  testDir: './playwright/tests/mock',
  /* Disable parallelization - mock server is shared across tests */
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    ...browserUse(true),
    baseURL: process.env.CI ? process.env.DENSER_URL : 'http://localhost:3000'
  },
  projects: [
    {
      name: 'chromium-mock',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
