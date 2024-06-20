import { expect, test } from '@playwright/test';

test.describe('Home page tests', () => {
    // test.beforeEach(async ({ page }) => {
    // });

    test.only('home page is loaded in the testnest mode', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="type-of-api-endpoint"]');
      await page.waitForTimeout(5000);
      await expect(page.locator('[data-testid="type-of-api-endpoint"]')).toHaveText('testnet');
    });
});
