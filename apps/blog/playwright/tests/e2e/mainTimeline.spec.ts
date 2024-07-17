import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ReblogThisPostDialog } from '../support/pages/reblogThisPostDialog';
import { ProfilePage } from '../support/pages/profilePage';
import { ApiHelper } from '../support/apiHelper';

test.describe('Home page tests', () => {
  let homePage: HomePage;
  let loginDialog: LoginForm;
  let reblogDialog: ReblogThisPostDialog;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginDialog = new LoginForm(page);
    reblogDialog = new ReblogThisPostDialog(page);
  });

  test('has the main timeline of posts (20 posts are displayed by default)', async ({ page }) => {
    await homePage.goto();
    await homePage.mainPostsTimelineVisible(20);
  });

  test('load next the main timeline of posts (40 posts are displayed by default)', async ({
    page,
    browserName
  }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.goto();
    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');
    await homePage.mainPostsTimelineVisible(40);
  });

  test('validate the first post (for Trending filter)', async ({ page, request, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

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
    expect(homePage.getFirstPostAuthorReputation).toContainText('(' + Math.floor(postAuthorReputation) + ')');
    expect(homePage.getFirstPostTitle).toHaveText(postTitle);
    expect(homePage.getFirstPostPayout).toHaveText(`$${postPayout}`);

    const firstPostTotalVotes = (await homePage.getFirstPostVotes.allInnerTexts()).at(0);
    expect(firstPostTotalVotes).toBe(String(postTotalVotes));

    const firstPostChildren = (await homePage.getFirstPostChildren.allInnerTexts()).at(0);
    expect(firstPostChildren).toBe(String(postChildren));
  });

  test('validate the first post footer payouts styles (for Trending filter) in the light theme', async ({
    page
  }) => {
    await homePage.goto();

    // Color of the first post payouts without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(24, 30, 42)'
    );
    await homePage.getFirstPostPayout.hover();
    await homePage.page.waitForTimeout(1000);
    // Color of the first post payouts with hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(255, 0, 0)'
    );
    // The tooltip is visible by hovering
    expect(await homePage.getFirstPostPayoutTooltip).toBeVisible();
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
  });

  test('validate the first post footer payouts styles (for Trending filter) in the dark theme', async ({
    page
  }) => {
    await homePage.goto();

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of the first post payouts without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    await homePage.getFirstPostPayout.hover();
    await homePage.page.waitForTimeout(1000);
    // Color of the first post payouts with hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(226, 18, 53)'
    );
    // The tooltip is visible by hovering
    expect(await homePage.getFirstPostPayoutTooltip).toBeVisible();
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'background-color')
    ).toBe('rgb(3, 7, 17)');
  });

  test('validate the first post footer votes styles (for Trending filter) in the light theme', async ({
    page
  }) => {
    await homePage.goto();

    // Color of the first post votes without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotes, 'color')).toBe(
      'rgb(24, 30, 42)'
    );
    await homePage.getFirstPostVotes.hover();
    await homePage.page.waitForTimeout(1000);

    const votes = await homePage.getFirstPostVotes.textContent();

    // Color of the first post votes with hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotes, 'color')).toBe(
      'rgb(24, 30, 42)'
    );

    // The tooltip is visible by hovering
    expect(await homePage.getFirstPostVotesTooltip.textContent()).toBe(votes + ' votes' + votes + ' votes');
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotesTooltip, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
  });

  test('validate the first post footer votes styles (for Trending filter) in the dark theme', async ({
    page
  }) => {
    await homePage.goto();
    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of the first post votes without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotes, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    await homePage.getFirstPostVotes.hover();
    await homePage.page.waitForTimeout(1000);

    const votes = await homePage.getFirstPostVotes.textContent();

    // Color of the first post votes with hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotes, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    // The tooltip is visible by hovering
    expect(await homePage.getFirstPostVotesTooltip.textContent()).toBe(votes + ' votes' + votes + ' votes');
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotesTooltip, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotesTooltip, 'background-color')
    ).toBe('rgb(34, 38, 42)');
  });

  test('validate the first post footer responses styles (for Trending filter) in the light theme', async ({
    page
  }) => {
    await homePage.goto();

    // Color of the first post comments number and icon without hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostChildernCommentNumber, 'color')
    ).toBe('rgb(24, 30, 42)');
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostChildernIcon, 'color')).toBe(
      'rgb(24, 30, 42)'
    );

    await homePage.getFirstPostChildernCommentNumber.hover();
    await homePage.page.waitForTimeout(1000);
    // Color of the first post comments number after hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostChildernCommentNumber, 'color')
    ).toBe('rgb(255, 0, 0)');
    // Color of the first post comments icon after hovering
    await homePage.getFirstPostChildernIcon.hover();
    await homePage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostChildernIcon, 'color')).toBe(
      'rgb(24, 30, 42)'
    );

    await homePage.getFirstPostChildernCommentNumber.hover();
    await homePage.page.waitForTimeout(1000);
    const commentNumber = await homePage.getFirstPostChildernCommentNumber.textContent();
    // The tooltip is visible by hovering
    if (commentNumber === '0') {
      expect(await homePage.getFirstPostChildernTooltip.textContent()).toContain(
        'No responses. Click to respond'
      );
    } else if (commentNumber === '1') {
      expect(await homePage.getFirstPostChildernTooltip.textContent()).toContain(
        `${commentNumber} response. Click to respond`
      );
    } else {
      expect(await homePage.getFirstPostChildernTooltip.textContent()).toContain(
        `${commentNumber} responses. Click to respond`
      );
    }
  });

  test('validate the first post footer responses styles (for Trending filter) in the dark theme', async ({
    page
  }) => {
    await homePage.goto();
    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.getFirstPostChildernCommentNumber.hover();
    await homePage.page.waitForTimeout(1000);
    // Color of the first post comments number after hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostChildernCommentNumber, 'color')
    ).toBe('rgb(226, 18, 53)');
    // Color of the first post comments icon after hovering
    await homePage.getFirstPostChildernIcon.hover();
    await homePage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostChildernIcon, 'color')).toBe(
      'rgb(248, 250, 252)'
    );

    await homePage.getFirstPostChildernCommentNumber.hover();
    await homePage.page.waitForTimeout(1000);
    const commentNumber = await homePage.getFirstPostChildernCommentNumber.textContent();
    // The tooltip is visible by hovering
    if (commentNumber === '0') {
      expect(await homePage.getFirstPostChildernTooltip.textContent()).toContain(
        'No responses. Click to respond'
      );
    } else if (commentNumber === '1') {
      expect(await homePage.getFirstPostChildernTooltip.textContent()).toContain(
        `${commentNumber} response. Click to respond`
      );
    } else {
      expect(await homePage.getFirstPostChildernTooltip.textContent()).toContain(
        `${commentNumber} responses. Click to respond`
      );
    }
  });

  test('validate the first post header styles (for Trending filter) in the light theme', async ({ page }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.goto();

    // Post author link color without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostAuthor, 'color')).toBe(
      'rgb(24, 30, 42)'
    );
    // Post author link color after hovering
    await homePage.getFirstPostAuthor.hover();
    await homePage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostAuthor, 'color')).toBe(
      'rgb(255, 0, 0)'
    );

    // Community or category link color without hovering in the post card
    if (await homePage.getFirstPostCardCommunityLink.isVisible()) {
      // Communitylink color without hovering in the post card
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCommunityLink, 'color')
      ).toBe('rgb(24, 30, 42)');
      // Communitylink color after hovering in the post card
      await homePage.getFirstPostCardCommunityLink.hover();
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCommunityLink, 'color')
      ).toBe('rgb(255, 0, 0)');
    }
    if (await homePage.getFirstPostCardCategoryLink.isVisible()) {
      // Communitylink color without hovering in the post card
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCategoryLink, 'color')
      ).toBe('rgb(24, 30, 42)');
      // Communitylink color after hovering in the post card
      await homePage.getFirstPostCardCategoryLink.hover();
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCategoryLink, 'color')
      ).toBe('rgb(24, 30, 42)');
    }

    // Timestamp link color without hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(24, 30, 42)');
    // Timestamp link color after hovering
    await homePage.getFirstPostCardTimestampLink.hover();
    await homePage.page.waitForTimeout(1000);
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(255, 0, 0)');
  });

  test('validate the first post header styles (for Trending filter) in the dark theme', async ({ page }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.goto();

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Post author link color without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostAuthor, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    // Post author link color after hovering
    await homePage.getFirstPostAuthor.hover();
    await homePage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostAuthor, 'color')).toBe(
      'rgb(226, 18, 53)'
    );

    // Community or category link color without hovering in the post card
    if (await homePage.getFirstPostCardCommunityLink.isVisible()) {
      // Communitylink color without hovering in the post card
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCommunityLink, 'color')
      ).toBe('rgb(248, 250, 252)');
      // Communitylink color after hovering in the post card
      await homePage.getFirstPostCardCommunityLink.hover();
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCommunityLink, 'color')
      ).toBe('rgb(226, 18, 53)');
    }
    if (await homePage.getFirstPostCardCategoryLink.isVisible()) {
      // Communitylink color without hovering in the post card
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCategoryLink, 'color')
      ).toBe('rgb(248, 250, 252)');
      // Communitylink color after hovering in the post card
      await homePage.getFirstPostCardCategoryLink.hover();
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardCategoryLink, 'color')
      ).toBe('rgb(226, 18, 53)');
    }

    // Timestamp link color without hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(248, 250, 252)');
    // Timestamp link color after hovering
    await homePage.getFirstPostCardTimestampLink.hover();
    await homePage.page.waitForTimeout(1000);
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(226, 18, 53)');
  });

  test('validate the first post (for New filter)', async ({ page, request, browserName }) => {
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
    expect(homePage.getFirstPostAuthorReputation).toContainText('(' + Math.floor(postAuthorReputation) + ')');
    expect(homePage.getFirstPostTitle).toHaveText(postTitle);
    expect(homePage.getFirstPostPayout).toHaveText(`$${postPayout}`);

    const firstPostTotalVotes = (await homePage.getFirstPostVotes.allInnerTexts()).at(0);
    expect(firstPostTotalVotes).toBe(String(postTotalVotes));

    // const firstPostChildren = (await homePage.getFirstPostChildren.allInnerTexts()).at(0);
    // expect(firstPostChildren).toBe(String(postChildren));
  });

  test('move to the first post author profile page', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFirstPostAuthorProfilePage();
  });

  test('move to the first post author profile page by avatar clicking', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFirstPostAuthorProfilePageByAvatar();
  });

  test('move to the first post community or category', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFirstPostCommunityOrCategory();
  });

  test('move to the first post content by clicking the timestamp', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFirstPostContentByClickingTimestamp();
  });

  test('move to the first post content by clicking the title of the post card', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFirstPostContentByClickingTitilePostCard();
  });

  test.skip('move to the first post content by clicking the description of the post card', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFirstPostContentByClickingDescriptionPostCard();
  });

  test('validate styles of the description of the post card in the light mode', async ({ page }) => {
    await homePage.goto();

    expect(await homePage.getElementCssPropertyValue(await homePage.postDescription.first(), 'color')).toBe(
      'rgb(100, 116, 139)'
    );
  });

  test('validate styles of the description of the post card in the dark mode', async ({ page }) => {
    await homePage.goto();
    // move to the dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    expect(await homePage.getElementCssPropertyValue(await homePage.postDescription.first(), 'color')).toBe(
      'rgb(127, 142, 163)'
    );
  });

  test('move to the first post content by clicking the responses', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToTheFirstPostCommentContantPageByClickingResponses();
  });

  test('move to the dark mode and back to the light mode', async ({ page }) => {
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
    await homePage.goto();

    await homePage.validateThemeModeIsLight();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // background color before hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostListItem, 'background-color')
    ).toBe('rgb(44, 48, 53)');

    await homePage.getFirstPostListItem.hover();
    await homePage.page.waitForTimeout(1000);

    // background color after hovering
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostListItem, 'background-color')
    ).toBe('rgb(44, 48, 53)');
  });

  test('filtr posts in maintimeline', async ({ browser, browserName }) => {
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

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
    await homePage.goto();

    await expect(homePage.getCardExploreHive).toBeVisible();
    await expect(homePage.getCardExploreHiveTitle).toHaveText('Explore Hive');
    await expect(homePage.getCardExploreHiveLinks).toHaveCount(5);
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getCardExploreHiveLinks.locator('a').first(),
        'color'
      )
    ).toBe('rgb(24, 30, 42)');
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
    await homePage.goto();

    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
    await expect(homePage.getTrandingCommunitiesHeader).toHaveText('All posts');
    await expect(homePage.getTrendingCommunitiesSideBarLinks).toHaveCount(13);
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getTrendingCommunitiesSideBarLinks.first(),
        'color'
      )
    ).toBe('rgb(24, 30, 42)');
  });

  test.skip('move to the Proposals page', async ({ page, context }) => {
    await homePage.goto();
    await page.click('[data-testid="nav-proposals-link"]');
    // await homePage.moveToNavProposalsPage();

    const [newWindow] = await Promise.all([
      context.waitForEvent('page'),
      await page.click('[data-testid="nav-proposals-link"]')
    ]);
    await newWindow.waitForLoadState();
    expect(newWindow.url()).toContain(`/proposals`);
  });

  test.skip('move to the Witnesses page', async ({ page, context }) => {
    await homePage.goto();
    await page.click('[data-testid="nav-witnesses-link"]');
    // await homePage.moveToNavWitnessesPage();
    const [newWindow] = await Promise.all([
      context.waitForEvent('page'),
      await page.click('[data-testid="nav-witnesses-link"]')
    ]);
    await newWindow.waitForLoadState();
    expect(newWindow.url()).toContain(`/~witnesses`);
  });

  test('move to the Our dApps page', async ({ page }) => {
    await homePage.goto();

    await homePage.moveToNavOurdAppsPage();
  });

  // Navbar search input was deleted now is icone to open search page
  test.skip('navigation search input is visible', async ({ page }) => {
    await homePage.goto();

    await expect(homePage.getNavSearchInput).toBeVisible();
    await expect(homePage.getNavSearchInput).toHaveAttribute('placeholder', 'Search...');
  });

  test('navigation search link is visible', async ({ page }) => {
    await homePage.goto();

    await expect(homePage.getNavSearchLink).toBeVisible();
  });

  test('move to the search page', async ({ page }) => {
    await homePage.goto();

    await expect(homePage.getNavSearchLink).toBeVisible();
    // click search link in navbar
    await homePage.getNavSearchLink.click();
    // validate url was changed to /search
    await expect(homePage.page).toHaveURL('/search');
    // validate that input search is visible on the page
    await expect(homePage.getNavSearchInput).toBeVisible();
    await expect(homePage.getNavSearchInput).toHaveAttribute('placeholder', 'Search...');
    // validate the 'sort by' dropdown list is visible
    await expect(page.locator('[data-testid="search-sort-by-dropdown-list"]')).toBeVisible();
  });

  test('navigation Login link is visible', async ({ page }) => {
    await homePage.goto();

    await expect(homePage.loginBtn).toBeVisible();
  });

  test('validate styles of navigation Login link in the light mode', async ({ page }) => {
    await homePage.goto();

    await expect(homePage.loginBtn).toBeVisible();
    await expect(await homePage.getElementCssPropertyValue(await homePage.loginBtn, 'color')).toBe(
      'rgb(51, 51, 51)'
    );
    await expect(await homePage.getElementCssPropertyValue(await homePage.loginBtn, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
    await homePage.loginBtn.hover();
    await homePage.page.waitForTimeout(1000);
    await expect(await homePage.getElementCssPropertyValue(await homePage.loginBtn, 'color')).toBe(
      'rgb(255, 0, 0)'
    );
    await expect(await homePage.getElementCssPropertyValue(await homePage.loginBtn, 'background-color')).toBe(
      'rgb(241, 245, 249)'
    );
  });

  test('validate styles of navigation Login link in the dark mode', async ({ page }) => {
    await homePage.goto();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await homePage.page.waitForTimeout(1000);
    await expect(homePage.loginBtn).toBeVisible();
    await expect(await homePage.getElementCssPropertyValue(await homePage.loginBtn, 'color')).toBe(
      'rgb(225, 231, 239)'
    );
    await expect(await homePage.getElementCssPropertyValue(await homePage.loginBtn, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
    await homePage.loginBtn.hover();
    await homePage.page.waitForTimeout(1000);
    await expect(await homePage.getElementCssPropertyValue(await homePage.loginBtn, 'color')).toBe(
      'rgb(226, 18, 53)'
    );
    await expect(await homePage.getElementCssPropertyValue(await homePage.loginBtn, 'background-color')).toBe(
      'rgb(29, 40, 58)'
    );
  });

  test('navigation Sign up link is visible', async ({ page }) => {
    await homePage.goto();

    await expect(homePage.signupBtn).toBeVisible();
  });

  // gtg profil and his avatar is no longer aviable on the home page
  test.skip('navigation user avatar and its dropdown list is visible', async ({ page }) => {
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
    await homePage.goto();

    await expect(homePage.getNavCreatePost).toBeVisible();
  });

  test('navigation hamburger menu is visible', async ({ page }) => {
    await homePage.goto();

    await expect(homePage.getNavSidebarMenu).toBeVisible();
    await homePage.getNavSidebarMenu.click();
    await page.waitForSelector(homePage.getNavSidebarMenu['_selector']);
    await expect(homePage.getNavSidebarMenuContent).toBeVisible();
    await expect(homePage.getNavSidebarMenuContent.getByText('Welcome')).toBeVisible();
    await homePage.getNavSidebarMenuContentCloseButton.click();
    await expect(homePage.getNavSidebarMenuContent).not.toBeVisible();
  });

  test('validate upvote button styles and the tooltip of the first post in the light theme', async ({
    page
  }) => {
    await homePage.goto();

    // Before hovering
    // Upvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostUpvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(255, 0, 0)');

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
    expect(await homePage.getFirstPostUpvoteButtonTooltip.textContent()).toBe('UpvoteUpvote');
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
    ).toBe('rgb(255, 0, 0)');
  });

  test('validate upvote button styles and the tooltip of the first post in the dark theme', async ({
    page
  }) => {
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
    ).toBe('rgb(226, 18, 53)');

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
    expect(await homePage.getFirstPostUpvoteButtonTooltip.textContent()).toBe('UpvoteUpvote');
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
    ).toBe('rgb(226, 18, 53)');
  });

  test('click upvote button and move to the dialog "Login to Vote" ', async ({ page }) => {
    await homePage.goto();

    await homePage.getFirstPostUpvoteButton.click();
    await loginDialog.validateDefaultLoginFormIsLoaded();
    await loginDialog.closeLoginForm();
    await homePage.isTrendingCommunitiesVisible();
  });

  test('validate downvote button styles and the tooltip of the first post in the light theme', async ({
    page
  }) => {
    await homePage.goto();

    // Before hovering
    // Downvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostDownvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(75, 85, 99)');

    // Downvote icon background-color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostDownvoteButton.locator('svg'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');

    // Hover downvote button
    await homePage.getFirstPostDownvoteButton.hover();
    await homePage.page.waitForTimeout(1000);
    // Validate the tooltip message
    expect(await homePage.getFirstPostDownvoteButtonTooltip.textContent()).toBe('DownvoteDownvote');
    // Downvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostDownvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(255, 255, 255)');

    // Downvote icon background-color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostDownvoteButton.locator('svg'),
        'background-color'
      )
    ).toBe('rgb(75, 85, 99)');
  });

  test('validate downvote button styles and the tooltip of the first post in the dark theme', async ({
    page
  }) => {
    await homePage.goto();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Before hovering
    // Downvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostDownvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(75, 85, 99)');

    // Downvote icon background-color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostDownvoteButton.locator('svg'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');

    // Hover downvote button
    await homePage.getFirstPostDownvoteButton.hover();
    await homePage.page.waitForTimeout(1000);
    // Validate the tooltip message
    expect(await homePage.getFirstPostDownvoteButtonTooltip.textContent()).toBe('DownvoteDownvote');
    // Downvote icon color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostDownvoteButton.locator('svg'),
        'color'
      )
    ).toBe('rgb(255, 255, 255)');

    // Downvote icon background-color
    expect(
      await homePage.getElementCssPropertyValue(
        await homePage.getFirstPostDownvoteButton.locator('svg'),
        'background-color'
      )
    ).toBe('rgb(75, 85, 99)');
  });

  test('click downvote button and move to the login dialog', async ({ page }) => {
    await homePage.goto();

    await homePage.getFirstPostDownvoteButton.click();
    await loginDialog.validateDefaultLoginFormIsLoaded();
    await loginDialog.closeLoginForm();
    await homePage.isTrendingCommunitiesVisible();
  });

  test('validate reblog button styles in the light theme', async ({ page }) => {
    await homePage.goto();

    // Color of reblog button
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostReblogButton, 'color')).toBe(
      'rgb(24, 30, 42)'
    );

    // The tooltip message and colors
    await homePage.getFirstPostReblogButton.hover();
    expect(await homePage.getFirstPostReblogTooltip.textContent()).toContain('Reblog');
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostReblogTooltip, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostReblogTooltip, 'background-color')
    ).toBe('rgb(247, 247, 247)');
  });

  test('validate reblog button styles in the dark theme', async ({ page }) => {
    await homePage.goto();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of reblog button
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostReblogButton, 'color')).toBe(
      'rgb(248, 250, 252)'
    );

    // The tooltip message and colors
    await homePage.getFirstPostReblogButton.hover();
    expect(await homePage.getFirstPostReblogTooltip.textContent()).toContain('Reblog');
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostReblogTooltip, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostReblogTooltip, 'background-color')
    ).toBe('rgb(34, 38, 42)');
  });

  test('move to the reblog this post dialog ', async ({ page }) => {
    await homePage.goto();

    await homePage.getFirstPostReblogButton.click();
    await reblogDialog.validateReblogThisPostHeaderIsVisible();
    await reblogDialog.validateReblogThisPostDescriptionIsVisible();
    // TODO: Check it only if user logged in
    // await expect(reblogDialog.getDialogOkButton).toBeVisible();
    await expect(reblogDialog.getDialogCancelButton).toBeVisible();
    await reblogDialog.closeReblogDialog();
    await expect(homePage.getTrandingCommunitiesHeader).toBeVisible();
  });

  test('validate styles of the reputation in the post card header in the light mode', async ({ page }) => {
    await homePage.goto();

    // Validate reputation color and tooltip
    const firstPostReputation = await homePage.getFirstPostAuthorReputation;
    expect(await homePage.getElementCssPropertyValue(await firstPostReputation, 'color')).toBe(
      'rgb(24, 30, 42)'
    );

    await firstPostReputation.hover();
    await homePage.page.waitForTimeout(1000);

    await expect(homePage.getFirstPostAuthorReputation).toHaveAttribute('title', 'Reputation');

    expect(await homePage.getElementCssPropertyValue(await firstPostReputation, 'color')).toBe(
      'rgb(24, 30, 42)'
    );
  });

  test('validate styles of the reputation in the post card header in the dark mode', async ({ page }) => {
    await homePage.goto();

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Validate reputation color and tooltip
    const firstPostReputation = await homePage.getFirstPostAuthorReputation;
    expect(await homePage.getElementCssPropertyValue(await firstPostReputation, 'color')).toBe(
      'rgb(248, 250, 252)'
    );

    await expect(homePage.getFirstPostAuthorReputation).toHaveAttribute('title', 'Reputation');

    expect(await homePage.getElementCssPropertyValue(await firstPostReputation, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
  });

  test('validate styles of the affiliation tag (badge) in the post card in the light mode', async ({
    page
    // browserName
  }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    // Load 40 posts - more likely to occur a badge
    await homePage.goto();
    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');
    await homePage.mainPostsTimelineVisible(40);

    if (await homePage.postCardAffiliationTag.first().isVisible()) {
      expect(
        await homePage.getElementCssPropertyValue(await homePage.postCardAffiliationTag.first(), 'color')
      ).toBe('rgb(51, 51, 51)');
      expect(
        await homePage.getElementCssPropertyValue(
          await homePage.postCardAffiliationTag.first(),
          'border-color'
        )
      ).toBe('rgb(255, 0, 0)');
    } else console.log('No affiliation tags on the 40 post cards');
  });

  test('validate styles of the affiliation tag (badge) in the post card in the dark mode', async ({
    page
    // browserName
  }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.goto();
    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    // Load 40 posts - more likely to occur a badge
    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');
    await homePage.mainPostsTimelineVisible(40);

    if (await homePage.postCardAffiliationTag.first().isVisible()) {
      expect(
        await homePage.getElementCssPropertyValue(await homePage.postCardAffiliationTag.first(), 'color')
      ).toBe('rgb(225, 231, 239)');
      expect(
        await homePage.getElementCssPropertyValue(
          await homePage.postCardAffiliationTag.first(),
          'border-color'
        )
      ).toBe('rgb(226, 18, 53)');
    } else console.log('No affiliation tags on the 40 post cards');
  });

  test('validate the text of the affiliation tag (badge) in the post card in the light mode', async ({
    page
    // browserName
  }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    const apiHelper = new ApiHelper(page);
    const rankedPostResponse = await apiHelper.getRankedPostsAPI('trending', '', '', 40, '', '');
    const rankedPostResultLength = await rankedPostResponse.result.length;
    const elementsWithAffiliationTag: string[] = [];

    for (let i = 0; i < rankedPostResultLength; i++) {
      if (await rankedPostResponse.result[i].author_title)
        await elementsWithAffiliationTag.push(await rankedPostResponse.result[i].author_title);
    }
    // console.log('Elements with affiliation tag: ', await elementsWithAffiliationTag);

    // Load 40 posts - more likely to occur a badge
    await homePage.goto();
    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');
    await homePage.mainPostsTimelineVisible(40);

    if (await homePage.postCardAffiliationTag.first().isVisible()) {
      // console.log('Text of the first affiliation tag: ', await homePage.postCardAffiliationTag.first().textContent());

      // Compare text the first affiliation tag from UI with the first affiliation tag from API
      await expect(await homePage.postCardAffiliationTag.first().textContent()).toBe(
        elementsWithAffiliationTag[0]
      );
    } else console.log('No affiliation tags on the 40 post cards');
  });

  test('validate styles of Powered Up 100% in the post card in the light mode', async ({
    page
    // browserName
  }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.goto();

    // Load 40 posts - more likely to occur a badge
    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');
    await homePage.mainPostsTimelineVisible(40);

    if (await homePage.postCardPoweredUp100Trigger.first().isVisible()) {
      await homePage.postCardPoweredUp100Trigger.first().hover();
      await expect(homePage.postCardPoweredUp100Tooltip).toHaveText('Powered Up 100%Powered Up 100%');
      console.log('111 ', await homePage.postCardPoweredUp100Trigger.first());
      expect(
        await homePage.getElementCssPropertyValue(await homePage.postCardPoweredUp100Tooltip.first(), 'color')
      ).toBe('rgb(15, 23, 42)');
    } else console.log('No Powered Up 100% tags on the 40 post cards');
  });

  test('validate styles of Powered Up 100% in the post card in the dark mode', async ({
    page
    // browserName
  }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.goto();
    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    // Load 40 posts - more likely to occur a badge
    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');
    await homePage.mainPostsTimelineVisible(40);

    if (await homePage.postCardPoweredUp100Trigger.first().isVisible()) {
      await homePage.postCardPoweredUp100Trigger.first().hover();
      await expect(homePage.postCardPoweredUp100Tooltip).toHaveText('Powered Up 100%Powered Up 100%');
      console.log('111 ', await homePage.postCardPoweredUp100Trigger.first());
      expect(
        await homePage.getElementCssPropertyValue(await homePage.postCardPoweredUp100Tooltip.first(), 'color')
      ).toBe('rgb(148, 163, 184)');
    } else console.log('No Powered Up 100% tags on the 40 post cards');
  });

  test('move to the post page by clicking Powered Up 100% in the post card ', async ({
    page
    // browserName
  }) => {
    // test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.goto();

    // Load 40 posts - more likely to occur a badge
    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');
    await homePage.mainPostsTimelineVisible(40);

    if (await homePage.postCardPoweredUp100Trigger.first().isVisible()) {
      const firstPoweredUp100Link = await homePage.postCardPoweredUp100TriggerLink.first();
      const urlOfFirstPoweredUp10Link = await firstPoweredUp100Link.getAttribute('href');
      // console.log('url of the first post ', await firstPoweredUp100Link.getAttribute("href"));
      await homePage.postCardPoweredUp100Trigger.first().click();
      await homePage.page.waitForSelector('#articleBody');
      await expect(homePage.page).toHaveURL(urlOfFirstPoweredUp10Link);
    } else console.log('No Powered Up 100% tags on the 40 post cards');
  });
});
