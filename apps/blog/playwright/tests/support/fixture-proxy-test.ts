import { test as base, expect } from '@playwright/test';
import {
  createFixtureProxy,
  createReplayProxy,
  hasFixtures,
  type IFixtureProxyHandle
} from './mock-server';

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

export const isRecordMode = process.env.FIXTURE_MODE === 'record';

export const test = base.extend<{}, FixtureProxyWorkerFixtures>({
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
        proxy = await createFixtureProxy(fixtureTestName, { port: fixturePort });
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
  ]
});

export { expect };
