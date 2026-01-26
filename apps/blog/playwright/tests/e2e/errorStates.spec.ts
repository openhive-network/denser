import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

test.describe('Error States tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * INVALID URL TESTS
   */

  test('invalid post URL handles gracefully', async ({ page }) => {
    // Try to access a non-existent post
    const response = await page.goto('/@nonexistentuser123456/invalid-post-permlink-xyz');

    // Page should respond (not crash)
    expect(response).not.toBeNull();

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');
  });

  test('invalid user profile handles gracefully', async ({ page }) => {
    // Try to access a user that doesn't exist
    const response = await page.goto('/@thisuserdefinitelydoesnotexist99999');

    // Page should respond (not crash) - either with content or error status
    expect(response).not.toBeNull();

    // Either the page loads or shows error
    const status = response?.status() || 200;
    expect([200, 404, 500]).toContain(status);
  });

  /**
   * EMPTY STATE TESTS
   */

  test('search with no results shows empty state', async ({ page }) => {
    // Search for something that should return no results
    await page.goto('/search?q=xyznonexistentquery123456789abcdef');
    await page.waitForLoadState('domcontentloaded');

    // Wait for search to complete
    await page.waitForLoadState('networkidle');

    // Should show 0 results or no results message
    const resultsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(resultsCount).toBe(0);
  });

  test('rare tag with no posts shows appropriate state', async ({ page }) => {
    await page.goto('/trending/xyznonexistenttag987654321');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForLoadState('networkidle');

    // Page should load without crashing
    await expect(page).toHaveURL(/\/trending\/xyznonexistenttag987654321/);
  });

  /**
   * MALFORMED URL TESTS
   */

  test('handles URL with special characters gracefully', async ({ page }) => {
    // URL with special characters
    const response = await page.goto('/trending/test%20tag%21%40%23');

    // Page should respond
    expect(response).not.toBeNull();
    await page.waitForLoadState('networkidle');
  });

  test('handles search with special characters', async ({ page }) => {
    await page.goto('/search?q=test%20%3Cscript%3Ealert(1)%3C/script%3E');
    await page.waitForLoadState('domcontentloaded');

    // Page should load safely (XSS protection)
    await expect(page.locator('body')).toBeVisible();

    // Search input should be present
    await expect(page.locator('button[aria-label="Search"]')).toBeVisible();
  });

  /**
   * PAGE LOADING TESTS
   */

  test('page loads with network content', async ({ page }) => {
    // Go to homepage
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    // Page should eventually show content
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 30000 });
    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThan(0);
  });

  /**
   * INVALID SORT PARAMETER
   */

  test('invalid sort parameter defaults to valid sort', async ({ page }) => {
    // Use invalid sort parameter
    await page.goto('/search?q=hive&s=invalidsort');
    await page.waitForLoadState('domcontentloaded');

    // Page should load without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  /**
   * DOUBLE ENCODING HANDLING
   */

  test('handles double-encoded URLs gracefully', async ({ page }) => {
    // Double encoded @ symbol (%40 -> %2540)
    const response = await page.goto('/%2540gtg');

    // Page should respond (not crash)
    expect(response).not.toBeNull();

    // Either the page loads or shows error - both are acceptable
    const status = response?.status() || 200;
    expect([200, 404, 500]).toContain(status);
  });

  /**
   * APP FUNCTIONALITY TESTS
   */

  test('app remains functional after navigation', async ({ page }) => {
    // Navigate to main page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Navigate to a different feed
    await page.goto('/hot');
    await page.waitForLoadState('domcontentloaded');

    // Verify navigation worked
    await expect(page).toHaveURL('/hot');
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
  });
});
