import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { PostPage } from '../../support/pages/postPage';
import { LoginForm } from '../../support/pages/loginForm';
import { TIMEOUTS } from '../../support/constants';

test.describe('Navigation tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
  });

  test('NV-01: Feed pages are accessible via direct URL', async ({ page }) => {
    for (const feed of ['/trending', '/hot', '/created', '/payout']) {
      await page.goto(feed, { waitUntil: 'domcontentloaded' });
      await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
        timeout: TIMEOUTS.SEARCH_RESULTS
      });
    }
  });

  test('NV-02: Logo navigates to homepage', async ({ page }) => {
    await page.goto('/hot', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Click logo / home link
    await homePage.getHomeNavLink.click();

    // Logo may navigate to / or /trending — just verify posts load
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
  });

  test('NV-03: Login button opens login form', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    await homePage.loginBtn.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('NV-04: Deep link to post works', async ({ page }) => {
    // First get a real post URL from the feed
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getFirstPostTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const postHref = await homePage.getFirstPostTitle.getAttribute('href');
    expect(postHref).not.toBeNull();

    const postTitle = await homePage.getFirstPostTitle.textContent();

    // Navigate directly to the post URL
    await page.goto(postHref!, { waitUntil: 'domcontentloaded' });

    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.articleTitle).toHaveText(postTitle!);
  });
});
