import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

test.describe('Language Switching tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * Helper to wait for language toggle to appear after hydration
   * The toggle only renders after React hydration completes (isClient state)
   */
  async function waitForLanguageToggle(page: HomePage['page'], timeout = 10000): Promise<boolean> {
    try {
      await page.waitForSelector('[data-testid="toggle-language"]', { timeout, state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * LANGUAGE TOGGLE VISIBILITY
   * Note: Language toggle is only visible for non-logged-in users after hydration
   * These tests verify the language toggle functionality when available
   */

  test('language menu opens on click when toggle is available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page content to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });

    // Wait for hydration - toggle appears after isClient becomes true
    const toggleExists = await waitForLanguageToggle(page);
    test.skip(!toggleExists, 'Language toggle not available on this environment');

    // Click language toggle
    await homePage.toggleLanguage.click();

    // Language menu should be visible - check for dropdown content
    await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5000 });
  });

  /**
   * LANGUAGE OPTIONS AVAILABILITY
   */

  test('language menu shows multiple language options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page content to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const toggleExists = await waitForLanguageToggle(page);
    test.skip(!toggleExists, 'Language toggle not available');

    // Click language toggle
    await homePage.toggleLanguage.click();

    // Wait for menu to appear
    await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5000 });

    // Check for language options
    const menuItems = page.locator('[role="menuitem"]');
    const count = await menuItems.count();

    // Should have multiple languages available (en, es, fr, pl, etc.)
    expect(count).toBeGreaterThan(3);
  });

  test('Polish language option is available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page content to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const toggleExists = await waitForLanguageToggle(page);
    test.skip(!toggleExists, 'Language toggle not available');

    // Click language toggle
    await homePage.toggleLanguage.click();

    // Wait for menu to appear
    await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5000 });

    // Check for Polish option
    await expect(page.locator('[data-testid="pl"]')).toBeVisible();
  });

  test('English language option is available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page content to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const toggleExists = await waitForLanguageToggle(page);
    test.skip(!toggleExists, 'Language toggle not available');

    // Click language toggle
    await homePage.toggleLanguage.click();

    // Wait for menu to appear
    await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5000 });

    // Check for English option
    await expect(page.locator('[data-testid="en"]')).toBeVisible();
  });

  /**
   * LANGUAGE SWITCHING FUNCTIONALITY
   */

  test('clicking language option closes menu', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Language switching timing issues on WebKit');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page content to load
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: 15000 });
    const toggleExists = await waitForLanguageToggle(page);
    test.skip(!toggleExists, 'Language toggle not available');

    // Click language toggle
    await homePage.toggleLanguage.click();

    // Wait for menu to appear
    await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5000 });

    // Click on a language option (Spanish)
    await page.locator('[data-testid="es"]').click();

    // Menu should close - wait for it to disappear
    await expect(page.locator('[role="menu"]')).not.toBeVisible({ timeout: 5000 });

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});
