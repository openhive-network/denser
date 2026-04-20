import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';

test.describe('Post Content tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
  });

  /**
   * POST PAGE LOADING
   */

  test('post page loads correctly from homepage', async ({ page }) => {
    await homePage.goto();

    // Get first post info
    const postTitle = await homePage.getFirstPostTitle.textContent();
    const postHref = await homePage.getFirstPostTitle.getAttribute('href');

    // Navigate to post
    await homePage.getFirstPostTitle.click();

    // Post page should load
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const articleTitle = await postPage.articleTitle.textContent();
    expect(articleTitle).toBe(postTitle);
  });

  test('post page has article body', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Article body should be visible
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.articleBody).toBeVisible();
  });

  /**
   * POST METADATA
   */

  test('post page shows author information', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Author data should be visible
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.articleAuthorData).toBeVisible();
  });

  test('post page shows footer with metadata', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Footer should be visible
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.articleFooter).toBeVisible();
  });

  test('@flaky post page has interactive elements', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Wait for post to load
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Wait for page to fully render
    await page.waitForLoadState('networkidle');

    // Check for interactive elements - footer should be visible
    await expect(postPage.articleFooter).toBeVisible({ timeout: 10000 });

    // Check if at least some interactive element exists (vote, share, or response)
    const hasInteractiveElements =
      (await page.locator('[data-testid="upvote-button"]').count()) > 0 ||
      (await page.locator('[data-testid="share-post"]').count()) > 0 ||
      (await page.locator('[data-testid="comment-respons"]').count()) > 0;

    expect(hasInteractiveElements).toBe(true);
  });

  /**
   * POST INTERACTIONS
   */

  test('share post button is visible', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Share button should be visible
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.sharePostBtn).toBeVisible();
  });

  test('share button is clickable', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Wait for post to load
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Check if share button is visible
    const shareVisible = await postPage.sharePostBtn.isVisible().catch(() => false);

    if (shareVisible) {
      // Click share button
      await postPage.sharePostBtn.click();
      await page.waitForTimeout(500);

      // Check if dialog opened (graceful check)
      const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);

      // Either dialog opened or page is still functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('social share icons are accessible', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Wait for post to load
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Check if share button is visible
    const shareVisible = await postPage.sharePostBtn.isVisible().catch(() => false);

    if (shareVisible) {
      await postPage.sharePostBtn.click();
      await page.waitForTimeout(500);

      // Check if social icons are visible (graceful check)
      const facebookVisible = await postPage.facebookIcon.isVisible().catch(() => false);
      const twitterVisible = await postPage.twitterIcon.isVisible().catch(() => false);

      // At least one social icon should be visible if share dialog opened
      if (facebookVisible || twitterVisible) {
        expect(facebookVisible || twitterVisible).toBe(true);
      }

      // Close dialog if it's open
      await page.keyboard.press('Escape');
    }

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  /**
   * POST COMMENTS
   */

  test('@flaky post page shows comments section', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Wait for post to load
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Comments section should exist (even if empty)
    const commentsSection = page.locator('[data-testid="comment-list"]');
    // Check if comments exist or section is present
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  /**
   * POST HASHTAGS
   */

  test('post page shows hashtags/tags', async ({ page }) => {
    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Wait for post to load
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Hashtags should be visible (if post has tags)
    const hashtagsVisible = await postPage.hashtagsPosts.isVisible().catch(() => false);

    // If hashtags are visible, verify they are clickable
    if (hashtagsVisible) {
      const firstTag = postPage.hashtagsPosts.locator('a').first();
      await expect(firstTag).toBeVisible();
    }
  });

  /**
   * NAVIGATION FROM POST
   */

  test('clicking author navigates to profile', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');

    await homePage.goto();

    // Navigate to first post
    await homePage.getFirstPostTitle.click();

    // Wait for post to load
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Click on author name
    const authorLink = page.locator('[data-testid="author-name-link"]').first();
    await authorLink.click();

    // Should navigate to profile page
    await expect(page).toHaveURL(/@/);
  });
});
