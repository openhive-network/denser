import { test, expect } from '@playwright/test';
import {
  createFixtureProxy,
  createReplayProxy,
  hasFixtures,
  type IFixtureProxyHandle
} from '../support/mock-server';

/**
 * Homepage fixture test.
 *
 * This test opens the homepage (which redirects to /trending) and verifies
 * that posts are loaded and displayed.
 *
 * Run in record mode to capture fixtures:
 *   pnpm --filter @hive/blog test:fixture:record
 *
 * Run in replay mode (default, stable & repeatable):
 *   pnpm --filter @hive/blog test:fixture
 */

const TEST_NAME = 'homepage';
const FIXTURE_PORT = 8200;
const isRecordMode = process.env.FIXTURE_MODE === 'record';

let fixtureProxy: IFixtureProxyHandle;

test.describe('Homepage — post list loads', () => {
  test.beforeAll(async () => {
    if (isRecordMode) {
      fixtureProxy = await createFixtureProxy(TEST_NAME, { port: FIXTURE_PORT });
    } else {
      if (!hasFixtures(TEST_NAME)) {
        throw new Error(
          `No fixtures for "${TEST_NAME}". Run with FIXTURE_MODE=record first:\n` +
            `  pnpm --filter @hive/blog test:fixture:record`
        );
      }
      fixtureProxy = await createReplayProxy(TEST_NAME, { port: FIXTURE_PORT });
    }
  });

  test.afterAll(async () => {
    await fixtureProxy.close();
  });

  test('should display trending posts on homepage', async ({ page }) => {
    // Navigate to homepage — use 'commit' to avoid waiting for all network
    // activity (React Query keeps polling in the background).
    await page.goto('/', { waitUntil: 'commit' });

    // Wait for at least one post to appear
    const postListItems = page.locator('[data-testid="post-list-item"]');
    await expect(postListItems.first()).toBeVisible({ timeout: 30000 });

    // Verify multiple posts loaded
    const postCount = await postListItems.count();
    expect(postCount).toBeGreaterThanOrEqual(1);

    console.log(
      `[homepage test] ${fixtureProxy.mode} mode — ${postCount} posts displayed`
    );

    if (isRecordMode) {
      // In record mode, give extra time for all background requests to be captured
      await page.waitForTimeout(3000);
    }
  });
});
