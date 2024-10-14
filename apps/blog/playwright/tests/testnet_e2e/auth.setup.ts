import { test as setup, expect } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginHelper, users } from '../support/loginHelper';

const denserautotest0File = 'playwright/.auth/denserautotest0.json';

setup('authenticate as denserautotest0', async ({ page }) => {
    let homePage = new HomePage(page);
    let loginHelper = new LoginHelper(page);

    // Go to the home page
    await homePage.goto();
    // Login as a denserautotest0
    await loginHelper.login(
        users.denserautotest0.username,
        users.denserautotest0.safeStoragePassword,
        users.denserautotest0.keys.private_posting
    );
    // End of authentication steps
    await page.context().storageState({ path: denserautotest0File})
});
