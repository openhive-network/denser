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
    await homePage.page.waitForSelector(homePage.articleBodyString);
    const specificContentTextLocator: Locator = homePage.page
      .locator(homePage.articleBodyString)
      .locator('p > strong')
      .getByText(expectedContentElementText);
    expect(specificContentTextLocator).toBeVisible();
  });

  test('validate redirect location for user/permlink endpoint', async ({ page, request }) => {
    const userPermlinkEndpoint: string = '/@gtg/hello-world';
    const expectedEndpoint: string = '/introduceyourself/@gtg/hello-world';

    await homePage.gotoSpecificUrl(userPermlinkEndpoint);

    const requestEndpoint = `${userPermlinkEndpoint}`;

    await homePage.page.waitForSelector(homePage.articleBodyString);

    // Validate the redirect request
    const response = await request.get(requestEndpoint, { maxRedirects: 0 });
    expect(response.status()).toBe(302);

    // Get the location header of the respons
    const location = response.headers()['location'];
    expect(location).toContain(expectedEndpoint);
  });

  test('validate redirect location for user/permlink endpoint of the comment', async ({ page, request }) => {
    const userPermlinkEndpoint: string = '/@gtg/re-palmerjm1-re-gtg-hello-world-20170808t063121445z';
    const expectedEndpoint: string =
      '/introduceyourself/@gtg/re-palmerjm1-re-gtg-hello-world-20170808t063121445z';

    await homePage.gotoSpecificUrl(userPermlinkEndpoint);

    const requestEndpoint = `${userPermlinkEndpoint}`;

    await homePage.page.waitForSelector(homePage.articleBodyString);

    // Validate the redirect request
    const response = await request.get(requestEndpoint, { maxRedirects: 0 });
    expect(response.status()).toBe(302);

    // Get the location header of the respons
    const location = response.headers()['location'];
    expect(location).toContain(expectedEndpoint);
  });
});
