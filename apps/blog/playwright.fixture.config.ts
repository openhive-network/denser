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
  // 1 retry under CI absorbs runner-load flakes (e.g. job 3136334
  // where CodeMirror's `next/dynamic` chunk took >60s to mount on a
  // saturated runner — the warm retry hits a webserver-cached chunk
  // and finishes in seconds) without masking real regressions. The
  // retry runs in a fresh context, so it only papers over genuinely
  // intermittent failures. Locally we keep 0 so flakes stay loud.
  retries: process.env.CI ? 1 : 0,
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
    // `pnpm start:standalone` bakes the build-time __ENV.js into the
    // standalone's public/ *before* react-env has a chance to write a fresh
    // copy, so at runtime the client bundle loads stale values (e.g. the
    // REACT_APP_API_ENDPOINT from .env.local points at api.fake.openhive
    // .network instead of our fixture proxy on :8200). We repeat the same
    // steps but copy the freshly-written __ENV.js into the standalone
    // public/ right before starting node.
    command: [
      'rm -rf .next/standalone/apps/blog/.next/static .next/standalone/apps/blog/public .next/standalone/apps/blog/lib',
      'cp -r .next/static .next/standalone/apps/blog/.next/static',
      'cp -r public .next/standalone/apps/blog/public',
      // Static pages (/welcome, /faq.html, /tos.html) read their markdown
      // sources via `fs.readFileSync('lib/markdowns/<name>.md')` at request
      // time. Next.js's standalone server `process.chdir`s into its own dir,
      // so the relative path resolves under .next/standalone/apps/blog/ and
      // misses the source `lib/` tree. Copy it next to the server.
      'cp -r lib .next/standalone/apps/blog/lib',
      'react-env -- sh -c "cp -f public/__ENV.js .next/standalone/apps/blog/public/__ENV.js && node .next/standalone/apps/blog/server.js"'
    ].join(' && '),
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      REACT_APP_API_ENDPOINT: `http://localhost:${FIXTURE_PORT}`,
      // Client-side wax picks its endpoint from ALLOWED_HIVE_API_NODES
      // (written into __ENV.js by react-env at server startup), NOT from
      // API_ENDPOINT. Without this override the browser posts to whatever
      // host was baked into .env.local (api.fake.openhive.network), so
      // neither the fixture-proxy nor the broadcast interceptor sees it.
      REACT_APP_ALLOWED_HIVE_API_NODES: `http://localhost:${FIXTURE_PORT}`,
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
