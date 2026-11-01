import { Locator, Page, expect } from '@playwright/test';

/** Tab titles of the API sets (`API_SET_TITLES` in @ui/config/api-sets). */
export const API_SET_TAB = {
    core: 'Hive core (database, condenser, broadcast)',
    bridge: 'Bridge',
    lite: 'Lite accounts',
    hivesense: 'HiveSense'
} as const;

export class HealthcheckerPage {
    readonly page: Page;

    readonly pageTitle: Locator;
    readonly pageDescription: Locator;
    /** Starts and stops probing the nodes. */
    readonly checkToggle: Locator;

    // The per-set panel (@hiveio/healthchecker-component's ApiSetsComponent)
    readonly tabsList: Locator;
    readonly coreTab: Locator;
    readonly hiveSenseTab: Locator;
    readonly liteTab: Locator;
    readonly nodeCards: Locator;
    /** "Automatic choice" or "Your choice: <node>" for the set shown. */
    readonly selection: Locator;

    readonly body: Locator;

    constructor(page: Page) {
        this.page = page;

        this.pageTitle = page.locator('h3:has-text("API switch and HealthChecker")');
        this.pageDescription = page.locator('p:has-text("Each family of Hive APIs")');
        this.checkToggle = page.getByTestId('api-sets-check-toggle');

        this.tabsList = page.locator('[role="tablist"]');
        this.coreTab = this.tab(API_SET_TAB.core);
        this.hiveSenseTab = this.tab(API_SET_TAB.hivesense);
        this.liteTab = this.tab(API_SET_TAB.lite);
        this.nodeCards = page.getByTestId('hc-set-node');
        this.selection = page.getByTestId('hc-set-selection');

        this.body = page.locator('body');
    }

    tab(title: string): Locator {
        return this.page.getByRole('tab', { name: title, exact: true });
    }

    /** The card of `node` in the set shown. */
    nodeCard(node: string): Locator {
        return this.nodeCards.filter({ has: this.page.getByTestId('hc-set-node-url').getByText(node, { exact: true }) });
    }

    async goto(baseURL = '') {
        await this.page.goto(`${baseURL}/healthchecker`);
        await this.page.waitForLoadState('domcontentloaded');
    }

    async gotoFromSidebar() {
        const sidebarMenuButton = this.page.locator('[data-testid="nav-sidebar-menu-button"]');
        await sidebarMenuButton.click();

        const healthcheckerLink = this.page.locator('text=Healthchecker');
        await healthcheckerLink.click();

        await this.page.waitForLoadState('domcontentloaded');
    }

    /** The panel mounts in a client effect: once its tabs show, they react to clicks. */
    async validatePageIsLoaded() {
        await expect(this.pageTitle).toBeVisible();
        await expect(this.tabsList).toBeVisible();
        await expect(this.page).toHaveURL(/.*healthchecker/);
    }

    async switchToTab(title: string) {
        await this.tab(title).click();
        await this.validateTabIsActive(title);
    }

    async validateTabIsActive(title: string) {
        await expect(this.tab(title)).toHaveAttribute('aria-selected', 'true');
    }

    /** Picks `node` for the set shown. */
    async useNode(node: string) {
        await this.nodeCard(node).getByTestId('hc-set-node-use').click();
        await expect(this.selection).toHaveText(`Your choice: ${node}`);
    }

    /** The routes the server rendered the page with (`ApiSetsBootstrap`). */
    async serverRoutes(): Promise<{ routes: Record<string, string[]>; selections: Record<string, string> }> {
        return JSON.parse((await this.page.locator('#denser-api-sets').textContent()) ?? '{}');
    }
}
