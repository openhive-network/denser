import { defineConfig, devices } from '@playwright/test';
import {
  FIXTURE_APP_NAME,
  FIXTURE_COOKIE_PASSWORD
} from './playwright/tests/support/fixture-auth/constants';
require('dotenv').config({ path: './.env.local' });

/**
 * Playwright config for fixture-based tests.
 *
 * Supports two modes controlled by the FIXTURE_MODE env variable:
 *
 *   FIXTURE_MODE=record  — Proxy to real API, save request/response pairs
 *                          to fixture files per test group.
 *
 *   FIXTURE_MODE=replay  — Serve responses from previously recorded fixtures.
 *                          No real API calls are made. (default)
 *
 * Usage:
 *   # Record fixtures (run once to capture data):
 *   FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 *
 *   # Replay from recorded fixtures (stable, repeatable):
 *   pnpm --filter @hive/blog test:fixture
 */

const FIXTURE_PORT = 8200;

// Point the app at the fixture proxy
process.env.REACT_APP_API_ENDPOINT = `http://localhost:${FIXTURE_PORT}`;

export default defineConfig({
  testDir: './playwright/tests/fixture',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  /* Single worker — fixture proxy is shared and test-scoped */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:3000',
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
      name: 'chromium-fixture',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'pnpm start:standalone',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      REACT_APP_API_ENDPOINT: `http://localhost:${FIXTURE_PORT}`,
      HOSTNAME: '0.0.0.0',
      PORT: '3000',
      // Pin APP_NAME so iron-session's cookieName matches what the seeder
      // (see playwright/tests/support/fixture-auth/) writes from the test
      // side. Without this the app could default to "app_session" while
      // the seeder targets "blog_session".
      REACT_APP_APP_NAME: FIXTURE_APP_NAME,
      // Shared with the seeder via fixture-auth/constants.ts — the app
      // seals and the test seals with the same password so sessions
      // unseal cleanly on both sides.
      DENSER_SERVER_SECRET_COOKIE_PASSWORD: FIXTURE_COOKIE_PASSWORD
    }
  }
});
