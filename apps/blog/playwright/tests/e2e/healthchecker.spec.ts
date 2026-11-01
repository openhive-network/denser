import { expect, test } from '@playwright/test';
import { API_SET_TAB, HealthcheckerPage } from '../support/pages/healthcheckerPage';
import { HomePage } from '../support/pages/homePage';

test.describe('Healthchecker page - Basic navigation', () => {
    let healthcheckerPage: HealthcheckerPage;
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        homePage = new HomePage(page);
    });

    test('Navigate to healthchecker page via direct URL', async () => {
        await healthcheckerPage.goto();
        await healthcheckerPage.validatePageIsLoaded();
    });

    test('Navigate to healthchecker page via sidebar menu', async () => {
        await homePage.goto();
        await healthcheckerPage.gotoFromSidebar();
        await healthcheckerPage.validatePageIsLoaded();
    });

    test('Validate page title and description are visible', async () => {
        await healthcheckerPage.goto();
        await expect(healthcheckerPage.pageTitle).toHaveText('API switch and HealthChecker');
        await expect(healthcheckerPage.pageDescription).toBeVisible();
    });
});

test.describe('Healthchecker page - API set tabs', () => {
    let healthcheckerPage: HealthcheckerPage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        await healthcheckerPage.goto();
        await healthcheckerPage.validatePageIsLoaded();
    });

    test('Shows a tab per API set, core first and active', async () => {
        for (const title of Object.values(API_SET_TAB)) await expect(healthcheckerPage.tab(title)).toBeVisible();
        await healthcheckerPage.validateTabIsActive(API_SET_TAB.core);
    });

    test('Switches between the sets', async () => {
        await healthcheckerPage.switchToTab(API_SET_TAB.lite);
        await healthcheckerPage.switchToTab(API_SET_TAB.hivesense);
        await healthcheckerPage.switchToTab(API_SET_TAB.core);
    });

    test("Lists the set's nodes, the one in use marked", async () => {
        await expect(healthcheckerPage.nodeCards.first()).toBeVisible();
        await expect(healthcheckerPage.page.getByTestId('hc-set-node-active')).toHaveCount(1);
    });

    test('Starts and stops checking the nodes', async () => {
        await expect(healthcheckerPage.checkToggle).toHaveText('Check the nodes');
        await healthcheckerPage.checkToggle.click();
        await expect(healthcheckerPage.checkToggle).toHaveText('Stop checking');
        await healthcheckerPage.checkToggle.click();
        await expect(healthcheckerPage.checkToggle).toHaveText('Check the nodes');
    });
});

test.describe('Healthchecker page - Node choice', () => {
    test("A node picked for a set stays the user's choice after a reload, server render included", async ({
        page
    }) => {
        const healthcheckerPage = new HealthcheckerPage(page);
        await healthcheckerPage.goto();
        await healthcheckerPage.validatePageIsLoaded();

        // The live nodes the server found serving the core set; pick one that is not in use.
        const candidate = healthcheckerPage.nodeCards
            .filter({ has: page.getByTestId('hc-set-node-use') })
            .filter({ hasNot: page.getByTestId('hc-set-node-active') })
            .first();
        const node = (await candidate.getByTestId('hc-set-node-url').textContent()) ?? '';
        expect(node).not.toBe('');
        await healthcheckerPage.useNode(node);

        await page.reload();
        await healthcheckerPage.validatePageIsLoaded();
        await expect(healthcheckerPage.selection).toHaveText(`Your choice: ${node}`);
        expect((await healthcheckerPage.serverRoutes()).selections.core).toBe(node);
    });
});

test.describe('Healthchecker page - Theme mode', () => {
    let healthcheckerPage: HealthcheckerPage;
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        homePage = new HomePage(page);
        await healthcheckerPage.goto();
    });

    test('Validate healthchecker page in light mode', async () => {
        await homePage.validateLightModeByClass();
    });

    test('Validate healthchecker page and its tabs in dark mode', async () => {
        await homePage.changeThemeMode('Dark');
        await homePage.validateDarkModeByClass();
        await expect(healthcheckerPage.pageTitle).toBeVisible();
        await expect(healthcheckerPage.coreTab).toBeVisible();
    });
});
