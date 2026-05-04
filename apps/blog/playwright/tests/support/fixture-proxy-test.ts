import { test as base, expect } from '@playwright/test';
import {
  createFixtureProxy,
  createReplayProxy,
  hasFixtures,
  type IFixtureProxyHandle
} from './mock-server';
import { seedAuthCookie } from './fixture-auth/seeder';
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
};

export type FixtureAuthTestFixtures = {
  /**
   * If set, a sealed iron-session cookie is injected into the test context
   * before the page is given to the test. `{}` seeds the default test user
   * (CI_TEST_USER env or "guest4test"); pass a Partial<User> to override
   * individual fields. Leave undefined for anonymous tests.
   */
  authenticatedUser: Partial<User> | undefined;
};

export const isRecordMode = process.env.FIXTURE_MODE === 'record';

export const test = base.extend<FixtureAuthTestFixtures, FixtureProxyWorkerFixtures>({
  fixtureTestName: ['', { option: true, scope: 'worker' }],
  fixturePort: [8200, { option: true, scope: 'worker' }],

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

  authenticatedUser: [undefined, { option: true }],

  context: async ({ context, authenticatedUser }, use) => {
    if (authenticatedUser !== undefined) {
      await seedAuthCookie(context, authenticatedUser);
    }
    await use(context);
  }
});

export { expect };
