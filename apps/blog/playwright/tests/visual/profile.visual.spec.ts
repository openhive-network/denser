import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { HomePage } from '../support/pages/homePage';

test.describe('Profile Page Visual Tests', () => {
  const testUsername = 'gtg'; // Well-known user with data

  test('Profile page - Light mode', async ({ page }) => {
    const homePage = new HomePage(page);
    await page.goto(`/@${testUsername}`);
    await page.waitForLoadState('networkidle');
    await homePage.changeThemeMode('Light');
    await homePage.validateThemeModeIsLight();
    await percySnapshot(page, 'Profile Page - Light');
  });

  test('Profile page - Dark mode', async ({ page }) => {
    const homePage = new HomePage(page);
    await page.goto(`/@${testUsername}`);
    await page.waitForLoadState('networkidle');
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await percySnapshot(page, 'Profile Page - Dark');
  });
});
