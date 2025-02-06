const { test, expect, chromium } = require('@playwright/test');

test.use({ storageState: 'session.json' });

test('Sprawdzenie strony po zalogowaniu', async ({ page }) => {
    await page.goto('https://blog.fake.openhive.network');
    await expect(page.getByTestId('profile-avatar-button')).toBeVisible()
    await page.getByTestId('profile-avatar-button').click()
    await page.getByTestId('user-profile-menu-profile-link').click()
    // await page.getByTestId("nav-pencil").click()
    // await expect(page.getByTestId("post-title-input")).toBeVisible()
    await page.waitForTimeout(5000)
});