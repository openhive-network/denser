import { expect, test } from '@playwright/test';

test.describe('Wallet page tests', () => {

    test('validate that wallet page is loaded', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector(page.getByText('Hive wallet login')['_selector']);
        await expect(page.getByText('Hive wallet login')).toBeVisible();
    });
});
