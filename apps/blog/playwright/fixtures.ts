import { test as base, type Page, type Locator } from '@playwright/test';
import { HomePage } from './tests/support/pages/homePage';
import { LoginHelper, users } from './tests/support/loginHelper';
import { ProfileUserMenu } from './tests/support/pages/profileUserMenu';
import { PostEditorPage } from './tests/support/pages/postEditorPage';

// Page Object Model for the "denserautotest0" page.
//
class Denserautotest0Page {
    // Page signed in as "denserautotest0"
    page: Page;

    constructor(page: Page){
        this.page = page;
    }
}

// Page Object Model for the "denserautotest1" page.
//
class Denserautotest1Page {
    // Page signed in as "denserautotest1"
    page: Page;

    constructor(page: Page){
        this.page = page;
    }
}

// Page Object Model for the "denserautotest2" page.
//
class Denserautotest2Page {
    // Page signed in as "denserautotest2"
    page: Page;

    constructor(page: Page){
        this.page = page;
    }
}

// Page Object Model for the "denserautotest3" page.
//
class Denserautotest3Page {
    // Page signed in as "denserautotest3"
    page: Page;

    constructor(page: Page){
        this.page = page;
    }
}

// Page Object Model for the "denserautotest4" page.
//
class Denserautotest4Page {
    // Page signed in as "denserautotest4"
    page: Page;

    constructor(page: Page){
        this.page = page;
    }
}

// Fixture's types
type UsersPageFixtures = {
    denserAutoTest0Page: Denserautotest0Page;
    denserAutoTest1Page: Denserautotest1Page;
    denserAutoTest2Page: Denserautotest2Page;
    denserAutoTest3Page: Denserautotest3Page;
    denserAutoTest4Page: Denserautotest4Page;
}

export * from '@playwright/test';
export const test = base.extend<UsersPageFixtures>({
    denserAutoTest0Page: async ({ browser }, use) => {
        const context = await browser.newContext();
        const denserAutoTest0Page = new Denserautotest0Page(await context.newPage());

        // Move to Home Page and Login as denserautotest0
        let homePage = new HomePage(denserAutoTest0Page.page);
        let loginHelper = new LoginHelper(denserAutoTest0Page.page);

        // Go to the home page
        await homePage.goto();
        // Login as a denserautotest0
        await loginHelper.login(
            users.denserautotest0.username,
            users.denserautotest0.safeStoragePassword,
            users.denserautotest0.keys.private_posting
        );
        // End of authentication steps
        await use(denserAutoTest0Page);
        await context.close();
    },
    denserAutoTest1Page: async ({ browser }, use) => {
        const context = await browser.newContext();
        const denserAutoTest1Page = new Denserautotest1Page(await context.newPage());

        // Move to Home Page and Login as denserautotest1
        let homePage = new HomePage(denserAutoTest1Page.page);
        let loginHelper = new LoginHelper(denserAutoTest1Page.page);

        // Go to the home page
        await homePage.goto();
        // Login as a denserautotest1
        await loginHelper.login(
            users.denserautotest1.username,
            users.denserautotest1.safeStoragePassword,
            users.denserautotest1.keys.private_posting
        );
        // End of authentication steps
        await use(denserAutoTest1Page);
        await context.close();
    },
    denserAutoTest2Page: async ({ browser }, use) => {
        const context = await browser.newContext();
        const denserAutoTest2Page = new Denserautotest2Page(await context.newPage());

        // Move to Home Page and Login as denserautotest2
        let homePage = new HomePage(denserAutoTest2Page.page);
        let loginHelper = new LoginHelper(denserAutoTest2Page.page);

        // Go to the home page
        await homePage.goto();
        // Login as a denserautotest2
        await loginHelper.login(
            users.denserautotest2.username,
            users.denserautotest2.safeStoragePassword,
            users.denserautotest2.keys.private_posting
        );
        // End of authentication steps
        await use(denserAutoTest2Page);
        await context.close();
    },
    denserAutoTest3Page: async ({ browser }, use) => {
        const context = await browser.newContext();
        const denserAutoTest3Page = new Denserautotest3Page(await context.newPage());

        // Move to Home Page and Login as denserautotest4
        let homePage = new HomePage(denserAutoTest3Page.page);
        let loginHelper = new LoginHelper(denserAutoTest3Page.page);

        // Go to the home page
        await homePage.goto();
        // Login as a denserautotest3
        await loginHelper.login(
            users.denserautotest3.username,
            users.denserautotest3.safeStoragePassword,
            users.denserautotest3.keys.private_posting
        );
        // End of authentication steps
        await use(denserAutoTest3Page);
        await context.close();
    },
    denserAutoTest4Page: async ({ browser }, use) => {
        // Create new context
        const context = await browser.newContext();
        const denserAutoTest4Page = new Denserautotest4Page(await context.newPage());

        // Move to Home Page and Login as denserautotest4
        let homePage = new HomePage(denserAutoTest4Page.page);
        let loginHelper = new LoginHelper(denserAutoTest4Page.page);

        // Go to the home page
        await homePage.goto();
        // Login as a denserautotest4
        await loginHelper.login(
            users.denserautotest4.username,
            users.denserautotest4.safeStoragePassword,
            users.denserautotest4.keys.private_posting
        );
        // End of authentication steps
        await use(denserAutoTest4Page);
        await context.close();
    },
});
