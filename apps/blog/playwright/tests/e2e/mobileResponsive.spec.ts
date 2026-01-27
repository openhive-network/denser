import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

/**
 * Mobile viewport sizes based on common devices
 */
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE
const TABLET_VIEWPORT = { width: 768, height: 1024 }; // iPad

test.describe('Mobile Responsive tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * Helper to navigate to homepage with mobile viewport and wait for content
   */
  async function gotoHomePageMobile(page: HomePage['page']) {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="post-list-item"]').first()).toBeVisible({ timeout: 15000 });
  }

  /**
   * MOBILE NAVIGATION TESTS
   */

  test('hamburger menu is visible on mobile', async ({ page }) => {
    await gotoHomePageMobile(page);

    // Hamburger menu should be visible on mobile viewport
    await expect(homePage.getNavSidebarMenu).toBeVisible();
  });

  test('hamburger menu opens sidebar with navigation options', async ({ page }) => {
    await gotoHomePageMobile(page);

    // Ensure hamburger button is visible and clickable
    await expect(homePage.getNavSidebarMenu).toBeVisible();
    await expect(homePage.getNavSidebarMenu).toBeEnabled();

    // Click hamburger menu
    await homePage.getNavSidebarMenu.click();

    // Sidebar content should be visible with navigation options
    await expect(homePage.getNavSidebarMenuContent).toBeVisible();
    await expect(homePage.getNavSidebarMenuContent.getByText('Welcome')).toBeVisible();

    // Close sidebar by pressing Escape
    await page.keyboard.press('Escape');

    // Sidebar should be closed
    await expect(homePage.getNavSidebarMenuContent).not.toBeVisible();
  });

  /**
   * RESPONSIVE LAYOUT TESTS
   */

  test('post list is visible on mobile', async ({ page }) => {
    await gotoHomePageMobile(page);

    // Posts should be visible and have expected count
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(1);
  });

  test('trending communities sidebar is hidden on mobile', async ({ page }) => {
    await gotoHomePageMobile(page);

    // Trending communities sidebar should not be visible on mobile viewport
    await expect(homePage.getTrendingCommunitiesSideBar).not.toBeVisible();
  });

  /**
   * TABLET VIEWPORT TESTS
   */

  test('tablet viewport shows sidebar and posts', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Posts should be visible
    await expect(page.locator('[data-testid="post-list-item"]').first()).toBeVisible({ timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(1);

    // On tablet, trending communities sidebar should be visible
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  /**
   * POST CARD RESPONSIVE TESTS
   */

  test('post cards display correctly on mobile', async ({ page }) => {
    await gotoHomePageMobile(page);

    // First post should have all essential elements visible
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostAuthor).toBeVisible();
    await expect(homePage.getFirstPostCardAvatar).toBeVisible();
    await expect(homePage.getFirstPostPayout).toBeVisible();
  });

  test('post navigation works on mobile', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Touch navigation timing issues on WebKit');

    await gotoHomePageMobile(page);

    // Get first post title text before clicking
    const firstPostTitle = await homePage.getFirstPostTitle.textContent();
    await homePage.getFirstPostTitle.click();

    // Verify navigation to post page with correct title
    const articleTitle = page.locator('[data-testid="article-title"]');
    await expect(articleTitle).toBeVisible({ timeout: 15000 });
    await expect(articleTitle).toHaveText(firstPostTitle!);
  });

  /**
   * SEARCH ON MOBILE
   */

  test('search page works on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    // Search input should be visible and functional
    await expect(homePage.getNavSearchAIInput).toBeVisible();
  });

  /**
   * PROFILE PAGE ON MOBILE
   */

  test('profile page displays correctly on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/@gtg');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL
    await expect(page).toHaveURL(/@gtg/);

    // Profile elements should be visible
    const profilePage = await import('../support/pages/profilePage').then(m => new m.ProfilePage(page));
    await expect(profilePage.profileName).toBeVisible({ timeout: 15000 });
    await expect(profilePage.profileInfo).toBeVisible();

    // Navigation tabs should be visible on mobile
    await expect(profilePage.profileBlogLink).toBeVisible();
    await expect(profilePage.profilePostsLink).toBeVisible();
  });
});
