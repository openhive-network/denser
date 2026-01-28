import { expect, test } from '@playwright/test';
import { HomePage, MOBILE_VIEWPORT, TABLET_VIEWPORT } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';

test.describe('Mobile Responsive tests', () => {
  let homePage: HomePage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    profilePage = new ProfilePage(page);
  });

  /**
   * MOBILE NAVIGATION TESTS
   */

  test('hamburger menu is visible on mobile', async () => {
    await homePage.gotoMobile();

    // Hamburger menu should be visible on mobile viewport
    await expect(homePage.getNavSidebarMenu).toBeVisible();
  });

  test('hamburger menu opens sidebar with navigation options', async () => {
    await homePage.gotoMobile();

    // Ensure hamburger button is visible and clickable
    await expect(homePage.getNavSidebarMenu).toBeVisible();
    await expect(homePage.getNavSidebarMenu).toBeEnabled();

    // Click hamburger menu
    await homePage.getNavSidebarMenu.click();

    // Sidebar content should be visible with navigation options
    await expect(homePage.getNavSidebarMenuContent).toBeVisible();
    await expect(homePage.getNavSidebarMenuContent.getByText('Welcome')).toBeVisible();

    // Close sidebar
    await homePage.closeSidebar();
  });

  /**
   * RESPONSIVE LAYOUT TESTS
   */

  test('post list is visible on mobile', async () => {
    await homePage.gotoMobile();

    // Posts should be visible and have expected count
    const postsCount = await homePage.getPostsCount();
    expect(postsCount).toBeGreaterThanOrEqual(1);
  });

  test('trending communities sidebar is hidden on mobile', async () => {
    await homePage.gotoMobile();

    // Trending communities sidebar should not be visible on mobile viewport
    await expect(homePage.getTrendingCommunitiesSideBar).not.toBeVisible();
  });

  /**
   * TABLET VIEWPORT TESTS
   */

  test('tablet viewport shows sidebar and posts', async () => {
    await homePage.gotoTablet();

    // Posts should be visible
    const postsCount = await homePage.getPostsCount();
    expect(postsCount).toBeGreaterThanOrEqual(1);

    // On tablet, trending communities sidebar should be visible
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  /**
   * POST CARD RESPONSIVE TESTS
   */

  test('post cards display correctly on mobile', async () => {
    await homePage.gotoMobile();

    // First post should have all essential elements visible
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostAuthor).toBeVisible();
    await expect(homePage.getFirstPostCardAvatar).toBeVisible();
    await expect(homePage.getFirstPostPayout).toBeVisible();
  });

  test('post navigation works on mobile', async ({ browserName }) => {
    test.skip(browserName === 'webkit', 'Touch navigation timing issues on WebKit');

    await homePage.gotoMobile();

    // Get first post title text before clicking
    const firstPostTitle = await homePage.getFirstPostTitle.textContent();
    await homePage.getFirstPostTitle.click();

    // Verify navigation to post page with correct title
    await expect(homePage.articleTitle).toBeVisible({ timeout: 15000 });
    await expect(homePage.articleTitle).toHaveText(firstPostTitle!);
  });

  /**
   * SEARCH ON MOBILE
   */

  test('search page works on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    // Search input should be visible and functional (default is classic mode)
    await expect(homePage.getNavSearchClassicInput).toBeVisible();
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
    await expect(profilePage.profileName).toBeVisible({ timeout: 15000 });
    await expect(profilePage.profileInfo).toBeVisible();

    // Navigation tabs should be visible on mobile
    await expect(profilePage.profileBlogLink).toBeVisible();
    await expect(profilePage.profilePostsLink).toBeVisible();
  });
});
