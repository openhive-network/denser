import { test, expect, Locator } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { CommunitiesPage } from '../support/pages/communitiesPage';

test.describe('Home page tests - Trending Communities', () => {
  test('has "Trending Communities" sidebar', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.isTrendingCommunitiesVisible();
  });

  test('move from one community to other community and home page next', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    // move from HomePage to LeoFinance community
    await homePage.moveToLeoFinanceCommunities();
    await homePage.moveToPinmappleCommunities();
    // move from Pinmapple to Home page
    await homePage.moveToHomePage();
  });

  test('move to Explore communities... from Home Page', async ({ page }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataCommunitiesPageIsLoaded();
  });

  test('validate trending communities links are visible and the same as in api', async ({
    page,
    request
  }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const url = process.env.NEXT_PUBLIC_API_NODE_ENDPOINT;
    let titleCommunitiesList = [];

    const response = await request.post(`https://${url}/`, {
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
