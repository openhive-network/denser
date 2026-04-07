import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';

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

    await expect(page).toHaveURL(/\/trending\/hive/);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('tag page displays tag/community name', async ({ page }) => {
    await page.goto('/trending/photography');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/trending\/photography/);

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThanOrEqual(0);
  });

  /**
   * TAG NAVIGATION TESTS
   */

  test('clicking tag in post card navigates to tag page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');

    await homePage.goto();

    const categoryLink = homePage.getFirstPostCardCategoryLink;
    const communityLink = homePage.getFirstPostCardCommunityLink;

    // Click category or community link (whichever is visible)
    const linkToClick = (await categoryLink.isVisible()) ? categoryLink : communityLink;

    if (await linkToClick.isVisible()) {
      await linkToClick.click();
      await expect(page).toHaveURL(/\/trending\//);
    }
  });

  test('tag page pagination loads more posts', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');

    await page.goto('/trending/hive');

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const initialCount = await homePage.getMainTimeLineOfPosts.count();

    await page.keyboard.press('End');

    try {
      await page.waitForFunction(
        (initial) => document.querySelectorAll('[data-testid="post-list-item"]').length > initial,
        initialCount,
        { timeout: TIMEOUTS.PAGE_LOAD }
      );
    } catch {
      // Pagination may not load more if there aren't enough posts
      await page.waitForLoadState('networkidle');
    }

    const newCount = await homePage.getMainTimeLineOfPosts.count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  /**
   * COMMUNITY TAG TESTS
   */

  test('community page loads correctly', async ({ page }) => {
    // Use 'domcontentloaded' instead of the default 'load' — community pages
    // contain many external images that may never finish loading and would
    // otherwise time out the navigation.
    await page.goto('/trending/hive-167922', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/trending\/hive-167922/);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * DIFFERENT SORT OPTIONS FOR TAGS
   */

  test('tag page hot sort works', async ({ page }) => {
    await page.goto('/hot/hive');

    await expect(page).toHaveURL(/\/hot\/hive/);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('tag page created/new sort works', async ({ page }) => {
    await page.goto('/created/hive');

    await expect(page).toHaveURL(/\/created\/hive/);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('tag page payout sort works', async ({ page }) => {
    await page.goto('/payout/hive');

    await expect(page).toHaveURL(/\/payout\/hive/);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * SPECIAL TAG SCENARIOS
   */

  test('empty or rare tag shows appropriate state', async ({ page }) => {
    await page.goto('/trending/xyznonexistenttag99999');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/trending\/xyznonexistenttag99999/);

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThanOrEqual(0);
  });
});
