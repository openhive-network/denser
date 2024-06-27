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
    await page.context().storageState({ path: denserautotest0File});
});

const denserautotest1File = 'playwright/.auth/denserautotest1.json';

setup('authenticate as denserautotest1', async ({ page }) => {
    let homePage = new HomePage(page);
    let loginHelper = new LoginHelper(page);

    // Go to the home page
    await homePage.goto();
    // Login as a denserautotest1
    await loginHelper.login(
        users.denserautotest1.username,
        users.denserautotest1.safeStoragePassword,
        users.denserautotest1.keys.private_posting
    );
    // End of authentication steps
    await page.context().storageState({ path: denserautotest1File});
});

const denserautotest2File = 'playwright/.auth/denserautotest2.json';

setup('authenticate as denserautotest2', async ({ page }) => {
    let homePage = new HomePage(page);
    let loginHelper = new LoginHelper(page);

    // Go to the home page
    await homePage.goto();
    // Login as a denserautotest2
    await loginHelper.login(
        users.denserautotest2.username,
        users.denserautotest2.safeStoragePassword,
        users.denserautotest2.keys.private_posting
    );
    // End of authentication steps
    await page.context().storageState({ path: denserautotest2File});
});

const denserautotest3File = 'playwright/.auth/denserautotest3.json';

setup('authenticate as denserautotest3', async ({ page }) => {
    let homePage = new HomePage(page);
    let loginHelper = new LoginHelper(page);

    // Go to the home page
    await homePage.goto();
    // Login as a denserautotest3
    await loginHelper.login(
        users.denserautotest3.username,
        users.denserautotest3.safeStoragePassword,
        users.denserautotest3.keys.private_posting
    );
    // End of authentication steps
    await page.context().storageState({ path: denserautotest3File});
});

const denserautotest4File = 'playwright/.auth/denserautotest4.json';

setup('authenticate as denserautotest4', async ({ page }) => {
    let homePage = new HomePage(page);
    let loginHelper = new LoginHelper(page);

    // Go to the home page
    await homePage.goto();
    // Login as a denserautotest4
    await loginHelper.login(
        users.denserautotest4.username,
        users.denserautotest4.safeStoragePassword,
        users.denserautotest4.keys.private_posting
    );
    // End of authentication steps
    await page.context().storageState({ path: denserautotest4File});
});
