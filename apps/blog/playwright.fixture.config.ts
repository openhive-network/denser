import { defineConfig, devices } from '@playwright/test';
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
      // Whitelist the fixture proxy in the CSP connect-src directive;
      // without this the browser blocks every fetch to localhost:8200.
      REACT_APP_ALLOWED_HIVE_API_NODES: `http://localhost:${FIXTURE_PORT}`,
      HOSTNAME: '0.0.0.0',
      PORT: '3000',
      // iron-session requires a password >= 32 chars. Fixture tests never
      // exercise real auth, so a fixed dummy value is fine and lets SSR
      // pages render without throwing.
      DENSER_SERVER_SECRET_COOKIE_PASSWORD:
        'fixture-tests-dummy-cookie-password-not-a-secret'
    }
  }
});
