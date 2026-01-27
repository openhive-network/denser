import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

/**
 * Mobile viewport sizes
 */
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE
const TABLET_VIEWPORT = { width: 768, height: 1024 }; // iPad

test.describe('Mobile Responsive tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * MOBILE NAVIGATION TESTS
   */

  test('hamburger menu is visible on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Hamburger menu should be visible
    await expect(homePage.getNavSidebarMenu).toBeVisible();
  });

  test('hamburger menu can be clicked', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Ensure hamburger button is visible and clickable
    await expect(homePage.getNavSidebarMenu).toBeVisible();
    await expect(homePage.getNavSidebarMenu).toBeEnabled();

    // Click hamburger menu - verify it's interactive
    await homePage.getNavSidebarMenu.click();

    // Wait for any UI change - Sheet might open or close
    await page.waitForTimeout(500);

    // Page should still be functional after clicking
    await expect(page.locator('body')).toBeVisible();

    // Try to close any open sheet by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify page is still functional
    await expect(page.locator('body')).toBeVisible();
  });

  /**
   * RESPONSIVE LAYOUT TESTS
   */

  test('post list is visible on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Posts should still be visible
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('trending communities sidebar is hidden on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to fully load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Trending communities sidebar should be hidden on mobile
    const sidebar = page.locator('[data-testid="card-trending-comunities"]');

    // Check if sidebar exists and is hidden
    if (await sidebar.count() > 0) {
      const display = await homePage.getElementCssPropertyValue(sidebar, 'display');
      expect(display).toBe('none');
    }
  });

  /**
   * TABLET VIEWPORT TESTS
   */

  test('tablet viewport shows appropriate layout', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Posts should be visible
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * POST CARD RESPONSIVE TESTS
   */

  test('post cards display correctly on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // First post should have essential elements
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostAuthor).toBeVisible();
  });

  test('post navigation works on mobile', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Touch navigation timing issues on WebKit');

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Click on first post
    const firstPostTitle = await homePage.getFirstPostTitle.textContent();
    await homePage.getFirstPostTitle.click();

    // Verify navigation to post page
    await page.waitForSelector('[data-testid="article-title"]', { timeout: 15000 });
    const articleTitle = await page.locator('[data-testid="article-title"]').textContent();
    expect(articleTitle).toBe(firstPostTitle);
  });

  /**
   * SEARCH ON MOBILE
   */

  test('search page works on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    // Search elements should be visible
    await expect(page.locator('button[aria-label="Search"]')).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  /**
   * PROFILE PAGE ON MOBILE
   */

  test('profile page displays correctly on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/@gtg');
    await page.waitForLoadState('domcontentloaded');

    // Wait for profile to load
    await page.waitForLoadState('networkidle');

    // Verify URL and page loaded
    await expect(page).toHaveURL(/@gtg/);
    await expect(page.locator('body')).toBeVisible();
  });

  /**
   * DIFFERENT FEED PAGES ON MOBILE
   */

  test('hot feed works on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/hot');
    await page.waitForLoadState('domcontentloaded');

    // Posts should be visible
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('created feed works on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/created');
    await page.waitForLoadState('domcontentloaded');

    // Posts should be visible
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });
});
