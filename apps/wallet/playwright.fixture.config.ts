import { defineConfig, devices } from '@playwright/test';
import { FIXTURE_API_PORT } from './playwright/tests/support/witnessApiStub';

/**
 * Playwright config for the wallet's offline specs (playwright/tests/fixture): a production build
 * served from `.next/standalone`, with no network and no recorded API responses. Every API
 * endpoint points at FIXTURE_API_PORT, closed unless a spec starts a stub there
 * (tests/support/witnessApiStub.ts); while it is closed the server's prefetches fail at once and
 * pages render without account data.
 *
 * Usage: pnpm --filter @hive/wallet test:fixture
 */

const PORT = 4000;
const FIXTURE_API = `http://127.0.0.1:${FIXTURE_API_PORT}`;

export default defineConfig({
  testDir: './playwright/tests/fixture',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`
  },
  projects: [
    {
      name: 'chromium-fixture',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    // As the blog's playwright.fixture.config.ts: static files and public/ copied into the
    // standalone build, and __ENV.js written by react-env from this environment.
    command: [
      'rm -rf .next/standalone/apps/wallet/.next/static .next/standalone/apps/wallet/public',
      'cp -r .next/static .next/standalone/apps/wallet/.next/static',
      'cp -r public .next/standalone/apps/wallet/public',
      'react-env -- sh -c "cp -f public/__ENV.js .next/standalone/apps/wallet/public/__ENV.js && node .next/standalone/apps/wallet/server.js"'
    ].join(' && '),
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      REACT_APP_API_ENDPOINT: FIXTURE_API,
      REACT_APP_ALLOWED_HIVE_API_NODES: FIXTURE_API,
      HOSTNAME: '0.0.0.0',
      PORT: String(PORT)
    }
  }
});
