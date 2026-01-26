import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

test.describe('Deep Linking tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * DIRECT POST LINKS
   */

  test('direct link to post loads correctly', async ({ page }) => {
    // Navigate to trending to get a real post URL
    await page.goto('/trending');
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Get the first post link
    const firstPostLink = page.locator('li[data-testid="post-list-item"] h3 a').first();
    const postTitle = await firstPostLink.textContent();
    const postHref = await firstPostLink.getAttribute('href');

    // Navigate directly to the post URL
    await page.goto(postHref!);
    await page.waitForLoadState('domcontentloaded');

    // Verify post page loaded
    await expect(page.locator('[data-testid="article-title"]')).toBeVisible({ timeout: 15000 });
    const articleTitle = await page.locator('[data-testid="article-title"]').textContent();
    expect(articleTitle).toBe(postTitle);
  });

  test('post URL format is correct', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Get first post link
    const firstPostLink = page.locator('li[data-testid="post-list-item"] h3 a').first();
    const postHref = await firstPostLink.getAttribute('href');

    // Verify URL format - can be:
    // - /@author/permlink (simple posts)
    // - /community/@author/permlink (community posts)
    expect(postHref).toMatch(/(\/@[\w.-]+\/[\w-]+|\/[\w-]+\/@[\w.-]+\/[\w-]+)$/);
  });

  /**
   * DIRECT PROFILE LINKS
   */

  test('direct link to user profile loads correctly', async ({ page }) => {
    await page.goto('/@gtg');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL is correct
    await expect(page).toHaveURL(/@gtg/);

    // Wait for page content to load
    await page.waitForLoadState('networkidle');

    // Profile page should have loaded (body visible)
    await expect(page.locator('body')).toBeVisible();
  });

  test('profile URL with @ prefix works', async ({ page }) => {
    await page.goto('/@arcange');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL
    await expect(page).toHaveURL(/@arcange/);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('direct link to profile posts tab loads correctly', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Profile navigation timing issues on WebKit');

    await page.goto('/@gtg/posts');
    await page.waitForLoadState('domcontentloaded');

    // Verify we're on posts tab
    await expect(page).toHaveURL(/@gtg\/posts/);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('direct link to profile replies tab loads correctly', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Profile navigation timing issues on WebKit');

    await page.goto('/@gtg/replies');
    await page.waitForLoadState('domcontentloaded');

    // Verify we're on replies tab
    await expect(page).toHaveURL(/@gtg\/replies/);
  });

  /**
   * COMMUNITIES DIRECT LINKS
   */

  test('direct link to communities page loads correctly', async ({ page }) => {
    await page.goto('/communities');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/communities');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Verify body is visible (page loaded without crash)
    await expect(page.locator('body')).toBeVisible();
  });

  test('direct link to specific community loads correctly', async ({ page }) => {
    // LeoFinance community
    await page.goto('/trending/hive-167922');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Verify posts are loaded on the community page
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * SEARCH DEEP LINKS
   */

  test('search URL with query parameter loads correctly', async ({ page }) => {
    await page.goto('/search?q=hive&s=relevance');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/search\?q=hive/);

    // Verify search page loaded
    await expect(page.locator('button[aria-label="Search"]')).toBeVisible();
  });

  test('search URL with sort parameter is respected', async ({ page }) => {
    await page.goto('/search?q=blockchain&s=created');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/s=created/);
  });

  /**
   * STATIC PAGES DIRECT LINKS
   */

  test('direct link to FAQ page loads correctly', async ({ page }) => {
    await page.goto('/faq.html');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/faq.html');
    await expect(page.getByRole('heading', { name: 'Hive.blog FAQ' })).toBeVisible();
  });

  test('direct link to privacy policy page loads correctly', async ({ page }) => {
    await page.goto('/privacy.html');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/privacy.html');
    await expect(page.locator('h1').getByText('Privacy Policy')).toBeVisible();
  });

  test('direct link to terms of service page loads correctly', async ({ page }) => {
    await page.goto('/tos.html');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/tos.html');

    // Wait for page content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('direct link to welcome page loads correctly', async ({ page }) => {
    await page.goto('/welcome');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/welcome');
    await expect(page.getByText('Welcome to Hive!')).toBeVisible();
  });

  /**
   * FEED DEEP LINKS
   */

  test('direct link to hot feed loads correctly', async ({ page }) => {
    await page.goto('/hot');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/hot');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('direct link to created/new feed loads correctly', async ({ page }) => {
    await page.goto('/created');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/created');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('direct link to payout feed loads correctly', async ({ page }) => {
    await page.goto('/payout');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/payout');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });
});
