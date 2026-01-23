import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { HomePage } from '../support/pages/homePage';

test.describe('Post Page Visual Tests', () => {
  test('Post page - Light mode', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Navigate to the first post
    await homePage.moveToFirstPost();
    await page.waitForLoadState('networkidle');

    await homePage.changeThemeMode('Light');
    await homePage.validateThemeModeIsLight();
    await percySnapshot(page, 'Post Page - Light');
  });

  test('Post page - Dark mode', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Navigate to the first post
    await homePage.moveToFirstPost();
    await page.waitForLoadState('networkidle');

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await percySnapshot(page, 'Post Page - Dark');
  });
});
