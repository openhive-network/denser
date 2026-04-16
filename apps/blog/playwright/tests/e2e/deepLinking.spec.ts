import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { PostPage } from '../support/pages/postPage';
import { SearchPage } from '../support/pages/searchPage';
import { TIMEOUTS } from '../support/constants';

test.describe('Deep Linking tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    searchPage = new SearchPage(page);
  });

  /**
   * DIRECT POST LINKS
   */

  test('direct link to post loads correctly', async ({ page }) => {
    await homePage.goto();

    const postTitle = await homePage.getFirstPostTitle.textContent();
    const postHref = await homePage.getFirstPostTitle.getAttribute('href');

    if (!postHref) {
      throw new Error('Post href is null - cannot proceed with deep link test');
    }

    await page.goto(postHref);

    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const articleTitle = await postPage.articleTitle.textContent();
    expect(articleTitle).toBe(postTitle);
  });

  test('post URL format is correct', async () => {
    await homePage.goto();

    const postHref = await homePage.getFirstPostTitle.getAttribute('href');

    expect(postHref).not.toBeNull();
    // URL format: /@author/permlink OR /community/@author/permlink
    expect(postHref).toMatch(/(\/@[\w.-]+\/[^\s/]+|\/[\w-]+\/@[\w.-]+\/[^\s/]+)$/);
  });

  /**
   * DIRECT PROFILE LINKS
   */

  test('direct link to user profile loads correctly', async ({ page }) => {
    const response = await page.goto('/@gtg');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/@gtg/);
  });

  test('profile URL with @ prefix works', async ({ page }) => {
    const response = await page.goto('/@arcange');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/@arcange/);
  });

  test('direct link to profile posts tab loads correctly', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Profile navigation timing issues on WebKit');

    const response = await page.goto('/@gtg/posts');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/@gtg\/posts/);
  });

  test('direct link to profile replies tab loads correctly', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Profile navigation timing issues on WebKit');

    await page.goto('/@gtg/replies');

    await expect(page).toHaveURL(/@gtg\/replies/);
  });

  /**
   * COMMUNITIES DIRECT LINKS
   */

  test('direct link to communities page loads correctly', async ({ page }) => {
    const response = await page.goto('/communities');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL('/communities');
  });

  test('direct link to specific community loads correctly', async ({ page }) => {
    // Use 'domcontentloaded' instead of the default 'load' — community pages
    // contain many external images that may never finish loading and would
    // otherwise time out the navigation.
    await page.goto('/trending/hive-167922', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * SEARCH DEEP LINKS
   */

  test('search URL with query parameter loads correctly', async ({ page }) => {
    await searchPage.gotoWithClassicQuery('hive', 'relevance');

    await expect(page).toHaveURL(/\/search\?q=hive/);
    await expect(searchPage.searchButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  });

  test('search URL with sort parameter is respected', async ({ page }) => {
    await page.goto('/search?q=blockchain&s=created');

    await expect(page).toHaveURL(/s=created/);
  });

  /**
   * STATIC PAGES DIRECT LINKS
   */

  test('direct link to FAQ page loads correctly', async ({ page }) => {
    await page.goto('/faq.html');

    await expect(page).toHaveURL('/faq.html');
    await expect(page.getByRole('heading', { name: 'Hive.blog FAQ' })).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE
    });
  });

  test('direct link to privacy policy page loads correctly', async ({ page }) => {
    await page.goto('/privacy.html');

    await expect(page).toHaveURL('/privacy.html');
    await expect(page.locator('h1').getByText('Privacy Policy')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE
    });
  });

  test('direct link to terms of service page loads correctly', async ({ page }) => {
    await page.goto('/tos.html');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/tos.html');
  });

  test('direct link to welcome page loads correctly', async ({ page }) => {
    await page.goto('/welcome');

    await expect(page).toHaveURL('/welcome');
    await expect(page.getByText('Welcome to Hive!')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE
    });
  });

  /**
   * FEED DEEP LINKS
   */

  test('@flaky direct link to hot feed loads correctly', async ({ page }) => {
    await page.goto('/hot');

    await expect(page).toHaveURL('/hot');

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('@flaky direct link to created/new feed loads correctly', async ({ page }) => {
    await page.goto('/created');

    await expect(page).toHaveURL('/created');

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('direct link to payout feed loads correctly', async ({ page }) => {
    await page.goto('/payout');

    await expect(page).toHaveURL('/payout');

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });
});
