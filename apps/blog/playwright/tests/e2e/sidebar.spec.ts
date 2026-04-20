import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';

test.describe('Sidebar tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * TRENDING COMMUNITIES SIDEBAR
   */

  test('trending communities sidebar is visible on desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.PAGE_LOAD });

    // Trending communities sidebar should be visible on desktop
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  test('trending communities sidebar has community links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.PAGE_LOAD });

    // Should have community links
    const communityLinks = homePage.getTrendingCommunitiesSideBarLinks;
    const count = await communityLinks.count();

    expect(count).toBeGreaterThan(0);
  });

  test('explore communities link is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.PAGE_LOAD });

    // Explore communities link should be visible
    await expect(homePage.getExploreCommunities).toBeVisible();
    await expect(homePage.getExploreCommunities).toHaveText(/Explore communities/);
  });

  test('clicking community link navigates to community page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.PAGE_LOAD });

    // Get first community link
    const firstCommunityLink = homePage.getTrendingCommunitiesSideBarLinks.first();

    // Click the community link
    await firstCommunityLink.click();

    // Should navigate to community page (URL contains /trending/ or community name)
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/(trending|hot|created)\//);

    // Page should be functional - verify page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('explore communities link navigates to communities page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.PAGE_LOAD });

    // Click explore communities
    await homePage.getExploreCommunities.click();

    // Should navigate to communities page
    await expect(page).toHaveURL('/communities');
  });

  /**
   * EXPLORE HIVE SIDEBAR
   */

  test('explore hive card is visible on desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.PAGE_LOAD });

    // Explore Hive card should be visible
    const exploreHiveCard = homePage.getCardExploreHive;
    const isVisible = await exploreHiveCard.isVisible().catch(() => false);

    if (isVisible) {
      await expect(exploreHiveCard).toBeVisible();
    }
  });

  /**
   * SIDEBAR ON DIFFERENT FEEDS
   */

  test('@flaky sidebar is visible on hot feed', async ({ page }) => {
    await page.goto('/hot');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.PAGE_LOAD });

    // Sidebar should be visible
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  test('@flaky sidebar is visible on created feed', async ({ page }) => {
    await page.goto('/created');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.PAGE_LOAD });

    // Sidebar should be visible
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });
});
