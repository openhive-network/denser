import { expect, test } from '@playwright/test';

import { HomePage } from '../support/pages/homePage';
import { LoginToVoteDialog } from '../support/pages/loginToVoteDialog';

test.describe('Home page tests', () => {
  test('has the main timeline of posts (20 posts are displayed by default)', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.mainPostsTimelineVisible(20);
  });

  test('load next the main timeline of posts (40 posts are displayed by default)', async ({
    page,
    browserName
  }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');
    await homePage.mainPostsTimelineVisible(40);
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
    expect(homePage.getFirstPostPayout).toHaveText(`$${postPayout}`);

    const firstPostTotalVotes = (await homePage.getFirstPostVotes.allInnerTexts()).at(0);
    expect(firstPostTotalVotes).toBe(String(postTotalVotes));

    // const firstPostChildren = (await homePage.getFirstPostChildren.allInnerTexts()).at(0);
    // expect(firstPostChildren).toBe(String(postChildren));
  });

  test('validate the first post header styles (for Trending filter) in the light theme', async ({ page }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    const homePage = new HomePage(page);
    await homePage.goto();

    // Post author link color without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostAuthor, 'color')).toBe(
      'rgb(0, 0, 0)'
    );
    // Post author link color after hovering
    await homePage.getFirstPostAuthor.hover();
    await homePage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostAuthor, 'color')).toBe(
      'rgb(220, 38, 38)'
    );

    // Community or category link color without hovering in the post card
    if (await homePage.getFirstPostCardCommunityLink) {
      // Communitylink color without hovering in the post card
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCommunityLink, 'color')
      ).toBe('rgb(100, 116, 139)');
      // Communitylink color after hovering in the post card
      await homePage.getFirstPostCardCommunityLink.hover();
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCommunityLink, 'color')
      ).toBe('rgb(220, 38, 38)');
    }
    if (await homePage.getFirstPostCardCategoryLink) {
      // Communitylink color without hovering in the post card
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCategoryLink, 'color')
      ).toBe('rgb(100, 116, 139)');
      // Communitylink color after hovering in the post card
      await homePage.getFirstPostCardCategoryLink.hover();
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCategoryLink, 'color')
      ).toBe('rgb(220, 38, 38)');
    }

    // Timestamp link color without hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(100, 116, 139)');
    // Timestamp link color after hovering
    await homePage.getFirstPostCardTimestampLink.hover();
    await homePage.page.waitForTimeout(1000);
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(220, 38, 38)');
  });

  test('validate the first post header styles (for Trending filter) in the dark theme', async ({ page }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    const homePage = new HomePage(page);
    await homePage.goto();

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Post author link color without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostAuthor, 'color')).toBe(
      'rgb(255, 255, 255)'
    );
    // Post author link color after hovering
    await homePage.getFirstPostAuthor.hover();
    await homePage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostAuthor, 'color')).toBe(
      'rgb(220, 38, 38)'
    );

    // Community or category link color without hovering in the post card
    if (await homePage.getFirstPostCardCommunityLink) {
      // Communitylink color without hovering in the post card
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCommunityLink, 'color')
      ).toBe('rgb(148, 163, 184)');
      // Communitylink color after hovering in the post card
      await homePage.getFirstPostCardCommunityLink.hover();
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCommunityLink, 'color')
      ).toBe('rgb(220, 38, 38)');
    }
    if (await homePage.getFirstPostCardCategoryLink) {
      // Communitylink color without hovering in the post card
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCategoryLink, 'color')
      ).toBe('rgb(148, 163, 184)');
      // Communitylink color after hovering in the post card
      await homePage.getFirstPostCardCategoryLink.hover();
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCategoryLink, 'color')
      ).toBe('rgb(220, 38, 38)');
    }

    // Timestamp link color without hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(148, 163, 184)');
    // Timestamp link color after hovering
    await homePage.getFirstPostCardTimestampLink.hover();
    await homePage.page.waitForTimeout(1000);
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(220, 38, 38)');
  });

  test('validate the first post (for New filter)', async ({ page, request, browserName }) => {
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
    expect(homePage.getFirstPostPayout).toHaveText(`$${postPayout}`);

    const firstPostTotalVotes = (await homePage.getFirstPostVotes.allInnerTexts()).at(0);
    expect(firstPostTotalVotes).toBe(String(postTotalVotes));

    // const firstPostChildren = (await homePage.getFirstPostChildren.allInnerTexts()).at(0);
    // expect(firstPostChildren).toBe(String(postChildren));
  });

  test('move to the first post author profile page', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.moveToFirstPostAuthorProfilePage();
  });

  test('move to the first post author profile page by avatar clicking', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.moveToFirstPostAuthorProfilePageByAvatar();
  });

  test('move to the first post community or category', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.moveToFirstPostCommunityOrCategory();
  });

  test('move to the first post content by clicking the timestamp', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.moveToFirstPostContentByClickingTimestamp();
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

  test('validate change background color style after hovering the post card in the dark mode', async ({
    page
  }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    await homePage.validateThemeModeIsLight();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // background color before hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostListItem, 'background-color')
    ).toBe('rgba(3, 7, 17, 0.95)');

    await homePage.getFirstPostListItem.hover();
    await homePage.page.waitForTimeout(1000);

    // background color after hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostListItem, 'background-color')
    ).toBe('rgb(29, 40, 58)');
  });

  test('filtr posts in maintimeline', async ({ browser, browserName }) => {
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
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getCardExploreHiveLinks.locator('a').first(),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');
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
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getTrendingCommunitiesSideBarLinks.first(),
        'color'
      )
    ).toBe('rgb(15, 23, 42)');
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

  test('validate upvote button styles and the tootpit of the first post in the light theme', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Before hovering
    // Upvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');

    // Upvote icon background-color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');


    // Hover upvote button
    await homePage.getFirstPostUpvoteButton.hover();
    await homePage.page.waitForTimeout(1000);
    // Validate the tooltip message
    expect(await homePage.getFirstPostUpvoteButtonTooltip.textContent()).toBe(
      'UpvoteUpvote'
    );
    // Upvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(255, 255, 255)');

    // Upvote icon background-color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'background-color'
      )
    ).toBe('rgb(220, 38, 38)');
  });

  test('validate upvote button styles and the tootpit of the first post in the dark theme', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Before hovering
    // Upvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');

    // Upvote icon background-color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');


    // Hover upvote button
    await homePage.getFirstPostUpvoteButton.hover();
    await homePage.page.waitForTimeout(1000);
    // Validate the tooltip message
    expect(await homePage.getFirstPostUpvoteButtonTooltip.textContent()).toBe(
      'UpvoteUpvote'
    );
    // Upvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(255, 255, 255)');

    // Upvote icon background-color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'background-color'
      )
    ).toBe('rgb(220, 38, 38)');
  });

  test.only('click upvote button and move to the dialog "Login to Vote" ', async ({ page }) => {
    const homePage = new HomePage(page);
    const loginDialog = new LoginToVoteDialog(page);
    await homePage.goto();

    await homePage.getFirstPostUpvoteButton.click();
    await loginDialog.validateLoginToVoteDialogIsVisible();
    await loginDialog.closeLoginDialog();
    await homePage.isTrendingCommunitiesVisible();
  });

});
