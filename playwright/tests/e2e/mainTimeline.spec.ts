import { expect, test } from '@playwright/test';

import { HomePage } from '../support/pages/homePage';

test.describe('Home page tests', () => {
  test.skip('has the main timeline of posts (20 posts are displayed by default)', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.mainPostsTimelineVisible();
  });

  test('validate the first post (for Trending filter)', async ({ page, request, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    const homePage = new HomePage(page);
    await homePage.goto();

    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_ranked_posts',
        params: { sort: 'trending', start_author: '', start_permlink: '', limit: 20, tag: '', observer: '' }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    // console.log((await response.json()).result[0])
    const postAuthor = (await response.json()).result[0].author;
    // console.log("Post author: ", await postAuthor)
    const postAuthorReputation = (await response.json()).result[0].author_reputation;
    // console.log("Post author reputation: ", await postAuthorReputation)
    const postTitle = (await response.json()).result[0].title;
    // console.log("Post title: ", await postTitle)
    const postPayout = (await response.json()).result[0].payout.toFixed(2);
    // console.log("Post payout: ", await postPayout)
    const postTotalVotes = (await response.json()).result[0].stats.total_votes;
    // console.log("Post total votes: ", await postTotalVotes)
    const postChildren = (await response.json()).result[0].children;
    // console.log("Responses to post : ", await postChildren)

    expect(homePage.getFirstPostAuthor).toHaveText(postAuthor);
    expect(homePage.getFirstPostAuthorReputation).toContainText(
      postAuthor + ' (' + Math.floor(postAuthorReputation) + ')'
    );
    expect(homePage.getFirstPostTitle).toHaveText(postTitle);
    expect(homePage.getFirstPostPayout).toHaveText(postPayout);

    const firstPostTotalVotes = (await homePage.getFirstPostVotes.allInnerTexts()).at(0);
    expect(firstPostTotalVotes).toBe(String(postTotalVotes));

    // const firstPostChildren = (await homePage.getFirstPostChildren.allInnerTexts()).at(0);
    // expect(firstPostChildren).toBe(String(postChildren));
  });

  test('validate the first post (for New filter)', async ({ page, request, browserName }) => {
    test.skip(browserName === 'chromium', 'Automatic test works well on chromium');

    const homePage = new HomePage(page);
    await homePage.goto();

    // click 'New' value of posts filter
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('New').locator('..').waitFor();
    await homePage.getFilterPostsList.getByText('New').locator('..').click();
    await expect(homePage.getFilterPosts).toHaveText('New');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_ranked_posts',
        params: { sort: 'created', start_author: '', start_permlink: '', limit: 20, tag: '', observer: '' }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    // console.log((await response.json()).result[0])
    const postAuthor = (await response.json()).result[0].author;
    // console.log("Post author: ", await postAuthor)
    const postAuthorReputation = (await response.json()).result[0].author_reputation;
    // console.log("Post author reputation: ", await postAuthorReputation)
    const postTitle = (await response.json()).result[0].title;
    // console.log("Post title: ", await postTitle)
    const postPayout = (await response.json()).result[0].payout.toFixed(2);
    // console.log("Post payout: ", await postPayout)
    const postTotalVotes = (await response.json()).result[0].stats.total_votes;
    // console.log("Post total votes: ", await postTotalVotes)
    const postChildren = (await response.json()).result[0].children;
    // console.log("Responses to post : ", await postChildren)

    expect(homePage.getFirstPostAuthor).toHaveText(postAuthor);
    expect(homePage.getFirstPostAuthorReputation).toContainText(
      postAuthor + ' (' + Math.floor(postAuthorReputation) + ')'
    );
    expect(homePage.getFirstPostTitle).toHaveText(postTitle);
    expect(homePage.getFirstPostPayout).toHaveText(postPayout);

    const firstPostTotalVotes = (await homePage.getFirstPostVotes.allInnerTexts()).at(0);
    expect(firstPostTotalVotes).toBe(String(postTotalVotes));

    // const firstPostChildren = (await homePage.getFirstPostChildren.allInnerTexts()).at(0);
    // expect(firstPostChildren).toBe(String(postChildren));
  });

  // Skipped - it needs improvements
  test.skip('move to the first post author profile page', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.moveToFirstPostAuthorProfilePage();
  });

  test('move to the dark mode and back to the light mode', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    await homePage.validateThemeModeIsLight();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await homePage.changeThemeMode('Light');
    await homePage.validateThemeModeIsLight();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await homePage.changeThemeMode('System');
    await homePage.validateThemeModeIsSystem();
  });

  test('filtr posts in maintimeline', async ({ browser, browserName }) => {
    test.skip(browserName === 'chromium', 'Automatic test works well on chromium');

    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    const homePage = new HomePage(newPage);

    await homePage.goto();

    await expect(homePage.getFilterPosts).toHaveText('Trending');
    // click 'New' value of posts filter
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('New').locator('..').waitFor();
    await homePage.getFilterPostsList.getByText('New').locator('..').click();
    await expect(homePage.getFilterPosts).toHaveText('New');
    // // click 'Hot' value of posts filter
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Hot').click();
    await expect(homePage.getFilterPosts).toHaveText('Hot');
    // click 'Payout' value of posts filter
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Payouts').click();
    await expect(homePage.getFilterPosts).toHaveText('Payouts');
    // click 'Promoted' value of posts filter
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Muted').click();
    await expect(homePage.getFilterPosts).toHaveText('Muted');
    // click 'Trending' value of posts filter
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Trending').click();
    await expect(homePage.getFilterPosts).toHaveText('Trending');
  });

  test('validate that Explore Hive sidebar is visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.getCardExploreHive).toBeVisible();
    await expect(homePage.getCardExploreHiveTitle).toHaveText('Explore Hive');
    await expect(homePage.getCardExploreHiveLinks).toHaveCount(5);
  });

  // Shortcuts sidebar is no longer avaiable on the Home Page
  test.skip('validate that Shortcuts sidebar is visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.getCardUserShortcuts).toBeVisible();
    await expect(homePage.getCardUserShortcutsTitle).toHaveText('Shortcuts');
    await expect(homePage.getCardUserShortcutsLinks).toHaveCount(3);
  });

  test('validate that All posts in communities sidebar is visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
    await expect(homePage.getTrandingCommunitiesHeader).toHaveText('All posts');
    await expect(homePage.getTrendingCommunitiesSideBarLinks).toHaveCount(13);
  });

  test('move to the Proposals page', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.moveToNavProposalsPage();
  });

  test('move to the Witnesses page', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.moveToNavWitnessesPage();
  });

  test('move to the Our dApps page', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.moveToNavOurdAppsPage();
  });

  test('navigation search input is visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.getNavSearchInput).toBeVisible();
    await expect(homePage.getNavSearchInput).toHaveAttribute('placeholder', 'Search...');
  });

  // gtg profil and his avatar is no longer aviable on the home page
  test.skip('navigation user avatar and its dropdown list is visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.getNavUserAvatar).toBeVisible();
    await expect(homePage.getNavUserAvatar.locator('img')).toHaveAttribute(
      'src',
      'https://images.hive.blog/u/gtg/avatar/small'
    );

    await homePage.getNavUserAvatar.click();
    await page.waitForSelector(homePage.getNavProfileMenuContent['_selector']);
    await expect(homePage.getNavProfileMenuContent.getByText('My Account')).toBeVisible();
  });

  test('navigation create post button is visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.getNavCreatePost).toBeVisible();
  });

  test('navigation hamburger menu is visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.getNavSidebarMenu).toBeVisible();
    await homePage.getNavSidebarMenu.click();
    await page.waitForSelector(homePage.getNavSidebarMenu['_selector']);
    await expect(homePage.getNavSidebarMenuContent).toBeVisible();
    await expect(homePage.getNavSidebarMenuContent.getByText('Welcome')).toBeVisible();
    await homePage.getNavSidebarMenuContentCloseButton.click();
    await expect(homePage.getNavSidebarMenuContent).not.toBeVisible();
  });
});
