import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';

test.describe('Mobile responsive tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('MB-01: Mobile hamburger menu works', async () => {
    await homePage.gotoMobile();

    // Hamburger menu should be visible on mobile
    await expect(homePage.getNavSidebarMenu).toBeVisible();
    await expect(homePage.getNavSidebarMenu).toBeEnabled();

    // Click hamburger menu and verify sidebar opens
    await homePage.getNavSidebarMenu.click();
    await expect(homePage.getNavSidebarMenuContent).toBeVisible();
    await expect(homePage.getNavSidebarMenuContent.getByText('Welcome')).toBeVisible();

    // Close sidebar
    await homePage.closeSidebar();
  });

  test('MB-02: Mobile posts load and display', async () => {
    await homePage.gotoMobile();

    // Posts should be visible on mobile
    const postsCount = await homePage.getPostsCount();
    expect(postsCount).toBeGreaterThanOrEqual(1);

    // First post should have essential elements
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostAuthor).toBeVisible();
    await expect(homePage.getFirstPostCardAvatar).toBeVisible();
  });
});
