import { Locator, Page, expect } from '@playwright/test';

export class HealthcheckerPage {
    readonly page: Page;

    // Page header and description
    readonly pageTitle: Locator;
    readonly pageDescription: Locator;
    readonly pageDescriptionContinuousCheck: Locator;
    readonly pageDescriptionBestExperience: Locator;
    readonly pageDescriptionSwitchToBest: Locator;
    readonly circleCheckIcon: Locator;

    // Tabs
    readonly tabsList: Locator;
    readonly hiveApiTab: Locator;
    readonly hiveSenseApiTab: Locator;
    readonly nodeTabContent: Locator;
    readonly hiveSenseTabContent: Locator;

    // API endpoint cards and components
    readonly healthCheckerComponent: Locator;
    readonly apiEndpointCards: Locator;
    readonly selectedNodeIndicator: Locator;
    readonly setMainButton: Locator;
    readonly apiNameElement: Locator;

    // Buttons
    readonly switchToBestButton: Locator;
    readonly continuousCheckButton: Locator;

    // Common elements
    readonly body: Locator;

    constructor(page: Page) {
        this.page = page;

        // Page header and description
        this.pageTitle = page.locator('h3:has-text("API switch and HealthChecker")');
        this.pageDescription = page.locator('p:has-text("You can switch your provider here")');
        this.pageDescriptionContinuousCheck = page.locator('p:has-text("You can switch your provider here")');
        this.pageDescriptionBestExperience = page.locator('p:has-text("For the best experience")');
        this.pageDescriptionSwitchToBest = page.locator('p:has-text("Click \\"Switch to Best\\" button")');
        this.circleCheckIcon = page.locator('svg.lucide-circle-check');

        // Tabs
        this.tabsList = page.locator('[role="tablist"]');
        this.hiveApiTab = page.locator('[role="tab"]:has-text("HIVE API providers")');
        this.hiveSenseApiTab = page.locator('[role="tab"]:has-text("HiveSense API providers")');
        this.nodeTabContent = page.locator('[role="tabpanel"][data-state="active"]').filter({ has: page.locator('text=/Condenser|Bridge/') });
        this.hiveSenseTabContent = page.locator('[role="tabpanel"][data-state="active"]').filter({ has: page.locator('text=/AI search/') });

        // API endpoint cards and components
        this.healthCheckerComponent = page.locator('.m-4');
        this.apiEndpointCards = page.locator('.rounded-lg.border');
        this.selectedNodeIndicator = page.getByTestId('hc-selected');
        this.setMainButton = page.getByText('Set Main');
        this.apiNameElement = page.getByTestId('hc-api-name');

        // Buttons
        this.switchToBestButton = page.locator('button:has-text("Switch to Best")');
        this.continuousCheckButton = page.locator('button:has-text("Continuous Check")');

        // Common elements
        this.body = page.locator('body');
    }

    async goto() {
        await this.page.goto('/healthchecker');
        await this.page.waitForLoadState('domcontentloaded');
    }

    async gotoFromSidebar() {
        const sidebarMenuButton = this.page.locator('[data-testid="nav-sidebar-menu-button"]');
        await sidebarMenuButton.click();

        const healthcheckerLink = this.page.locator('text=Healthchecker');
        await healthcheckerLink.click();

        await this.page.waitForLoadState('domcontentloaded');
    }

    async validatePageIsLoaded() {
        await expect(this.pageTitle).toBeVisible();
        await expect(this.tabsList).toBeVisible();
        await expect(this.page).toHaveURL(/.*healthchecker/);
    }

    async switchToHiveApiTab() {
        await this.hiveApiTab.click();
        await this.page.waitForTimeout(500);
    }

    async switchToHiveSenseTab() {
        await this.hiveSenseApiTab.click();
        await this.page.waitForTimeout(500);
    }

    async validateHiveApiTabIsActive() {
        await expect(this.hiveApiTab).toHaveAttribute('data-state', 'active');
    }

    async validateHiveSenseTabIsActive() {
        await expect(this.hiveSenseApiTab).toHaveAttribute('data-state', 'active');
    }

    async getElementCssPropertyValue(element: Locator, cssProperty: string): Promise<string> {
        const value = await element.evaluate((ele, css) => {
            return window.getComputedStyle(ele).getPropertyValue(css);
        }, cssProperty);
        return value;
    }

    async validatePageDescriptionsAreVisible() {
        await expect(this.pageDescriptionContinuousCheck).toBeVisible();
        await expect(this.pageDescriptionBestExperience).toBeVisible();
        await expect(this.pageDescriptionSwitchToBest).toBeVisible();
    }

    async validateCircleCheckIconIsVisible() {
        await expect(this.circleCheckIcon).toBeVisible();
    }

    async getApiEndpointCardsCount(): Promise<number> {
        return await this.apiEndpointCards.count();
    }

    async getSelectedNodeName(): Promise<string | null> {
        const containerWithSelected = this.page.locator('.rounded-lg.border').filter({
            has: this.selectedNodeIndicator
        });
        const apiName = containerWithSelected.getByTestId('hc-api-name');
        return await apiName.textContent();
    }

    async getContainerWithApiChecker(apiCheckerName: string): Promise<Locator> {
        return this.page.locator('.rounded-lg.border').filter({
            has: this.page.getByText(apiCheckerName)
        });
    }

    async clickSetMainForApiChecker(apiCheckerName: string, apiUrl: string) {
        const container = this.page
            .locator('.rounded-lg.border')
            .filter({ has: this.page.getByText(apiCheckerName) })
            .filter({ has: this.page.getByText(apiUrl) });

        const setMainBtn = container.getByTestId('hc-set-api-button');
        await setMainBtn.click();
    }
}
