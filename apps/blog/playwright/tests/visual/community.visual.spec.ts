import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { HomePage } from '../support/pages/homePage';

test.describe('Community Page Visual Tests', () => {
  const testCommunity = 'hive-167922'; // LeoFinance community

  test('Community page - Light mode', async ({ page }) => {
    const homePage = new HomePage(page);
    await page.goto(`/trending/${testCommunity}`);
    await page.waitForLoadState('networkidle');
    await homePage.changeThemeMode('Light');
    await homePage.validateThemeModeIsLight();
    await percySnapshot(page, 'Community Page - Light');
  });

  test('Community page - Dark mode', async ({ page }) => {
    const homePage = new HomePage(page);
    await page.goto(`/trending/${testCommunity}`);
    await page.waitForLoadState('networkidle');
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await percySnapshot(page, 'Community Page - Dark');
  });
});
