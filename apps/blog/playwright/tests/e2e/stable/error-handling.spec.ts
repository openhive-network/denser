import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { SearchPage } from '../../support/pages/searchPage';
import { TIMEOUTS } from '../../support/constants';

test.describe('Error handling tests', () => {
  test('ER-01: Invalid post URL returns 200 or 404, not 500', async ({ page }) => {
    const response = await page.goto('/@nonexistentuser123456/invalid-post-permlink-xyz', {
      waitUntil: 'domcontentloaded'
    });

    expect(response).not.toBeNull();
    const status = response?.status() ?? 200;
    expect([200, 404]).toContain(status);

    // Page should not show a raw error/stack trace
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Internal Server Error');
    expect(bodyText).not.toContain('ECONNREFUSED');
  });

  test('ER-02: Invalid username shows error state without crashing', async ({ page }) => {
    const response = await page.goto('/@thisuserdefinitelydoesnotexist99999', {
      waitUntil: 'domcontentloaded'
    });

    expect(response).not.toBeNull();
    const status = response?.status() ?? 200;
    expect([200, 404]).toContain(status);

    // Should not show raw error
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Internal Server Error');
  });

  test('ER-03: XSS attempt in search query is safely handled', async ({ page }) => {
    const searchPage = new SearchPage(page);

    await page.goto('/search?q=test%20%3Cscript%3Ealert(1)%3C/script%3E', {
      waitUntil: 'domcontentloaded'
    });

    // Page should load without executing script
    await expect(searchPage.searchButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });

    // No executable script tags with alert
    const scriptTags = await page.locator('script:has-text("alert(1)")').count();
    expect(scriptTags).toBe(0);
  });

  test('ER-04: App remains functional after visiting invalid URL', async ({ page }) => {
    const homePage = new HomePage(page);

    // Visit invalid page
    await page.goto('/@invaliduser999/no-such-post', { waitUntil: 'domcontentloaded' });

    // Navigate to valid page — app should still work
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });
});
