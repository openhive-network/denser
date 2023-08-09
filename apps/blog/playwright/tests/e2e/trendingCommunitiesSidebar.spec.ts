import { test, expect, Locator } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { CommunitiesPage } from '../support/pages/communitiesExplorerPage';

test.describe('Home page tests - All posts', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });
  test('has "All posts" sidebar', async ({ page }) => {
    await homePage.goto();
    await homePage.isTrendingCommunitiesVisible();
  });

  test('move from one community to other community and home page next', async ({ page }) => {
    await homePage.goto();
    // move from HomePage to LeoFinance community
    await homePage.moveToLeoFinanceCommunities();
    await homePage.moveToPinmappleCommunities();
    // move from Pinmapple to Home page
    // await homePage.moveToHomePage();
    await page.goBack()
    await page.waitForLoadState()
    await page.goBack()
    await page.waitForLoadState()
    await expect(homePage.getHeaderLeoCommunities).toBeVisible();
    await expect(homePage.getHeaderLeoCommunities).toContainText('All posts')
  });

  test('move to Explore communities... from Home Page', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();
  });

  test('validate trending communities links are visible and the same as in api', async ({
    page,
    request
  }) => {
    await homePage.goto();

    const url = process.env.REACT_APP_API_ENDPOINT;
    let titleCommunitiesList = [];

    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.list_communities',
        params: { last: '', limit: 100, query: null, sort: 'rank', observer: '' }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    // Twelve communities is displayed in Trending Communities sidebar
    for (let i = 0; i < 12; i++) {
      // console.log((await response.json()).result[i].title)
      titleCommunitiesList.push((await response.json()).result[i].title);
    }

    expect((await homePage.getTrendingCommunitiesSideBarLinks.all()).length - 1).toBe(
      titleCommunitiesList.length
    );

    // Get Tranding communities link names from website
    let displayedNameLink: Locator[] = [];

    for (const el of await homePage.getTrendingCommunitiesSideBarLinks.all()) {
      displayedNameLink.push(await el.textContent());
    }

    // Compare the link names of communities from api against the link names taken from the website
    titleCommunitiesList.forEach(async (linkName, index) => {
      expect(linkName).toBe(displayedNameLink[index]);
    });
  });
});
