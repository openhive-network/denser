import { expect, test } from '@playwright/test';
import { ProfilePage } from '../support/pages/profilePage';
import { HomePage } from '../support/pages/homePage';

// The tests have been skipped due to changes in the functioning of healthchecker.
// New page. New tests needed (these are old style functionality).
test.describe.skip('Api healthchecker setting page tests', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
  });

  test('Move to the healthchecker for API Endpoint servers', async ({ page }) => {
    await profilePage.gotoApiEndpointHealthcheckerProfilePage('@gtg');
    // Validate URL of page is "http://.../@gtg"
    await expect(profilePage.page).toHaveURL(/ *.\/@gtg\/settings$/);
  });

  test('Move to the healthchecker for AI search endpoint', async ({ page }) => {
    await profilePage.gotoAISearchApiEndpointHealthcheckerProfilePage('@gtg');
    // Validate URL of page is "http://.../@gtg"
    await expect(profilePage.page).toHaveURL(/ *.\/@gtg\/settings$/);
  });

  test('Change API Endpoint server to api.openhive.network', async ({ page }) => {
    await profilePage.gotoApiEndpointHealthcheckerProfilePage('@gtg');

    // Waiting for request of new api server endpoint - `/api.openhive.network`
    const requestPromise = profilePage.page.waitForRequest(
      (request) => request.url().includes('/api.openhive.network') && request.method() === 'POST'
    );
    // Click first Set Main button to change api server to 'https://api.openhive.network'
    await profilePage.page.getByText('Set Main').first().click();
    // Reload the page to see new request endpiont and wait for expected endpoint
    await profilePage.page.reload({ waitUntil: 'load' });
    await profilePage.page.waitForTimeout(3000);
    const request = await requestPromise;
    expect(request.url()).toContain('/api.openhive.network');

    // Find api server's name element which is selected
    const containerWithSelected = profilePage.page.locator('.rounded-lg.border').filter({
      has: page.getByTestId('hc-selected')
    });
    const apiNameElement = containerWithSelected.getByTestId('hc-api-name');
    // Validate the api's name is 'https://api.openhive.network'
    expect(await apiNameElement.textContent()).toBe('https://api.openhive.network');
  });

  test('Change Endpoint for AI server to api.openhive.network', async ({ page }) => {
    await profilePage.gotoAISearchApiEndpointHealthcheckerProfilePage('@gtg');

    // Click Set Main button to change api server to 'https://api.openhive.network' in AI Search endpoints
    const setMainButton = page
      .locator('.rounded-lg.border')
      .filter({ has: page.getByText('AI search') })
      .filter({ has: page.getByText('https://api.openhive.network') })
      .getByTestId('hc-set-api-button');

    await setMainButton.click();

    // // Find api ai search endpoint of element which is selected
    const containerWithSelected = profilePage.page.locator('.rounded-lg.border').filter({
      has: page.getByTestId('hc-selected')
    });
    const apiNameElement = containerWithSelected.getByTestId('hc-api-name');
    // Validate the api's name is 'https://api.openhive.network'
    expect(await apiNameElement.textContent()).toBe('https://api.openhive.network');
  });

  test('Add custom node to the healthchecker for API Endpoint servers', async ({ page }) => {
    const customApiNodeName: string = 'https://hive-test-test.hive';
    await profilePage.gotoApiEndpointHealthcheckerProfilePage('@gtg');

    await profilePage.apiAddressInput.fill(customApiNodeName);
    await profilePage.apiAddButton.click();

    const apiNameInList = page
      .locator('.rounded-lg.border')
      .filter({ has: page.getByText('Condenser - Get accounts') })
      .filter({ has: page.getByText(customApiNodeName) })
      .getByTestId('hc-api-name');

    expect(await apiNameInList.textContent()).toBe(customApiNodeName);
  });

  test('Delete custom node to the healthchecker for API Endpoint servers', async ({ page }) => {
    const customApiNodeName: string = 'https://hive-test-test.hive';
    await profilePage.gotoApiEndpointHealthcheckerProfilePage('@gtg');

    // Add custom node
    await profilePage.apiAddressInput.fill(customApiNodeName);
    await profilePage.apiAddButton.click();

    const apiNameInList = page
      .locator('.rounded-lg.border')
      .filter({ has: page.getByText('Condenser - Get accounts') })
      .filter({ has: page.getByText(customApiNodeName) })
      .getByTestId('hc-api-name');

    expect(await apiNameInList.textContent()).toBe(customApiNodeName);

    // Delete custom node
    const deleteCustomNodeButton = page
      .locator('.rounded-lg.border')
      .filter({ has: page.getByText('Condenser - Get accounts') })
      .filter({ has: page.getByText(customApiNodeName) })
      .locator('button > svg');

    await deleteCustomNodeButton.click();

    await expect(apiNameInList).not.toBeVisible();
  });

  test('Add custom node to the healthchecker for AI Search', async ({ page }) => {
    const customApiNodeName: string = 'https://hive-test-aisearch.hive';
    await profilePage.gotoAISearchApiEndpointHealthcheckerProfilePage('@gtg');

    await profilePage.apiAddressInput.fill(customApiNodeName);
    await profilePage.apiAddButton.click();

    const apiNameInList = page
      .locator('.rounded-lg.border')
      .filter({ has: page.getByText('AI search') })
      .filter({ has: page.getByText(customApiNodeName) })
      .getByTestId('hc-api-name');

    expect(await apiNameInList.textContent()).toBe(customApiNodeName);
  });

  test('Delete custom node to the healthchecker for AI Search', async ({ page }) => {
    const customApiNodeName: string = 'https://hive-test-aisearch.hive';
    await profilePage.gotoAISearchApiEndpointHealthcheckerProfilePage('@gtg');

    // Add custom node
    await profilePage.apiAddressInput.fill(customApiNodeName);
    await profilePage.apiAddButton.click();

    const apiNameInList = page
      .locator('.rounded-lg.border')
      .filter({ has: page.getByText('AI search') })
      .filter({ has: page.getByText(customApiNodeName) })
      .getByTestId('hc-api-name');

    expect(await apiNameInList.textContent()).toBe(customApiNodeName);

    // Delete custom node
    const deleteCustomNodeButton = page
      .locator('.rounded-lg.border')
      .filter({ has: page.getByText('AI search') })
      .filter({ has: page.getByText(customApiNodeName) })
      .locator('button > svg');

    await deleteCustomNodeButton.click();

    await expect(apiNameInList).not.toBeVisible();
  });

  test('Type wrong api server name for validating error message for API Endpoint servers', async ({ page }) => {
    const wrongCustomApiNodeName: string = 'hive-test-test.hive';
    const errorMessage: string = 'Please enter a valid URL (must start with http:// or https://)';
    await profilePage.gotoApiEndpointHealthcheckerProfilePage('@gtg');

    await profilePage.apiAddressInput.fill(wrongCustomApiNodeName);
    await profilePage.apiAddButton.click();

    const errorMessageElement = page.getByText(errorMessage);

    expect(await errorMessageElement.textContent()).toBe(errorMessage);
  });

  test('Type wrong api server name for validating error message for AI search', async ({ page }) => {
    const wrongCustomApiNodeName: string = 'hive-test-aisearch.hive';
    const errorMessage: string = 'Please enter a valid URL (must start with http:// or https://)';
    await profilePage.gotoAISearchApiEndpointHealthcheckerProfilePage('@gtg');

    await profilePage.apiAddressInput.fill(wrongCustomApiNodeName);
    await profilePage.apiAddButton.click();

    const errorMessageElement = page.getByText(errorMessage);

    expect(await errorMessageElement.textContent()).toBe(errorMessage);
  });

  test('Filter api nodes for API Endpoint servers', async ({ page }) => {
    const filterCustomApiNodeName: string = 'api.hive.blog';
    await profilePage.gotoApiEndpointHealthcheckerProfilePage('@gtg');

    await profilePage.apiFilterInput.fill(filterCustomApiNodeName);

    expect(await profilePage.apiEndpointCard.count()).toBe(1);
  });

  test('Filter api nodes for AI Search', async ({ page }) => {
    const filterCustomApiNodeName: string = 'api.hive.blog';
    await profilePage.gotoAISearchApiEndpointHealthcheckerProfilePage('@gtg');

    await profilePage.apiFilterInput.fill(filterCustomApiNodeName);

    expect(await profilePage.apiEndpointCard.count()).toBe(1);
  });

  test('Validate styles for API Endpoint servers', async ({ page }) => {
    await profilePage.gotoApiEndpointHealthcheckerProfilePage('@gtg');

    // Validate color of the selected word
    expect(await profilePage.getElementCssPropertyValue(profilePage.apiSelectedNodeText, 'color')).toBe(
      'rgb(22, 163, 74)'
    );
    // Validate color of the selected node border
    expect(await profilePage.getElementCssPropertyValue(profilePage.apiEndpointCard.first(), 'border-bottom-color')).toBe(
      'rgb(237, 237, 237)'
    );
    // Validate style of the first Set Main button
    expect(await profilePage.getElementCssPropertyValue(profilePage.firstSetMainButton, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    expect(await profilePage.getElementCssPropertyValue(profilePage.firstSetMainButton, 'background-color')).toBe(
      'rgb(24, 30, 42)'
    );
  });

  test('Validate styles for API Endpoint servers in the dark mode', async ({ page }) => {
    const homePage = new HomePage(page);
    await profilePage.gotoApiEndpointHealthcheckerProfilePage('@gtg');

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await homePage.page.waitForTimeout(1000);

    // Validate color of the selected word
    expect(await profilePage.getElementCssPropertyValue(profilePage.apiSelectedNodeText, 'color')).toBe(
      'rgb(22, 163, 74)'
    );
    // Validate color of the selected node border
    expect(await profilePage.getElementCssPropertyValue(profilePage.apiEndpointCard.first(), 'border-bottom-color')).toBe(
      'rgb(255, 255, 255)'
    );
    // Validate style of the first Set Main button
    expect(await profilePage.getElementCssPropertyValue(profilePage.firstSetMainButton, 'color')).toBe(
      'rgb(2, 2, 5)'
    );
    expect(await profilePage.getElementCssPropertyValue(profilePage.firstSetMainButton, 'background-color')).toBe(
      'rgb(248, 250, 252)'
    );
  });

});
