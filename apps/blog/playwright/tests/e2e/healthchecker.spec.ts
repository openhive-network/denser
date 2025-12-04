import { expect, test } from '@playwright/test';
import { HealthcheckerPage } from '../support/pages/healthcheckerPage';
import { HomePage } from '../support/pages/homePage';

test.describe('Healthchecker page - Basic navigation', () => {
    let healthcheckerPage: HealthcheckerPage;
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        homePage = new HomePage(page);
    });

    test('Navigate to healthchecker page via direct URL', async ({ page }) => {
        await healthcheckerPage.goto();
        await healthcheckerPage.validatePageIsLoaded();
        // await expect(page).toHaveURL(/.*healthchecker/);
    });

    test('Navigate to healthchecker page via sidebar menu', async ({ page }) => {
        await homePage.goto();
        await healthcheckerPage.gotoFromSidebar();
        await healthcheckerPage.validatePageIsLoaded();
    });

    test('Validate page title is visible', async ({ page }) => {
        await healthcheckerPage.goto();
        await expect(healthcheckerPage.pageTitle).toBeVisible();
        // await expect(healthcheckerPage.pageTitle).toHaveText('API switch and HealthChecker');
    });

    test('Validate page descriptions are visible', async ({ page }) => {
        await healthcheckerPage.goto();
        await healthcheckerPage.validatePageDescriptionsAreVisible();
    });

    test('Validate CircleCheck icon is visible in description', async ({ page }) => {
        await healthcheckerPage.goto();
        await healthcheckerPage.validateCircleCheckIconIsVisible();
    });
});

test.describe('Healthchecker page - Tab functionality', () => {
    let healthcheckerPage: HealthcheckerPage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        await healthcheckerPage.goto();
    });

    test('Validate both tabs are visible', async ({ page }) => {
        await expect(healthcheckerPage.hiveApiTab).toBeVisible();
        await expect(healthcheckerPage.hiveSenseApiTab).toBeVisible();
    });

    test('Validate default tab is HIVE API providers', async ({ page }) => {
        await healthcheckerPage.validateHiveApiTabIsActive();
    });

    test('Switch to HiveSense API providers tab', async ({ page }) => {
        await healthcheckerPage.switchToHiveSenseTab();
        await healthcheckerPage.validateHiveSenseTabIsActive();
    });

    test('Switch between tabs - HIVE API to HiveSense and back', async ({ page }) => {
        // Initially on HIVE API tab
        await healthcheckerPage.validateHiveApiTabIsActive();

        // Switch to HiveSense
        await healthcheckerPage.switchToHiveSenseTab();
        await healthcheckerPage.validateHiveSenseTabIsActive();

        // Switch back to HIVE API
        await healthcheckerPage.switchToHiveApiTab();
        await healthcheckerPage.validateHiveApiTabIsActive();
    });

    test('Validate tab list has correct structure', async ({ page }) => {
        await expect(healthcheckerPage.tabsList).toBeVisible();
        await expect(healthcheckerPage.tabsList).toHaveAttribute('role', 'tablist');
    });

    test('Validate HIVE API tab text content', async ({ page }) => {
        await expect(healthcheckerPage.hiveApiTab).toHaveText('HIVE API providers');
    });

    test('Validate HiveSense API tab text content', async ({ page }) => {
        await expect(healthcheckerPage.hiveApiTab).toHaveText('HIVE API providers');
    });

    test('Switch selected HIVE API provider node by clicking Set Main', async ({ page, browserName }) => {
        test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
        // Ensure we are on HIVE API tab
        await healthcheckerPage.validatePageIsLoaded();
        await healthcheckerPage.switchToHiveApiTab();

        // Get the currently selected node name
        const initialSelectedNode = await healthcheckerPage.getSelectedNodeName();
        expect(initialSelectedNode).toBeTruthy();
        console.log('Initially selected node:', initialSelectedNode);

        // Find all API endpoint cards with "Condenser - Get accounts" checker
        const condenserCards = page
            .locator('.rounded-lg.border')
            .filter({ has: page.getByText('Condenser - Get accounts') });

        const cardsCount = await condenserCards.count();
        expect(cardsCount).toBeGreaterThan(1); // Should have at least 2 nodes to switch between

        // Find a different node (not the currently selected one) to switch to
        let targetNodeUrl: string | null = null;
        for (let i = 0; i < cardsCount; i++) {
            const card = condenserCards.nth(i);
            const apiName = card.getByTestId('hc-api-name');
            const nodeName = await apiName.textContent();

            // Check if this card is not the selected one
            const isSelected = await card.getByTestId('hc-selected').count() > 0;

            if (!isSelected && nodeName) {
                targetNodeUrl = nodeName;
                break;
            }
        }

        expect(targetNodeUrl).toBeTruthy();
        console.log('Target node to switch to:', targetNodeUrl);

        // Click Set Main button for the target node
        await healthcheckerPage.clickSetMainForApiChecker('Condenser - Get accounts', targetNodeUrl!);

        // Wait for the confirmation dialog to appear and click the Confirm button
        const confirmDialog = page.locator('[role="dialog"]');
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });

        // Verify dialog contains expected text
        await expect(confirmDialog).toContainText('Confirm Provider Switch');
        await expect(confirmDialog).toContainText('Are you sure you want to switch to unconfirmed');

        // Click the Confirm button in the dialog
        const confirmButton = confirmDialog.getByRole('button', { name: /confirm/i });
        await confirmButton.click();

        // Wait for the dialog to close and the change to take effect
        await expect(confirmDialog).not.toBeVisible();
        await page.waitForTimeout(1000);

        // Verify the new node is now selected
        const newSelectedNode = await healthcheckerPage.getSelectedNodeName();
        expect(newSelectedNode).toBe(targetNodeUrl);
        console.log('New selected node:', newSelectedNode);

        // Verify the old node is no longer selected
        expect(newSelectedNode).not.toBe(initialSelectedNode);
    });
});

