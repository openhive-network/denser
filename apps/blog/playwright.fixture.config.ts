import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import {
  baseConfig,
  browserUse,
  ownWebServerOptions,
  prebuiltStandaloneServerCommand,
  standaloneServerCommand
} from '../../playwright/shared-config';
import {
  FIXTURE_APP_NAME,
  FIXTURE_COOKIE_PASSWORD,
  FIXTURE_OAUTH_CLIENT_SECRET
} from './playwright/tests/support/fixture-auth/constants';
import {
  FEED_CACHE_PORT,
  FEED_CACHE_STALE_S,
  FEED_CACHE_TTL_S
} from './playwright/tests/support/feed-cache-server';
import { FIXTURE_FYP_API_URL } from './playwright/tests/support/fypApiStub';
import {
  HIVEMIND_REST_BLOG_PORT,
  HIVEMIND_REST_STUB_URL
} from './playwright/tests/support/hivemindRestStub';
import {
  listSpecs,
  readDurations,
  shardFromEnv,
  specsForShard
} from './playwright/tests/support/fixture-shards/shard-specs';
import type {
  FixtureAuthTestFixtures,
  FixtureProxyWorkerFixtures
} from './playwright/tests/support/fixture-proxy-test';
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
 *
 * FIXTURE_BASE_PATH (e.g. `/blog`) serves a build made with the same
 * NEXT_PUBLIC_BASE_PATH under that path, as a subdirectory deployment does;
 * FIXTURE_NEXT_DIR points at that build when it is not `.next`. See the
 * `@basepath` pass of .aidev/run-fixture-e2e.sh.
 *
 * FIXTURE_STANDALONE_DIR (e.g. `/app/apps/blog`) serves a standalone app
 * directory that already has its static files and public/, as the testenv
 * image's /app holds it, instead of a build in FIXTURE_NEXT_DIR. CI's shards
 * restore the image's /app to /app: the server chunks carry the absolute paths
 * of the image's build, so the tree only runs there.
 *
 * CI_NODE_INDEX/CI_NODE_TOTAL (GitLab's `parallel:`) run one shard of the
 * spec files: whole files, so a file's calls reach the replay proxy in their
 * recorded order, balanced by support/fixture-shards/durations.json.
 */

const FIXTURE_PORT = 8200;
const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const NEXT_DIR = process.env.FIXTURE_NEXT_DIR ?? '.next';
const STANDALONE_DIR = process.env.FIXTURE_STANDALONE_DIR;
const SERVER_JS = `${STANDALONE_DIR ?? `${NEXT_DIR}/standalone/apps/blog`}/server.js`;
const TEST_DIR = path.join(__dirname, 'playwright/tests/fixture');
const SHARD = shardFromEnv(process.env.CI_NODE_INDEX, process.env.CI_NODE_TOTAL);

// Point the app at the fixture proxy
process.env.REACT_APP_API_ENDPOINT = `http://localhost:${FIXTURE_PORT}`;

const serverEnv = {
  REACT_APP_API_ENDPOINT: `http://localhost:${FIXTURE_PORT}`,
  // Client-side wax picks its endpoint from ALLOWED_HIVE_API_NODES
  // (written into __ENV.js by react-env at server startup), NOT from
  // API_ENDPOINT. Without this override the browser posts to whatever
  // host was baked into .env.local (api.fake.openhive.network), so
  // neither the fixture-proxy nor the broadcast interceptor sees it.
  REACT_APP_ALLOWED_HIVE_API_NODES: `http://localhost:${FIXTURE_PORT}`,
  // Pin the images endpoint so middleware/csp.ts adds
  // images.hive.blog to `connect-src`. Locally `.env.local` already
  // sets this, but CI runs without that file — and the editor's
  // image-upload POST is then blocked by CSP before
  // installImageUploadStub can intercept it (job 3142272 saw exactly
  // this for POST-08/09/18).
  REACT_APP_IMAGES_ENDPOINT: 'https://images.hive.blog/',
  // The For You feed is on, as on a deployment that sets it; specs answer it with page.route
  // (fypApiStub.ts). The feed-cache server leaves it unset, the default.
  REACT_APP_FYP_API_URL: FIXTURE_FYP_API_URL,
  // The steem-16 deployment's passkey signer, the one the lite passkey specs' recordings and
  // stub signer stand for; a spec needing another list rewrites it in __ENV.js
  // (`configureSigners` in support/litePasskeyContext.ts).
  REACT_APP_PASSKEY_SIGNERS: JSON.stringify(['https://signer.syncad.com']),
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
  DENSER_SERVER_SECRET_COOKIE_PASSWORD: FIXTURE_COOKIE_PASSWORD,
  // Registers the `denser` OAuth client (smart-signer/lib/oauth/config.ts),
  // which the spec playing openhive.chat authenticates as.
  DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET: FIXTURE_OAUTH_CLIENT_SECRET,
  // A subdirectory deployment's site and blog URLs carry its base path: the
  // server builds its redirects from the first, post share links from the
  // second. The browser loads hb-auth's worker from under REACT_APP_BASE_PATH,
  // so the sign-in dialog needs it too. The root pass keeps the defaults.
  ...(BASE_PATH
    ? {
        REACT_APP_SITE_DOMAIN: `http://localhost:3000${BASE_PATH}`,
        REACT_APP_BLOG_DOMAIN: `http://localhost:3000${BASE_PATH}`,
        REACT_APP_BASE_PATH: BASE_PATH
      }
    : {})
};

export default defineConfig<FixtureAuthTestFixtures, FixtureProxyWorkerFixtures>({
  ...baseConfig(),
  testDir: './playwright/tests/fixture',
  ...(SHARD
    ? {
        testMatch: specsForShard(
          listSpecs(TEST_DIR),
          readDurations(path.join(__dirname, 'playwright/tests/support/fixture-shards/durations.json')),
          SHARD
        )
      }
    : {}),
  // Collect the fixture proxy's replay MISSes and fail on ones missing
  // from playwright/tests/fixture/known-misses.json.
  // Absolute: .aidev/playwright.fixture-stack.config.ts spreads this config
  // from another directory, and relative paths resolve against that one.
  globalSetup: path.join(__dirname, 'playwright/tests/support/fixture-misses/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'playwright/tests/support/fixture-misses/global-teardown.ts'),
  /* Single worker — fixture proxy is shared and test-scoped */
  fullyParallel: false,
  // 1 retry under CI absorbs runner-load flakes (e.g. job 3136334
  // where CodeMirror's `next/dynamic` chunk took >60s to mount on a
  // saturated runner — the warm retry hits a webserver-cached chunk
  // and finishes in seconds) without masking real regressions. The
  // retry runs in a fresh context, so it only papers over genuinely
  // intermittent failures. Locally we keep 0 so flakes stay loud.
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Under CI also write junit (GitLab test report) and JSON (flake report,
  // scripts/ci/flake-report.mjs) next to each other, as the e2e configs do.
  reporter: process.env.CI
    ? [
        ['list'],
        ['junit', { outputFile: 'junit/fixture/results.xml' }],
        ['json', { outputFile: 'junit/fixture/results.json' }]
      ]
    : [['list']],
  use: {
    ...browserUse(true),
    baseURL: `http://localhost:3000${BASE_PATH}`,
    feedCacheBaseURL: `http://localhost:${FEED_CACHE_PORT}`,
    hivemindRestBaseURL: `http://localhost:${HIVEMIND_REST_BLOG_PORT}`
  },
  projects: [
    {
      name: 'chromium-fixture',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      // The standalone build in NEXT_DIR (or STANDALONE_DIR), with react-env writing __ENV.js
      // from serverEnv.
      command: STANDALONE_DIR
        ? prebuiltStandaloneServerCommand(STANDALONE_DIR)
        : standaloneServerCommand('blog', NEXT_DIR),
      // Not `/`: the fixture proxy only starts with the first worker, and a feed whose API is
      // unreachable answers 503, which Playwright does not count as ready.
      url: `http://127.0.0.1:3000${BASE_PATH}/api/health`,
      ...ownWebServerOptions(),
      env: { ...serverEnv, DENSER_FEED_CACHE_TTL_S: '0', DENSER_LITE_PROBE_TTL_S: '0' }
    },
    // Started once the server above has put the build's static files in place.
    {
      command: `node ${SERVER_JS}`,
      url: `http://127.0.0.1:${FEED_CACHE_PORT}${BASE_PATH}/api/health`,
      ...ownWebServerOptions(),
      env: {
        ...serverEnv,
        PORT: String(FEED_CACHE_PORT),
        REACT_APP_FYP_API_URL: '',
        DENSER_FEED_CACHE_TTL_S: String(FEED_CACHE_TTL_S),
        DENSER_FEED_CACHE_STALE_S: String(FEED_CACHE_STALE_S)
      }
    },
    // Reads hivemind's data from the hivemind REST stub (hivemindRest*.spec.ts).
    {
      command: `node ${SERVER_JS}`,
      url: `http://127.0.0.1:${HIVEMIND_REST_BLOG_PORT}${BASE_PATH}/api/health`,
      ...ownWebServerOptions(),
      env: {
        ...serverEnv,
        PORT: String(HIVEMIND_REST_BLOG_PORT),
        REACT_APP_FYP_API_URL: '',
        REACT_APP_HIVEMIND_REST_NODES: HIVEMIND_REST_STUB_URL,
        DENSER_FEED_CACHE_TTL_S: '0'
      }
    }
  ]
});
