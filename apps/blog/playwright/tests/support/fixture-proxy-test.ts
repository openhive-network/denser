import path from 'path';
import { test as base, expect, type BrowserContext } from '@playwright/test';
import {
  createFixtureProxy,
  createReplayProxy,
  hasFixtures,
  type IFixtureProxyHandle
} from './mock-server';
import { seedAuthCookie } from './fixture-auth/seeder';
import { appendMissShard } from './fixture-misses/miss-log';
import type { User } from '@smart-signer/types/common';

/**
 * Playwright test extension that automatically sets up a fixture proxy
 * (record or replay) for an entire spec file — so individual specs don't
 * need to repeat beforeAll/afterAll boilerplate.
 *
 * Usage in a spec file:
 *
 * ```ts
 * import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
 *
 * test.use({ fixtureTestName: 'sidebar' });
 *
 * test.describe('Sidebar tests', () => {
 *   test('is visible', async ({ page }) => {
 *     await page.goto('/');
 *     // ...
 *   });
 * });
 * ```
 *
 * Modes:
 * - Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * - Replay:  pnpm --filter @hive/blog test:fixture  (default)
 */

export type FixtureProxyWorkerFixtures = {
  /** Name of the test group — used as the fixture directory name. Required. */
  fixtureTestName: string;
  /** Port for the proxy server. Defaults to 8200. */
  fixturePort: number;
  /** The running proxy handle. Auto-started per worker; tests rarely need to touch it. */
  fixtureProxy: IFixtureProxyHandle;
  /** The blog server with the feed cache on (support/feed-cache-server.ts); unset when none runs. */
  feedCacheBaseURL: string | undefined;
  /** The blog server reading from the hivemind REST stub (support/hivemindRestStub.ts); unset when none runs. */
  hivemindRestBaseURL: string | undefined;
};

export type FixtureAuthTestFixtures = {
  /** Auto: attributes the proxy's replay MISSes to the running spec (see fixture-misses/). */
  missLog: void;
  /**
   * If set, a sealed iron-session cookie is injected into the test context
   * before the page is given to the test. `{}` seeds the default test user
   * (CI_TEST_USER env or "guest4test"); pass a Partial<User> to override
   * individual fields. Leave undefined for anonymous tests.
   */
  authenticatedUser: Partial<User> | undefined;
  /**
   * Whether the seeded user has mute or blacklist lists of its own (see
   * `seedAuthCookie`). Default true: every read sends the username.
   */
  authenticatedUserHasOwnLists: boolean;
};

export const isRecordMode = process.env.FIXTURE_MODE === 'record';

// The fixture config leaves REACT_APP_AI_DOMAIN unset, so the app uses its default.
const AI_DOMAIN_ORIGIN = new URL(process.env.REACT_APP_AI_DOMAIN || 'https://api.hive.blog').origin;

/**
 * The site header's HiveSense probe goes to the AI domain, not the fixture proxy.
 * Answer every hivesense call there with an empty document (AI search off), so no
 * spec depends on the production service or on egress. A spec that needs another
 * answer routes it with `page.route`, which takes precedence over this.
 */
const stubHiveSense = (context: BrowserContext) =>
  context.route(
    (url) => url.origin === AI_DOMAIN_ORIGIN && url.pathname.startsWith('/hivesense-api/'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
        headers: { 'access-control-allow-origin': '*' }
      })
  );

export const test = base.extend<FixtureAuthTestFixtures, FixtureProxyWorkerFixtures>({
  fixtureTestName: ['', { option: true, scope: 'worker' }],
  fixturePort: [8200, { option: true, scope: 'worker' }],
  feedCacheBaseURL: [undefined, { option: true, scope: 'worker' }],
  hivemindRestBaseURL: [undefined, { option: true, scope: 'worker' }],

  fixtureProxy: [
    async ({ fixtureTestName, fixturePort }, use) => {
      if (!fixtureTestName) {
        throw new Error(
          'fixtureTestName is required. Call test.use({ fixtureTestName: "my-test" }) ' +
            'at the top of your spec file.'
        );
      }

      let proxy: IFixtureProxyHandle;

      if (isRecordMode) {
        // Allow operator to override the upstream API host. Default kept as
        // api.hive.blog so existing record runs keep working; set
        // FIXTURE_UPSTREAM=api.openhive.network when api.hive.blog is down.
        const target = process.env.FIXTURE_UPSTREAM;
        proxy = await createFixtureProxy(fixtureTestName, {
          port: fixturePort,
          ...(target ? { target } : {})
        });
      } else {
        if (!hasFixtures(fixtureTestName)) {
          throw new Error(
            `No fixtures for "${fixtureTestName}". ` +
              `Run with FIXTURE_MODE=record first to capture them.`
          );
        }
        proxy = await createReplayProxy(fixtureTestName, { port: fixturePort });
      }

      await use(proxy);

      await proxy.close();
    },
    { scope: 'worker', auto: true }
  ],

  missLog: [
    async ({ fixtureProxy }, use, testInfo) => {
      await use();
      const misses = fixtureProxy.drainMisses();
      // A failed attempt already fails or retries the run; its misses
      // (often from an aborted flow) would only make the baseline flaky.
      if (isRecordMode || testInfo.status !== testInfo.expectedStatus) return;
      appendMissShard(path.relative(testInfo.project.testDir, testInfo.file), misses);
    },
    { auto: true }
  ],

  authenticatedUser: [undefined, { option: true }],
  authenticatedUserHasOwnLists: [true, { option: true }],

  context: async ({ context, authenticatedUser, authenticatedUserHasOwnLists }, use) => {
    // Every API call goes to the local fixture proxy, so the suite needs no
    // network — but on a host without one (e.g. `docker run --network none`)
    // Chromium reports navigator.onLine === false, and React Query then pauses
    // every query and mutation: nothing ever reaches the proxy. Report online.
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'onLine', {
        configurable: true,
        get: () => true
      });
    });
    await stubHiveSense(context);
    if (authenticatedUser !== undefined) {
      await seedAuthCookie(context, authenticatedUser, authenticatedUserHasOwnLists);
    }
    await use(context);
  }
});

export { expect };