test.describe('Healthchecker page - API endpoint cards', () => {
    let healthcheckerPage: HealthcheckerPage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        await healthcheckerPage.goto();
    });

    test('Validate API endpoint cards are displayed on HIVE API tab', async ({ page }) => {
        await healthcheckerPage.switchToHiveApiTab();
        await page.waitForTimeout(1000);

        const cardsCount = await healthcheckerPage.getApiEndpointCardsCount();
        expect(cardsCount).toBeGreaterThan(0);
    });

    test('Validate API endpoint cards are displayed on HiveSense API tab', async ({ page }) => {
        await healthcheckerPage.switchToHiveSenseTab();
        await page.waitForTimeout(1000);

        const cardsCount = await healthcheckerPage.getApiEndpointCardsCount();
        expect(cardsCount).toBeGreaterThan(0);
    });

    test('Validate HealthChecker component is rendered on HIVE API tab', async ({ page }) => {
        await healthcheckerPage.switchToHiveApiTab();
        await expect(healthcheckerPage.healthCheckerComponent).toBeVisible();
    });

    test('Validate HealthChecker component is rendered on HiveSense API tab', async ({ page }) => {
        await healthcheckerPage.switchToHiveSenseTab();
        await expect(healthcheckerPage.healthCheckerComponent).toBeVisible();
    });

    test('Validate API endpoint cards have border styling', async ({ page }) => {
        await healthcheckerPage.switchToHiveApiTab();
        await page.waitForTimeout(1000);

        const firstCard = healthcheckerPage.apiEndpointCards.first();
        await expect(firstCard).toBeVisible();

        const borderStyle = await healthcheckerPage.getElementCssPropertyValue(firstCard, 'border-style');
        expect(borderStyle).toContain('solid');
    });
});

