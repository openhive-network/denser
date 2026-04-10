import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { TIMEOUTS } from '../../support/constants';

test.describe('Feed pages tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('FD-01: Trending feed loads', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/trending');
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('FD-02: Hot feed loads', async ({ page }) => {
    await page.goto('/hot', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/hot');
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('FD-03: Created feed loads', async ({ page }) => {
    await page.goto('/created', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/created');
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('FD-04: Payout feed loads', async ({ page }) => {
    await page.goto('/payout', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/payout');
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });
});
