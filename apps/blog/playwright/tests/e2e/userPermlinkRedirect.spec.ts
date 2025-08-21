import { expect, Locator, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

test.describe('User parmlink redirect tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('validate content of the user/permlink endpoint ', async ({ page, request }) => {
    const userPermlinkEndpoint: string = `/@gtg/hello-world`;
    const expectedContentElementText: string = 'Nyunya';
    await homePage.gotoSpecificUrl(userPermlinkEndpoint);
    await homePage.page.waitForTimeout(3000);
    const specificContentTextLocator: Locator = homePage.page.locator(homePage.articleBodyString).locator('p > strong').getByText(expectedContentElementText);
    expect(specificContentTextLocator).toBeVisible();

  });

  test('validate redirect location for user/permlink endpoint', async ({ page, request }) => {
    const userPermlinkEndpoint: string = '/@gtg/hello-world';
    const expectedEndpoint: string = '/introduceyourself/@gtg/hello-world'

    await homePage.gotoSpecificUrl(userPermlinkEndpoint);

    const requestEndpoint = `${userPermlinkEndpoint}`;

    await homePage.page.waitForTimeout(5000);

    // Validate the redirect request
    const response = await request.get(requestEndpoint, { maxRedirects: 0 });
    expect(response.status()).toBe(302);

    // Get the location header of the respons
    const location = response.headers()['location'];
    expect(location).toBe(expectedEndpoint);
  });
});
