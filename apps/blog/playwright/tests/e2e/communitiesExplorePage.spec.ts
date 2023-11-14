import { test, expect, Locator } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { CommunitiesPage } from '../support/pages/communitiesExplorerPage';
import { ApiHelper } from '../support/apiHelper';
import { LoginToVoteDialog } from '../support/pages/loginToVoteDialog';

test.describe('Explore communities page tests', () => {
  let homePage: HomePage;
  let communitiesPage: CommunitiesPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    communitiesPage = new CommunitiesPage(page);
  });

  test('move to Explore communities... from Home Page', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();
  });

  test('validate amount of communities in the Rank list', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const apiHelper = new ApiHelper(page);
    const rankCommunitiesListAPI = await apiHelper.getListCommunitiesAPI();

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    await expect(await communitiesPage.communityListItem.all()).toHaveLength(await rankCommunitiesListAPI.result.length);
  });

  test('validate amount of communities in the Subscribers list', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const apiHelper = new ApiHelper(page);
    const subscribersCommunitiesListAPI = await apiHelper.getListCommunitiesAPI('',100,null,'subs','');

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    await communitiesPage.communitiesFilter.click();
    await communitiesPage.communitiesFilterItems.getByText("Subscribers").click();
    await page.waitForTimeout(1000);
    await expect(await communitiesPage.communityListItem.all()).toHaveLength(await subscribersCommunitiesListAPI.result.length);
  });

  test('validate amount of communities in the New list', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const apiHelper = new ApiHelper(page);
    const newCommunitiesListAPI = await apiHelper.getListCommunitiesAPI('',100,null,'new','');

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    await communitiesPage.communitiesFilter.click();
    await communitiesPage.communitiesFilterItems.getByText("New").click();
    await page.waitForTimeout(1000);
    await expect(await communitiesPage.communityListItem.all()).toHaveLength(await newCommunitiesListAPI.result.length);
  });

  test('validate first community title in the Rank list', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const apiHelper = new ApiHelper(page);
    const rankCommunitiesListAPI = await apiHelper.getListCommunitiesAPI();
    const firstRankCommunitiesListAPI = await rankCommunitiesListAPI.result[0];
    const firstRankCommunitiesTitleAPI = await firstRankCommunitiesListAPI.title;

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    await expect(communitiesPage.communityListItemTitle.first()).toHaveText(firstRankCommunitiesTitleAPI);
  });

  test('validate first community card description in the Rank list', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const apiHelper = new ApiHelper(page);
    const rankCommunitiesListAPI = await apiHelper.getListCommunitiesAPI();
    const firstRankCommunitiesListAPI = await rankCommunitiesListAPI.result[0];
    const firstRankCommunitiesAboutAPI = await firstRankCommunitiesListAPI.about;

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    await expect(communitiesPage.communityListItemAbout.first()).toHaveText(firstRankCommunitiesAboutAPI);
  });

  test('validate first community card subscribers, authors, posts amount in the Rank list', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const apiHelper = new ApiHelper(page);
    const rankCommunitiesListAPI = await apiHelper.getListCommunitiesAPI();
    const firstRankCommunitiesListAPI = await rankCommunitiesListAPI.result[0];
    const firstSubscribersAmountRankCommunitiesAPI = await firstRankCommunitiesListAPI.subscribers;
    const firstAuthorsAmountRankCommunitiesAPI = await firstRankCommunitiesListAPI.num_authors;
    const firstPostsAmountRankCommunitiesAPI = await firstRankCommunitiesListAPI.num_pending;
    const firstAdminsAmountRankCommunitiesAPI = await firstRankCommunitiesListAPI.admins;

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    // validate amount of subscribers
    expect(await communitiesPage.communityListItemFooter.first().textContent()).toContain(firstSubscribersAmountRankCommunitiesAPI.toString());
    // validate amount of authors
    expect(await communitiesPage.communityListItemFooter.first().textContent()).toContain(firstAuthorsAmountRankCommunitiesAPI.toString());
    // validate amount of posts
    expect(await communitiesPage.communityListItemFooter.first().textContent()).toContain(firstPostsAmountRankCommunitiesAPI.toString());
    // validate amount of admins
    expect(await communitiesPage.communityListItemFooter.first().textContent()).toContain(firstAdminsAmountRankCommunitiesAPI.toString());
  });

  test('move to the login page after clicking subscribe button of the first community', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const loginToVoteDialog = new LoginToVoteDialog(page);

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    const subscribeButton = await communitiesPage.communityListItemSubscribeButton.first();
    await subscribeButton.click();
    await loginToVoteDialog.validateLoginToVoteDialogIsVisible();
    await loginToVoteDialog.closeLoginDialog();
  });

  test('validate first community card styles in the light mode', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    // Validate style of the community name
    expect(
      await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemTitle.first(), 'color')
    ).toBe('rgb(220, 38, 38)');
    // Validate style of the community description
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemAbout.first(), 'color')
    ).toBe('rgb(15, 23, 42)');
    // Validate style of the community footer ( subscribers, authors, posts)
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemFooter.locator('p').first(), 'color')
    ).toBe('rgb(100, 116, 139)');
    // Validate style of the community footer ( admin: label)
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemFooter.locator('p span').first(), 'color')
    ).toBe('rgb(100, 116, 139)');
    // Validate style of the community footer ( admin: name)
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemFooter.locator('p span > a').first(), 'color')
    ).toBe('rgb(220, 38, 38)');
    // Validate style of the community subscribe button
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemSubscribeButton.first(), 'color')
    ).toBe('rgb(248, 250, 252)');
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemSubscribeButton.first(), 'background-color')
    ).toBe('rgb(30, 64, 175)');
    // Validate the background color of the community card item
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItem.first(), 'background-color')
    ).toBe('rgb(255, 255, 255)');
  });

  test('validate first community card styles in the dark mode', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    // move to the dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    // Validate style of the community name
    expect(
      await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemTitle.first(), 'color')
    ).toBe('rgb(220, 38, 38)');
    // Validate style of the community description
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemAbout.first(), 'color')
    ).toBe('rgb(255, 255, 255)');
    // Validate style of the community footer ( subscribers, authors, posts)
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemFooter.locator('p').first(), 'color')
    ).toBe('rgb(148, 163, 184)');
    // Validate style of the community footer ( admin: label)
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemFooter.locator('p span').first(), 'color')
    ).toBe('rgb(148, 163, 184)');
    // Validate style of the community footer ( admin: name)
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemFooter.locator('p span > a').first(), 'color')
    ).toBe('rgb(220, 38, 38)');
    // Validate style of the community subscribe button
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemSubscribeButton.first(), 'color')
    ).toBe('rgb(2, 2, 5)');
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItemSubscribeButton.first(), 'background-color')
    ).toBe('rgb(30, 64, 175)');
    // Validate the background color of the community card item
    expect(
        await communitiesPage.getElementCssPropertyValue(await communitiesPage.communityListItem.first(), 'background-color')
    ).toBe('rgba(3, 7, 17, 0.95)');
  });

  test('validate no results for your search message', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const nonExistentCommunity: string = 'abcdefgh';
    const noResultsMessage: string = 'No results for your search';

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    await communitiesPage.searchInput.fill(nonExistentCommunity);
    await communitiesPage.page.keyboard.press('Enter');
    await expect(communitiesPage.noResultsForYourSearch).toHaveText(noResultsMessage);
  });

  test('validate there is list of communities when you type nothing into the community search', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const nonExistentCommunity: string = 'abcdefgh';
    const noResultsMessage: string = 'No results for your search';
    const emptyString: string = '';

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    // write non-existing to the communities search
    await communitiesPage.searchInput.fill(nonExistentCommunity);
    await communitiesPage.page.keyboard.press('Enter');
    await expect(communitiesPage.noResultsForYourSearch).toHaveText(noResultsMessage);
    // write empty string to the communities search
    await communitiesPage.searchInput.fill(emptyString);
    await communitiesPage.page.keyboard.press('Enter');
    await expect(communitiesPage.noResultsForYourSearch).not.toBeVisible();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();
  });

  test('validate results of searching community name', async ({ page }) => {
    const communitiesPage = new CommunitiesPage(page);
    const communityName: string = 'LeoFinance';

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    // fill input search by comunity name
    await communitiesPage.searchInput.fill(communityName);
    await communitiesPage.page.keyboard.press('Enter');
    await communitiesPage.communityListItem.waitFor();
    await expect(await communitiesPage.communityListItem.count()).toBe(1);
    // clear input search by fill with emptystring
    await communitiesPage.searchInput.fill('');
    await communitiesPage.page.keyboard.press('Enter');
    await communitiesPage.communityListItem.first().waitFor();
    await expect(await communitiesPage.communityListItem.count()).toBe(100);
  });

  test('validate results of searching community name and esc key to clear input search', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox' || browserName === "webkit", 'Automatic test works well on chromium');
    const communitiesPage = new CommunitiesPage(page);
    const communityName: string = 'LeoFinance';

    await homePage.goto();
    await homePage.getExploreCommunities.click();
    await communitiesPage.validataExplorerCommunitiesPageIsLoaded();

    // fill input search by comunity name
    await communitiesPage.searchInput.fill(communityName);
    await communitiesPage.page.keyboard.press('Enter');
    await communitiesPage.communityListItem.waitFor();
    await expect(await communitiesPage.communityListItem.count()).toBe(1);
    // clear input search by clicking Escape and Enter to search
    await communitiesPage.searchInput.click();
    await communitiesPage.page.keyboard.press('Escape');
    await communitiesPage.page.keyboard.press('Enter');
    await communitiesPage.page.waitForTimeout(2000);
    await communitiesPage.communityListItem.first().waitFor();
    await expect(await communitiesPage.communityListItem.count()).toBe(100);
  });
});
