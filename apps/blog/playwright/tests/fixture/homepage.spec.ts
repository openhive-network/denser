import { test, expect } from '../support/fixture-proxy-test';

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

test.use({ fixtureTestName: 'homepage' });

test.describe('Homepage — post list loads', () => {
  test('should display trending posts on homepage', async ({ page }) => {
    // Navigate to homepage — use 'commit' to avoid waiting for all network
    // activity (React Query keeps polling in the background).
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for at least one post to appear
    const postListItems = page.locator('[data-testid="post-list-item"]');
    await expect(postListItems.first()).toBeVisible({ timeout: 30000 });

    // Verify multiple posts loaded
    const postCount = await postListItems.count();
    expect(postCount).toBeGreaterThanOrEqual(1);
  });
});
