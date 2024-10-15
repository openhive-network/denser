import { test as base, type Page, type Locator } from '@playwright/test';

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
        const context = await browser.newContext({storageState: 'playwright/.auth/denserautotest0.json'});
        const denserAutoTest0Page = new Denserautotest0Page(await context.newPage());
        await use(denserAutoTest0Page);
        await context.close();
    },
    denserAutoTest1Page: async ({ browser }, use) => {
        const context = await browser.newContext({storageState: 'playwright/.auth/denserautotest1.json'});
        const denserAutoTest1Page = new Denserautotest1Page(await context.newPage());
        await use(denserAutoTest1Page);
        await context.close();
    },
    denserAutoTest2Page: async ({ browser }, use) => {
        const context = await browser.newContext({storageState: 'playwright/.auth/denserautotest2.json'});
        const denserAutoTest2Page = new Denserautotest2Page(await context.newPage());
        await use(denserAutoTest2Page);
        await context.close();
    },
    denserAutoTest3Page: async ({ browser }, use) => {
        const context = await browser.newContext({storageState: 'playwright/.auth/denserautotest3.json'});
        const denserAutoTest3Page = new Denserautotest3Page(await context.newPage());
        await use(denserAutoTest3Page);
        await context.close();
    },
    denserAutoTest4Page: async ({ browser }, use) => {
        const context = await browser.newContext({storageState: 'playwright/.auth/denserautotest4.json'});
        const denserAutoTest4Page = new Denserautotest4Page(await context.newPage());
        await use(denserAutoTest4Page);
        await context.close();
    },
});