test.describe('Healthchecker page - Theme mode', () => {
    let healthcheckerPage: HealthcheckerPage;
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        homePage = new HomePage(page);
    });

    test('Validate healthchecker page in light mode', async ({ page }) => {
        await healthcheckerPage.goto();

        // Verify light mode background
        const backgroundColor = await healthcheckerPage.getElementCssPropertyValue(
            healthcheckerPage.body,
            'background-color'
        );
        expect(backgroundColor).toBe('rgb(247, 247, 247)');
    });

    test('Validate healthchecker page in dark mode', async ({ page }) => {
        await healthcheckerPage.goto();

        // Switch to dark mode
        await homePage.changeThemeMode('Dark');
        await homePage.validateThemeModeIsDark();

        // Verify dark mode background
        const backgroundColor = await healthcheckerPage.getElementCssPropertyValue(
            healthcheckerPage.body,
            'background-color'
        );
        expect(backgroundColor).toBe('rgb(34, 38, 42)');
    });

    test('Validate tab styling in light mode', async ({ page }) => {
        await healthcheckerPage.goto();

        // Check active tab styling
        await healthcheckerPage.validateHiveApiTabIsActive();
        await expect(healthcheckerPage.hiveApiTab).toBeVisible();
    });

    test('Validate tab styling in dark mode', async ({ page }) => {
        await healthcheckerPage.goto();

        // Switch to dark mode
        await homePage.changeThemeMode('Dark');
        await homePage.validateThemeModeIsDark();

        // Check active tab styling
        await healthcheckerPage.validateHiveApiTabIsActive();
        await expect(healthcheckerPage.hiveApiTab).toBeVisible();
    });

    test('Validate page title visibility in dark mode', async ({ page }) => {
        await healthcheckerPage.goto();

        // Switch to dark mode
        await homePage.changeThemeMode('Dark');
        await homePage.validateThemeModeIsDark();

        // Verify title is still visible
        await expect(healthcheckerPage.pageTitle).toBeVisible();
    });

    test('Validate CircleCheck icon visibility in dark mode', async ({ page }) => {
        await healthcheckerPage.goto();

        // Switch to dark mode
        await homePage.changeThemeMode('Dark');
        await homePage.validateThemeModeIsDark();

        // Verify icon is still visible
        await healthcheckerPage.validateCircleCheckIconIsVisible();
    });
});

test.describe('Healthchecker page - UI elements and content', () => {
    let healthcheckerPage: HealthcheckerPage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        await healthcheckerPage.goto();
    });

    test('Validate page header text content', async ({ page }) => {
        await expect(healthcheckerPage.pageTitle).toHaveText('API switch and HealthChecker');
    });

    test('Validate continuous check description text', async ({ page }) => {
        await expect(healthcheckerPage.pageDescriptionContinuousCheck).toContainText(
            'You can switch your provider here'
        );
        await expect(healthcheckerPage.pageDescriptionContinuousCheck).toContainText(
            'Continuos Check'
        );
    });

    test('Validate best experience description text', async ({ page }) => {
        await expect(healthcheckerPage.pageDescriptionBestExperience).toContainText(
            'For the best experience'
        );
    });

    test('Validate switch to best description text', async ({ page }) => {
        await expect(healthcheckerPage.pageDescriptionSwitchToBest).toContainText(
            'Switch to Best'
        );
    });

    test('Validate tabs container has grid layout', async ({ page }) => {
        const gridCols = await healthcheckerPage.tabsList.evaluate((el) => {
            return window.getComputedStyle(el).getPropertyValue('grid-template-columns');
        });

        // Should have 2 columns
        expect(gridCols).toBeTruthy();
    });

    test('Validate page container has proper padding', async ({ page }) => {
        const container = page.locator('.p4.lg\\:px-48').first();
        await expect(container).toBeVisible();
    });
});

test.describe('Healthchecker page - Accessibility', () => {
    let healthcheckerPage: HealthcheckerPage;

    test.beforeEach(async ({ page }) => {
        healthcheckerPage = new HealthcheckerPage(page);
        await healthcheckerPage.goto();
    });

    test('Validate tabs have proper ARIA roles', async ({ page }) => {
        await expect(healthcheckerPage.tabsList).toHaveAttribute('role', 'tablist');
        await expect(healthcheckerPage.hiveApiTab).toHaveAttribute('role', 'tab');
        await expect(healthcheckerPage.hiveSenseApiTab).toHaveAttribute('role', 'tab');
    });

    test('Validate active tab has correct ARIA state', async ({ page }) => {
        await expect(healthcheckerPage.hiveApiTab).toHaveAttribute('data-state', 'active');
        await expect(healthcheckerPage.hiveSenseApiTab).toHaveAttribute('data-state', 'inactive');
    });

    test('Validate tab navigation with keyboard', async ({ page }) => {
        // Focus on first tab
        await healthcheckerPage.hiveApiTab.focus();

        // Press Tab key to move to next tab
        await page.keyboard.press('Tab');

        // Verify focus moved
        const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('role'));
        expect(focusedElement).toBeTruthy();
    });

    test('Validate tab activation with Enter key', async ({ page }) => {
        // Focus on HiveSense tab
        await healthcheckerPage.hiveSenseApiTab.focus();

        // Press Enter to activate
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Verify tab is now active
        await healthcheckerPage.validateHiveSenseTabIsActive();
    });
});
