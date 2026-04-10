import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { PostPage } from '../../support/pages/postPage';
import { PAGINATION, TIMEOUTS } from '../../support/constants';

test.describe('Homepage tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
  });

  test('HP-01: Homepage loads with posts', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('HP-02: Post card has required elements', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Every post card should have title, author, payout
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostAuthor).toBeVisible();
    await expect(homePage.getFirstPostCardAvatar).toBeVisible();
    await expect(homePage.getFirstPostPayout).toBeVisible();
  });

  test('HP-03: Pagination / infinite scroll loads more posts', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(PAGINATION.INITIAL_POSTS_COUNT, {
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Scroll to bottom to trigger infinite scroll
    await page.keyboard.press('End');

    await page.waitForFunction(
      (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
      PAGINATION.MIN_POSTS_AFTER_SCROLL,
      { timeout: TIMEOUTS.HYDRATION }
    );

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
  });

  test('HP-04: Navigate to post from feed', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getFirstPostTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const postTitle = await homePage.getFirstPostTitle.textContent();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.articleTitle).toHaveText(postTitle!);
  });

  test('HP-05: Navigate to author profile from feed', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getFirstPostAuthor).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    await homePage.getFirstPostAuthor.click();

    await expect(page).toHaveURL(/@/);
  });
});
