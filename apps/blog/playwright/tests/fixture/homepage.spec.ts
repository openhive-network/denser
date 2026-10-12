import { test, expect } from '../support/fixture-proxy-test';

/**
 * Homepage fixture test.
 *
 * This test opens the homepage (which serves the trending feed via an internal
 * rewrite, no redirect) and verifies that posts are loaded and displayed.
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

  test('header tooltip closes when the pointer leaves its trigger', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const menuButton = page.getByTestId('nav-sidebar-menu-button');
    const tooltip = page.getByRole('tooltip', { name: 'Menu Panel' });

    // Hovering before hydration opens nothing, so retry until the tooltip shows
    await expect(async () => {
      await page.mouse.move(0, 0);
      await menuButton.hover();
      await expect(tooltip).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30000 });

    const box = await menuButton.boundingBox();
    if (!box) throw new Error('Menu Panel button has no bounding box');
    // A single move out of the trigger, then no further pointer events: hoverable
    // content waits for a later pointermove to leave its grace area, so it stuck open
    await page.mouse.move(box.x - 300, box.y + 400);

    await expect(tooltip).toBeHidden({ timeout: 2000 });
  });
});
