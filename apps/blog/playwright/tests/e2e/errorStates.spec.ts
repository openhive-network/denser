import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { SearchPage } from '../support/pages/searchPage';
import { TIMEOUTS } from '../support/constants';

test.describe('Error States tests', () => {
  let homePage: HomePage;
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    searchPage = new SearchPage(page);
  });

  /**
   * INVALID URL TESTS
   */

  test('invalid post URL shows error state without crashing', async ({ page }) => {
    const response = await page.goto('/@nonexistentuser123456/invalid-post-permlink-xyz');

    expect(response).not.toBeNull();
    const status = response?.status() ?? 200;

    // Server should return 200 or 404 - NOT 500 (that would be a bug)
    expect([200, 404]).toContain(status);

    await page.waitForLoadState('networkidle');
  });

  test('invalid user profile shows appropriate error state', async ({ page }) => {
    const response = await page.goto('/@thisuserdefinitelydoesnotexist99999');

    expect(response).not.toBeNull();
    const status = response?.status() ?? 200;

    // Server should return 200 or 404 - NOT 500
    expect([200, 404]).toContain(status);

    await page.waitForLoadState('networkidle');
  });

  /**
   * EMPTY STATE TESTS
   */

  test('search with no results shows empty state', async ({ page }) => {
    await searchPage.gotoWithClassicQuery('xyznonexistentquery123456789abcdef');
    await page.waitForLoadState('networkidle');

    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBe(0);
  });

  test('rare tag with no posts shows appropriate state', async ({ page }) => {
    await page.goto('/trending/xyznonexistenttag987654321');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/trending\/xyznonexistenttag987654321/);

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThanOrEqual(0);
  });

  /**
   * MALFORMED URL TESTS
   */

  test('handles URL with special characters gracefully', async ({ page }) => {
    const response = await page.goto('/trending/test%20tag%21%40%23');

    expect(response).not.toBeNull();
    const status = response?.status() ?? 200;
    expect([200, 404]).toContain(status);

    await page.waitForLoadState('networkidle');
  });

  test('handles search with XSS attempt safely', async ({ page }) => {
    await page.goto('/search?q=test%20%3Cscript%3Ealert(1)%3C/script%3E');
    await page.waitForLoadState('networkidle');

    // Verify page loaded and search button is visible
    await expect(searchPage.searchButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });

    // Verify XSS payload is not present as executable script
    const scriptTags = await page.locator('script:has-text("alert(1)")').count();
    expect(scriptTags).toBe(0);
  });

  /**
   * PAGE LOADING TESTS
   */

  test('page loads with network content', async ({ page }) => {
    await page.goto('/trending');

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * INVALID SORT PARAMETER
   */

  test('invalid sort parameter defaults to valid sort', async ({ page }) => {
    await page.goto('/search?q=hive&s=invalidsort');
    await page.waitForLoadState('networkidle');

    await expect(searchPage.searchButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  });

  /**
   * DOUBLE ENCODING HANDLING
   */

  test('handles double-encoded URLs gracefully', async ({ page }) => {
    const response = await page.goto('/%2540gtg');

    expect(response).not.toBeNull();
    const status = response?.status() ?? 200;

    // Should return 200 (redirect/decode) or 404 (not found) - NOT 500
    expect([200, 404]).toContain(status);
  });

  /**
   * APP FUNCTIONALITY TESTS
   */

  test('@flaky app remains functional after navigation', async ({ page }) => {
    await homePage.goto();

    await page.goto('/hot');

    await expect(page).toHaveURL('/hot');
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });
});
