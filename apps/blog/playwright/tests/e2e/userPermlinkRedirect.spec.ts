import { expect, Locator, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

test.describe('User permlink rewrite tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('validate content of the user/permlink endpoint', async ({ page, request, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

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

  test('validate rewrite serves content for user/permlink endpoint', async ({ page, request }) => {
    const userPermlinkEndpoint: string = '/@gtg/hello-world';
    const expectedCanonical: string = '/introduceyourself/@gtg/hello-world';

    await homePage.gotoSpecificUrl(userPermlinkEndpoint);
    await homePage.page.waitForSelector(homePage.articleBodyString);

    // Middleware now rewrites instead of redirecting (for CSS :visited to work)
    // Verify URL stays the same (rewrite behavior)
    expect(homePage.page.url()).toContain(userPermlinkEndpoint);

    // Verify canonical link points to the correct URL with category
    const canonicalLink = await homePage.page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonicalLink).toContain(expectedCanonical);
  });

  test('validate rewrite serves content for user/permlink endpoint of the comment', async ({ page, request }) => {
    const userPermlinkEndpoint: string = '/@gtg/re-palmerjm1-re-gtg-hello-world-20170808t063121445z';
    const expectedCanonical: string =
      '/introduceyourself/@gtg/re-palmerjm1-re-gtg-hello-world-20170808t063121445z';

    await homePage.gotoSpecificUrl(userPermlinkEndpoint);
    await homePage.page.waitForSelector(homePage.articleBodyString);

    // Verify URL stays the same (rewrite behavior)
    expect(homePage.page.url()).toContain(userPermlinkEndpoint);

    // Verify canonical link points to the correct URL with category
    const canonicalLink = await homePage.page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonicalLink).toContain(expectedCanonical);
  });
});
