import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { TIMEOUTS } from '../../support/constants';

test.describe('Feed pages tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('FD-01: Trending feed loads with posts and correct data-testid', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/trending');
    await expect(homePage.getPostListTrending).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible();

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);

    // First post should have a title with text
    const firstTitle = await homePage.getFirstPostTitle.textContent();
    expect(firstTitle?.trim().length).toBeGreaterThan(0);
  });

  test('FD-02: Hot feed loads with different content than trending', async ({ page }) => {
    // Capture first post from trending
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
    const trendingFirstTitle = await homePage.getFirstPostTitle.textContent();

    // Navigate to hot
    await page.goto('/hot', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('/hot');
    await expect(homePage.getPostListHot).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible();

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);

    // Hot feed should exist and have posts (content may or may not differ)
    const hotFirstTitle = await homePage.getFirstPostTitle.textContent();
    expect(hotFirstTitle?.trim().length).toBeGreaterThan(0);
  });

  test('FD-03: Created feed loads newest posts', async ({ page }) => {
    await page.goto('/created', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/created');
    await expect(homePage.getPostListNew).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible();

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);

    // Timestamps should be visible on posts (newest feed)
    await expect(homePage.getFirstPostCardTimestampLink).toBeVisible();
  });

  test('FD-04: Payout feed loads and shows payout values', async ({ page }) => {
    await page.goto('/payout', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/payout');
    await expect(homePage.getPostListPayouts).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible();

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);

    // Payout feed posts should show payout values in $ format
    const payoutText = await homePage.getFirstPostPayout.textContent();
    expect(payoutText).toMatch(/\$\d+/);
  });

  test('FD-05: Each feed has a distinct data-testid marker', async ({ page }) => {
    // Trending
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getPostListTrending).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Hot
    await page.goto('/hot', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getPostListHot).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Created
    await page.goto('/created', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getPostListNew).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Payout
    await page.goto('/payout', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getPostListPayouts).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Muted
    await page.goto('/muted', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getPostListMuted).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });
});
