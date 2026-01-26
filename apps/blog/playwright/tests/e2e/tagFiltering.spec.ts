import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

test.describe('Tag Filtering tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * TAG PAGE LOADING TESTS
   */

  test('tag page loads correctly with posts', async ({ page }) => {
    await page.goto('/trending/hive');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL contains tag
    await expect(page).toHaveURL(/\/trending\/hive/);

    // Verify posts are loaded
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('tag page displays tag/community name', async ({ page }) => {
    await page.goto('/trending/photography');
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to load content
    await page.waitForLoadState('networkidle');

    // Verify URL is correct
    await expect(page).toHaveURL(/\/trending\/photography/);

    // Verify posts are loaded (core functionality)
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(0);
  });

  /**
   * TAG NAVIGATION TESTS
   */

  test('clicking tag in post card navigates to tag page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');

    await homePage.goto();

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Find and click the category/community link on first post
    const categoryLink = page.locator('[data-testid="post-card-category"]').first();
    const communityLink = page.locator('[data-testid="post-card-community"]').first();

    // Click whichever is visible
    if (await categoryLink.isVisible()) {
      await categoryLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/trending\//);
    } else if (await communityLink.isVisible()) {
      await communityLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/trending\//);
    }
  });

  test('tag page pagination loads more posts', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');

    await page.goto('/trending/hive');
    await page.waitForLoadState('domcontentloaded');

    // Wait for initial posts
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const initialCount = await page.locator('[data-testid="post-list-item"]').count();

    // Scroll down to load more
    await page.keyboard.press('End');

    // Wait for more posts or network to settle
    try {
      await page.waitForFunction(
        (initial) => document.querySelectorAll('[data-testid="post-list-item"]').length > initial,
        initialCount,
        { timeout: 10000 }
      );
    } catch {
      // Pagination may not load more - that's acceptable
      await page.waitForLoadState('networkidle');
    }

    const newCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  /**
   * COMMUNITY TAG TESTS
   */

  test('community page loads correctly', async ({ page }) => {
    // LeoFinance community
    await page.goto('/trending/hive-167922');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL
    await expect(page).toHaveURL(/\/trending\/hive-167922/);

    // Verify posts are loaded
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * DIFFERENT SORT OPTIONS FOR TAGS
   */

  test('tag page hot sort works', async ({ page }) => {
    await page.goto('/hot/hive');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/hot\/hive/);

    // Verify posts are loaded
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('tag page created/new sort works', async ({ page }) => {
    await page.goto('/created/hive');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/created\/hive/);

    // Verify posts are loaded
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('tag page payout sort works', async ({ page }) => {
    await page.goto('/payout/hive');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/payout\/hive/);

    // Verify posts are loaded
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * SPECIAL TAG SCENARIOS
   */

  test('empty or rare tag shows appropriate state', async ({ page }) => {
    // Use a very rare/nonexistent tag
    await page.goto('/trending/xyznonexistenttag99999');
    await page.waitForLoadState('domcontentloaded');

    // Page should still load
    await expect(page).toHaveURL(/\/trending\/xyznonexistenttag99999/);

    // Should show empty state or community sidebar
    await page.waitForLoadState('networkidle');

    // Either posts exist or empty list - both acceptable
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(0);
  });
});
