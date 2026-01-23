import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { HomePage } from '../support/pages/homePage';

test.describe('Homepage Visual Tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('Homepage - Light mode', async ({ page }) => {
    await homePage.changeThemeMode('Light');
    await homePage.validateThemeModeIsLight();
    await percySnapshot(page, 'Homepage - Light');
  });

  test('Homepage - Dark mode', async ({ page }) => {
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await percySnapshot(page, 'Homepage - Dark');
  });
});
