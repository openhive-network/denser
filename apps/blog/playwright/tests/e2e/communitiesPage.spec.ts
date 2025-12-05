import { test, expect, Locator } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { ReblogThisPostDialog } from '../support/pages/reblogThisPostDialog';
import { PostPage } from '../support/pages/postPage';
import { LoginForm } from '../support/pages/loginForm';
import { ApiHelper } from '../support/apiHelper';
import { MakePostWarningPage } from '../support/pages/makePostWarningPage';

test.describe('Communities page tests', () => {
  let homePage: HomePage;
  let profilePage: ProfilePage;
  let communitiesPage: CommunitiesPage;
  let reblogThisPostDialog: ReblogThisPostDialog;
  let postPage: PostPage;
  let defaultLoginForm: LoginForm;
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    profilePage = new ProfilePage(page);
    communitiesPage = new CommunitiesPage(page);
    reblogThisPostDialog = new ReblogThisPostDialog(page);
    postPage = new PostPage(page);
    defaultLoginForm = new LoginForm(page);
    apiHelper = new ApiHelper(page);

    await homePage.goto();
  });

  test('is LeoFinance community page loaded', async ({ page }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
  });

  test('load next the community post cards in the LeoFinance Community', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');

    // Wait for new posts to load with dynamic timeout
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="post-list-item"]').length >= 40,
      { timeout: 10000 }
    );

    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(40);
    expect(postsCount).toBeLessThanOrEqual(60);
  });

  test('load next the community post cards in the Worldmappin Community', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await homePage.moveToWorldmappinCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('Worldmappin');

    await homePage.mainPostsTimelineVisible(20);
    await homePage.page.keyboard.down('End');

    // Wait for new posts to load with dynamic timeout
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="post-list-item"]').length >= 40,
      { timeout: 10000 }
    );

    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(40);
    expect(postsCount).toBeLessThanOrEqual(60);
  });

  test('validate the community subscribers, pending rewards, active posters are valid in LeoFinance Community', async ({
    page,
    request
  }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseCommunity = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_community',
        params: { name: 'hive-167922', observer: '' } //hive-167922 - LeoFinance community owner
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const subscribers = (await responseCommunity.json()).result.subscribers;
    const pendingRewards = (await responseCommunity.json()).result.sum_pending;
    const activePosters = (await responseCommunity.json()).result.num_authors;
    const leadership = (await responseCommunity.json()).result.team;

    expect(await communitiesPage.commnnitySubscribers.textContent()).toBe(
      String(subscribers) + 'subscribers'
    );
    expect(await communitiesPage.communityPendingRewards.textContent()).toBe(
      '$' + String(pendingRewards) + 'pending rewards'
    );
    expect(await communitiesPage.communityActivePosters.textContent()).toBe(
      String(activePosters) + 'active posters'
    );
  });

  test('validate the community leadership of LeoFinance Community', async ({ page, request }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseCommunity = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_community',
        params: { name: 'hive-167922', observer: '' } //hive-167922 - LeoFinance community owner
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const leadershipListApi = (await responseCommunity.json()).result.team;
    const leadershipListFrontElements = await communitiesPage.communityLeadershipList.all();

    // start from 1 index because 0 index it is owner 'hive-167922'
    const leadershipListApiNames: any[] = [];
    for (let i = 1; i < leadershipListApi.length; i++) {
      leadershipListApiNames.push(leadershipListApi[i][0] + ' ' + leadershipListApi[i][1]);
    }

    const leadershipListNamesFrontElements: any[] = [];
    for (const leadershipFront of leadershipListFrontElements) {
      leadershipListNamesFrontElements.push(await leadershipFront.textContent());
    }

    leadershipListNamesFrontElements.forEach((element, index) => {
      expect(element.toLocaleLowerCase()).toContain(String(leadershipListApiNames[index]));
    });
  });

  test('move to the profile leadership pages of LeoFinance community ', async ({ page }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    const leadershipLinkLists = await communitiesPage.communityLeadershipList.locator('a').all();

    const leadershipLinkNickNamesLists: any[] = [];
    leadershipLinkLists.forEach((nickNameLink) => {
      leadershipLinkNickNamesLists.push(nickNameLink.textContent());
    });

    for (let i = 0; i < leadershipLinkLists.length; i++) {
      leadershipLinkLists[i].click();
      await page.waitForSelector(profilePage.profileName['_selector']);
      expect(await profilePage.profileName).toBeVisible();
      await profilePage.profilePostsLink.click();
      await page.waitForSelector(
        await profilePage.page.locator('[data-testid="user-post-menu"]')['_selector']
      );

      if ((await profilePage.page.locator('[data-testid="post-author"]').count()) > 0) {
        expect(await leadershipLinkNickNamesLists[i]).toContain(
          await profilePage.page.locator('[data-testid="post-author"]').first().textContent()
        );
      }
      await page.goBack();
      await page.goBack();
      await communitiesPage.quickValidataCommunitiesPageIsLoaded('LeoFinance');
    }
  });

  test('validate the first post header with the pinned tag in the LeoFinance community', async ({ page }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    const rangedPostsOfLeoFinance = await apiHelper.getRankedPostsAPI(
      'trending',
      '',
      '',
      1,
      'hive-167922',
      ''
    );
    const firstPostTitle = rangedPostsOfLeoFinance.result[0].title;
    const firstPostIsPinned = rangedPostsOfLeoFinance.result[0].stats.is_pinned;

    if (await communitiesPage.communityPinnedPost.first().isVisible()) {
      await expect(communitiesPage.communityPinnedPost.first()).toBeVisible();
      await expect(firstPostIsPinned).toBeTruthy();
      // Click the last pinned tag of the community articles
      await communitiesPage.communityPinnedPost.first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector(postPage.articleFooter['_selector']);
      await expect(postPage.articleTitle).toHaveText(firstPostTitle);
    } else await console.log('There are not any pinned posts!!!');
  });

  test('validate the style of pinned tag in the last post header with the pinned tag in the LeoFinance community', async ({
    page
  }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    if (await communitiesPage.communityPinnedPost.last().isVisible()) {
      await expect(communitiesPage.communityPinnedPost.last()).toBeVisible();
      expect(
        await homePage.getElementCssPropertyValue(await communitiesPage.communityPinnedPost.last(), 'color')
      ).toBe('rgb(255, 255, 255)');
      expect(
        await homePage.getElementCssPropertyValue(
          await communitiesPage.communityPinnedPost.last().locator('..'),
          'background-color'
        )
      ).toBe('rgb(218, 43, 43)');
    } else await console.log('There are not any pinned posts!!!');
  });

  test('validate the first post header styles (for Trending filter) in the light theme', async ({ page }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Post author link color without hovering
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthor, 'color')).toBe(
      'rgb(24, 30, 42)'
    );
    // Post author link color after hovering
    await communitiesPage.getFirstPostAuthor.hover();
    await expect(communitiesPage.getFirstPostAuthor).toHaveCSS('color', 'rgb(218, 43, 43)');

    // Timestamp link color without hovering
    expect(
      await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(24, 30, 42)');
    // Timestamp link color after hovering
    await communitiesPage.getFirstPostCardTimestampLink.hover();
    await expect(communitiesPage.getFirstPostCardTimestampLink).toHaveCSS('color', 'rgb(218, 43, 43)');
    // Author reputation color without hovering
    expect(
      await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthorReputation, 'color')
    ).toBe('rgb(24, 30, 42)');
    // Author reputation color after hovering
    await communitiesPage.getFirstPostAuthorReputation.hover();
    await expect(communitiesPage.getFirstPostAuthorReputation).toHaveCSS('color', 'rgb(24, 30, 42)');
  });

  test('validate the first post header styles (for Trending filter) in the dark theme', async ({ page }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Post author link color without hovering
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthor, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    // Post author link color after hovering
    await communitiesPage.getFirstPostAuthor.hover();
    await expect(communitiesPage.getFirstPostAuthor).toHaveCSS('color', 'rgb(226, 18, 53)');

    // Timestamp link color without hovering
    expect(
      await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostCardTimestampLink, 'color')
    ).toBe('rgb(248, 250, 252)');
    // Timestamp link color after hovering
    await communitiesPage.getFirstPostCardTimestampLink.hover();
    await expect(communitiesPage.getFirstPostCardTimestampLink).toHaveCSS('color', 'rgb(226, 18, 53)');
    // Author reputation color without hovering
    expect(
      await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthorReputation, 'color')
    ).toBe('rgb(248, 250, 252)');
    // Author reputation color after hovering
    await communitiesPage.getFirstPostAuthorReputation.hover();
    await expect(communitiesPage.getFirstPostAuthorReputation).toHaveCSS('color', 'rgb(248, 250, 252)');
  });

  test('validate the first post footer payouts styles (for Trending filter) in the light theme in the LeoFinance', async ({
    page
  }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Color of the first post payouts without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(24, 30, 42)'
    );
    await homePage.getFirstPostPayout.hover();
    // Wait for tooltip to be visible instead of fixed timeout
    await expect(homePage.getFirstPostPayoutTooltip).toBeVisible({ timeout: 15000 });
    // Color of the first post payouts with hovering
    await expect(homePage.getFirstPostPayout).toHaveCSS('color', 'rgb(218, 43, 43)');
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
  });

  test('validate the first post footer payouts styles (for Trending filter) in the dark theme in the LeoFinance', async ({
    page
  }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of the first post payouts without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    await homePage.getFirstPostPayout.hover();
    // Wait for tooltip to be visible instead of fixed timeout
    await expect(homePage.getFirstPostPayoutTooltip).toBeVisible({ timeout: 15000 });
    // Color of the first post payouts with hovering
    await expect(homePage.getFirstPostPayout).toHaveCSS('color', 'rgb(226, 18, 53)');
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
    expect(
      await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'background-color')
    ).toBe('rgb(3, 7, 17)');
  });

  test('validate the first post footer votes styles (for Trending filter) in the light theme in the LeoFinance', async ({
    page
  }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Color of the first post votes without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotes, 'color')).toBe(
      'rgb(24, 30, 42)'
    );
    await homePage.getFirstPostVotes.hover();
    // Wait for tooltip to be visible instead of fixed timeout
    await expect(homePage.getFirstPostVotesTooltip).toBeVisible({ timeout: 15000 });

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

  test('validate the first post footer votes styles (for Trending filter) in the dark theme in the LeoFinance', async ({
    page
  }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of the first post votes without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostVotes, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    await homePage.getFirstPostVotes.hover();
    // Wait for tooltip to be visible instead of fixed timeout
    await expect(homePage.getFirstPostVotesTooltip).toBeVisible({ timeout: 15000 });

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

  test('validate the community leadership of Worldmappin Community', async ({ page, request }) => {
    await homePage.moveToWorldmappinCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('Worldmappin');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseCommunity = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_community',
        params: { name: 'hive-163772', observer: '' } //hive-163772 - Pinmapple community owner
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const leadershipListApi = (await responseCommunity.json()).result.team;
    const leadershipListFrontElements = await communitiesPage.communityLeadershipList.all();

    // start from 1 index because 0 index it is owner 'hive-163772'
    const leadershipListApiNames: any[] = [];
    for (let i = 1; i < leadershipListApi.length; i++) {
      leadershipListApiNames.push(leadershipListApi[i][0] + ' ' + leadershipListApi[i][1]);
    }

    const leadershipListNamesFrontElements: any[] = [];
    for (const leadershipFront of leadershipListFrontElements) {
      leadershipListNamesFrontElements.push(await leadershipFront.textContent());
    }

    leadershipListNamesFrontElements.forEach((element, index) => {
      expect(element.toLocaleLowerCase()).toContain(String(leadershipListApiNames[index]));
    });
  });

  test('move to the first-three leadership profile pages of Worldmappin community ', async ({ page }) => {
    await homePage.moveToWorldmappinCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('Worldmappin');

    const leadershipLinkLists = await communitiesPage.communityLeadershipList.locator('a').all();

    const leadershipLinkNickNamesLists: any[] = [];
    leadershipLinkLists.forEach((nickNameLink) => {
      leadershipLinkNickNamesLists.push(nickNameLink.textContent());
    });

    for (let i = 0; i < leadershipLinkLists.length; i++) {
      if (i < 3) {
        leadershipLinkLists[i].click();
        await page.waitForSelector(profilePage.profileName['_selector']);
        expect(await profilePage.profileName).toBeVisible();
        await profilePage.profilePostsLink.click();
        await page.waitForSelector(profilePage.page.locator('[data-testid="user-post-menu"]')['_selector']);

        if ((await profilePage.page.locator('[data-testid="post-author"]').count()) > 0) {
          expect(await leadershipLinkNickNamesLists[i]).toContain(
            await profilePage.page.locator('[data-testid="post-author"]').first().textContent()
          );
        }

        await page.goBack();
        await page.goBack();
        await communitiesPage.quickValidataCommunitiesPageIsLoaded('Worldmappin');
      }
    }
  });

  test('validate reblog button styles in the light theme', async ({ page }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

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
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
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
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    await homePage.getFirstPostReblogButton.click();
    await reblogThisPostDialog.validateReblogThisPostHeaderIsVisible();
    await reblogThisPostDialog.validateReblogThisPostDescriptionIsVisible();
    await expect(reblogThisPostDialog.getDialogOkButton).toBeVisible();
    await expect(reblogThisPostDialog.getDialogCancelButton).toBeVisible();
    await reblogThisPostDialog.closeReblogDialog();
    await expect(homePage.getTrandingCommunitiesHeader).toBeVisible();
  });
  // new tests
  test('check if posts in specific communities loading correctly', async ({ page }) => {
    await homePage.moveToLeoFinanceCommunities();
    const firstPostTitle = homePage.postTitle.first();
    const firstPostTitleText = await firstPostTitle.innerText();

    const postAuthor = homePage.getFirstPostAuthor;
    const postAuthorText = await postAuthor.innerText();
    const postAuthorTextSubstring = postAuthorText.substring(0, 5).trim();

    await postPage.moveToTheFirstPostInHomePageByPostTitle();

    const articleTitle = await postPage.articleTitle;
    const articleTitleText = await articleTitle.innerText();

    const articleAuthor = postPage.articleAuthorName;
    const articleAuthorText = await articleAuthor.innerText();
    const articleAuthorTextSubstring = articleAuthorText.substring(0, 5).trim();

    await expect(postPage.articleTitle).toBeVisible();
    await expect(firstPostTitleText).toEqual(articleTitleText);
    await expect(postPage.articleBody).toBeVisible();
    await expect(postPage.articleFooter).toBeVisible();
    await expect(postAuthorTextSubstring).toContain(articleAuthorTextSubstring);
  });

  test('check if upvote and downvote button are displayed correctly on communities page', async ({
    page
  }) => {
    await homePage.moveToLeoFinanceCommunities();
    await expect(homePage.getFirstPostUpvoteButton).toBeVisible();
    await homePage.getFirstPostUpvoteButton.click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
    await expect(homePage.getFirstPostDownvoteButton).toBeVisible();
    await homePage.getFirstPostDownvoteButton.click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
  });

  test('check if responses are displayed correctly on communities page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    await homePage.moveToLeoFinanceCommunities();

    await expect(communitiesPage.getFirstResponses).toBeVisible();

    const responseNumber = await communitiesPage.getFirstResponses.innerText();
    await communitiesPage.getFirstResponses.hover();
    const responseHoverText = await communitiesPage.postCardResponses.innerText();
    if (parseInt(responseNumber, 10) > 1)
      await expect(responseHoverText).toContain(`${responseNumber} responses. Click to respond`);
    else if (parseInt(responseNumber, 10) == 1)
      await expect(responseHoverText).toContain(`${responseNumber} response. Click to respond`);
    else await expect(responseHoverText).toContain(`No responses. Click to respond`);

    await communitiesPage.getFirstResponses.click();
    await expect(postPage.articleFooter).toBeVisible();
  });

  test('check sidebar on specific communities - description, rules, language', async ({ page, request }) => {
    await homePage.moveToLeoFinanceCommunities();
    //description
    await expect(communitiesPage.communityDescription).toBeVisible();
    await expect(communitiesPage.communityDescriptionHeader).toBeVisible();
    await expect(communitiesPage.communityDescriptionConntent).toBeVisible();

    const descriptionHeaderText = await communitiesPage.communityDescriptionHeader.innerText();
    expect(descriptionHeaderText).toBe('Description');
    // rules
    await expect(communitiesPage.communityRules).toBeVisible();
    await expect(communitiesPage.communityRulesHeader).toBeVisible();
    await expect(communitiesPage.communityRulesContent).toBeVisible();

    const rulesHeaderText = await communitiesPage.communityRulesHeader.innerText();
    expect(rulesHeaderText).toBe('Rules');

    //language
    await expect(communitiesPage.languageHeader).toBeVisible();

    const languageHeaderText = await communitiesPage.languageHeader.innerText();

    expect(languageHeaderText).toBe('Language');

    await expect(communitiesPage.communityChoosenLanguage).toBeVisible();

    const communityChoosenLanguageText = await communitiesPage.communityChoosenLanguage.innerText();

    const url = process.env.REACT_APP_API_ENDPOINT;

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

    // const languageApi = (await response.json()).result[0].lang;
    const languageApi = (await response.json()).result
      .map((item) => (item.title === 'LeoFinance' ? item : null))
      .find((item) => item !== null).lang;

    expect(communityChoosenLanguageText).toBe(languageApi);
  });

  test('move to the dialog of subscribers after clicking Activity Log', async ({ page }) => {
    const leoFinanceCommunityAccount: string = 'hive-167922';
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
    await communitiesPage.activityLogButton.click();
    await communitiesPage.page.waitForSelector(communitiesPage.subscribersNotificationContent['_selector']);
    await expect(communitiesPage.subscribersNotificationContent).toBeVisible();
    await expect(communitiesPage.subscribersNotificationLocalMenu).toBeVisible();

    // Get list of subscribers by the api request
    let sub = await apiHelper.getCommunitySubscribersAPI(leoFinanceCommunityAccount);

    // Validate that the first(the newest) subscriber is the same as in the api for LeoFinance Community
    expect(sub.result[0].msg).toContain(await communitiesPage.subscriberName.first().textContent());
    // Validate that amount of the subscribers is equal 50 (before clicking Load more button)
    expect((await communitiesPage.subscriberName.all()).length).toBe(50);
  });

  test('validate styles of the list of the subscribers in the modal in the light mode', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit' || browserName === 'firefox', 'Automatic test works well on chromium');

    const leoFinanceCommunityAccount: string = 'hive-167922';
    const widthProgressBar = 60; // 100%
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
    await communitiesPage.activityLogButton.click();
    await communitiesPage.page.waitForSelector(communitiesPage.subscribersNotificationContent['_selector']);

    // Get list of subscribers by the api request
    let sub = await apiHelper.getCommunitySubscribersAPI(leoFinanceCommunityAccount);
    // Values for progress bar of the first subscriber
    const transformXwidthPercentage = 100 - sub.result[0].score;
    const transformXwidthValue = (60 * transformXwidthPercentage) / 100;
    // console.log('transformXwidthValue: ', transformXwidthValue );

    // First row of the notifications content table
    const firstRowOfSubscribers = (await communitiesPage.subscribersRowsOdd.all()).at(0);
    await expect(await homePage.getElementCssPropertyValue(firstRowOfSubscribers, 'background-color')).toBe(
      'rgb(255, 255, 255)'
    );
    await expect(await homePage.getElementCssPropertyValue(firstRowOfSubscribers, 'color')).toBe(
      'rgb(0, 0, 0)'
    );
    // console.log('First subscriber progress bar - transform css value: ', await homePage.getElementCssPropertyValue(firstRowOfSubscribers?.locator('div[role="progressbar"] div'),"transform"));
    await expect(
      await homePage.getElementCssPropertyValue(
        firstRowOfSubscribers?.locator('div[role="progressbar"] div'),
        'transform'
      )
    ).toBe(`matrix(1, 0, 0, 1, -${transformXwidthValue}, 0)`);

    // Second row of the notifications content table
    // Values for progress bar of the second subscriber
    const transformXwidthPercentage2 = 100 - sub.result[1].score;
    const transformXwidthValue2 = (60 * transformXwidthPercentage2) / 100;
    // console.log('transformXwidthValue2: ', transformXwidthValue2 );

    const secondRowOfSubscribers = (await communitiesPage.subscribersRowsEven.all()).at(0);
    await expect(await homePage.getElementCssPropertyValue(secondRowOfSubscribers, 'background-color')).toBe(
      'rgb(225, 231, 239)'
    );
    await expect(await homePage.getElementCssPropertyValue(secondRowOfSubscribers, 'color')).toBe(
      'rgb(0, 0, 0)'
    );
    await expect(
      await homePage.getElementCssPropertyValue(
        secondRowOfSubscribers?.locator('div[role="progressbar"] div'),
        'transform'
      )
    ).toBe(`matrix(1, 0, 0, 1, -${transformXwidthValue2}, 0)`);
  });

  test('validate styles of the list of the subscribers in the modal in the dark mode', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');

    const leoFinanceCommunityAccount: string = 'hive-167922';
    const widthProgressBar = 60; // 100%

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    // Move to the LeoFinance Community
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
    await communitiesPage.activityLogButton.click();
    await communitiesPage.page.waitForSelector(communitiesPage.subscribersNotificationContent['_selector']);

    // Get list of subscribers by the api request
    let sub = await apiHelper.getCommunitySubscribersAPI(leoFinanceCommunityAccount);
    // Values for progress bar of the first subscriber
    const transformXwidthPercentage = 100 - sub.result[0].score;
    const transformXwidthValue = (60 * transformXwidthPercentage) / 100;
    // console.log('transformXwidthValue: ', transformXwidthValue );

    // First row of the notifications content table
    const firstRowOfSubscribers = (await communitiesPage.subscribersRowsOdd.all()).at(0);
    await expect(await homePage.getElementCssPropertyValue(firstRowOfSubscribers, 'background-color')).toBe(
      'rgb(44, 48, 53)'
    );
    await expect(await homePage.getElementCssPropertyValue(firstRowOfSubscribers, 'color')).toBe(
      'rgb(255, 255, 255)'
    );
    // console.log('First subscriber progress bar - transform css value: ', await homePage.getElementCssPropertyValue(firstRowOfSubscribers?.locator('div[role="progressbar"] div'),"transform"));
    await expect(
      await homePage.getElementCssPropertyValue(
        firstRowOfSubscribers?.locator('div[role="progressbar"] div'),
        'transform'
      )
    ).toBe(`matrix(1, 0, 0, 1, -${transformXwidthValue}, 0)`);

    // Second row of the notifications content table
    // Values for progress bar of the second subscriber
    const transformXwidthPercentage2 = 100 - sub.result[1].score;
    const transformXwidthValue2 = (60 * transformXwidthPercentage2) / 100;
    // console.log('transformXwidthValue2: ', transformXwidthValue2 );

    const secondRowOfSubscribers = (await communitiesPage.subscribersRowsEven.all()).at(0);
    await expect(await homePage.getElementCssPropertyValue(secondRowOfSubscribers, 'background-color')).toBe(
      'rgb(56, 66, 82)'
    );
    await expect(await homePage.getElementCssPropertyValue(secondRowOfSubscribers, 'color')).toBe(
      'rgb(255, 255, 255)'
    );
    await expect(
      await homePage.getElementCssPropertyValue(
        secondRowOfSubscribers?.locator('div[role="progressbar"] div'),
        'transform'
      )
    ).toBe(`matrix(1, 0, 0, 1, -${transformXwidthValue2}, 0)`);
  });

  test('validate styles of the menu of list of the subscribers in the modal in the light mode', async ({
    page
  }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
    await communitiesPage.activityLogButton.click();
    await communitiesPage.page.waitForSelector(communitiesPage.subscribersNotificationLocalMenu['_selector']);
    // All button (default)
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('All')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('All'),
        'color'
      )
    ).toBe('rgb(51, 51, 51)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('All'),
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    // Replies button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Replies')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Replies'),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Replies'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Mentions button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Mentions')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Mentions'),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Mentions'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Follows button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Follows')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Follows'),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Follows'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Upvotes button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Upvotes')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Upvotes'),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Upvotes'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Reblogs button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Reblogs')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Reblogs'),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Reblogs'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
  });

  test('validate styles of the menu of list of the subscribers in the modal in the dark mode', async ({
    page
  }) => {
    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    // Move to the LeoFinance Community
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
    await communitiesPage.activityLogButton.click();
    await communitiesPage.page.waitForSelector(communitiesPage.subscribersNotificationLocalMenu['_selector']);
    // All button (default)
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('All')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('All'),
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('All'),
        'background-color'
      )
    ).toBe('rgb(44, 48, 53)');
    // Replies button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Replies')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Replies'),
        'color'
      )
    ).toBe('rgb(127, 142, 163)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Replies'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Mentions button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Mentions')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Mentions'),
        'color'
      )
    ).toBe('rgb(127, 142, 163)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Mentions'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Follows button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Follows')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Follows'),
        'color'
      )
    ).toBe('rgb(127, 142, 163)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Follows'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Upvotes button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Upvotes')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Upvotes'),
        'color'
      )
    ).toBe('rgb(127, 142, 163)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Upvotes'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Reblogs button
    await expect(communitiesPage.subscribersNotificationLocalMenu.getByText('Reblogs')).toBeVisible();
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Reblogs'),
        'color'
      )
    ).toBe('rgb(127, 142, 163)');
    await expect(
      await homePage.getElementCssPropertyValue(
        communitiesPage.subscribersNotificationLocalMenu.getByText('Reblogs'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
  });

  // Temporary skipped it works localy but there are some problems in CI
  test.skip('validate load more button in the community subscribers list', async ({ page }) => {
    const leoFinanceCommunityAccount: string = 'hive-167922';

    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
    await communitiesPage.activityLogButton.click();
    await communitiesPage.page.waitForSelector(communitiesPage.subscribersNotificationLocalMenu['_selector']);

    await expect(communitiesPage.subscribersNotificationContent).toBeVisible();
    await expect(communitiesPage.subscribersLoadMoreButton).toHaveText('Load more');

    // Get list of subscribers by the api request (limit 50)
    let subscribersAPI = await apiHelper.getCommunitySubscribersAPI(leoFinanceCommunityAccount);
    // Get list of subscribers by UI before clicking `Load more` button
    let subscribersUIBeforeLoadMoreClik = await communitiesPage.subscriberRow.all();
    expect(subscribersUIBeforeLoadMoreClik.length).toBe(subscribersAPI.result.length);
    // Click `Load more` button
    await communitiesPage.page.waitForTimeout(3000);
    await communitiesPage.subscribersLoadMoreButton.click();
    // Validate the length of subscribers is two times longer than befor clicking `Load more` button
    await communitiesPage.page.waitForTimeout(3000);
    let subscribersUIAfterLoadMoreClick = await communitiesPage.subscriberRow.all();
    expect(subscribersUIAfterLoadMoreClick.length).toBe(2 * subscribersUIBeforeLoadMoreClik.length);
  });

  test('validate Subscribe button styles in the light theme', async ({ page }) => {
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
    let communitySubscribeButton;

    if (!(await communitiesPage.communitySubscribeButton.first().isVisible()))
      communitySubscribeButton = await communitiesPage.communitySubscribeButton.last();
    else communitySubscribeButton = await communitiesPage.communitySubscribeButton.first();

    // Color of the Subscribe button before hover
    expect(await homePage.getElementCssPropertyValue(communitySubscribeButton, 'background-color')).toBe(
      'rgb(37, 99, 235)'
    );
    await communitySubscribeButton.hover();
    // Wait for hover state with auto-retry instead of fixed timeout
    await expect(communitySubscribeButton).toHaveCSS('background-color', 'rgb(29, 78, 216)');
    await communitySubscribeButton.click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
  });

  test('validate visibility of the community sidebar depending of the width of the viewport', async ({
    page
  }) => {
    const sideBarDesktop = await page.locator('[data-testid="card-explore-hive-desktop"]');
    const sideBarMobile = await page.locator('[data-testid="card-explore-hive-mobile"]');

    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Validate community sidebar visibility before changing viewport size
    const displayAttributeSideBarDesktopBeforeChangeViewportSize = await homePage.getElementCssPropertyValue(
      sideBarDesktop,
      'display'
    );
    await expect(displayAttributeSideBarDesktopBeforeChangeViewportSize).toBe('flex');
    const displayAttributeSideBarMobileBeforeChangeViewportSize = await homePage.getElementCssPropertyValue(
      sideBarMobile,
      'display'
    );
    await expect(displayAttributeSideBarMobileBeforeChangeViewportSize).toBe('none');

    // Change width of the viewport size to less than 1280
    await page.setViewportSize({ width: 1279, height: 720 });

    // Validate community sidebar visibility after changing viewport size
    const displayAttributeSideBarDesktopAfterChangeViewportSize = await homePage.getElementCssPropertyValue(
      sideBarDesktop,
      'display'
    );
    await expect(displayAttributeSideBarDesktopAfterChangeViewportSize).toBe('none');
    const displayAttributeSideBarMobileAfterChangeViewportSize = await homePage.getElementCssPropertyValue(
      sideBarMobile,
      'display'
    );
    await expect(displayAttributeSideBarMobileAfterChangeViewportSize).toBe('flex');
  });

  test('validate visibility of the trending comminities sidebar depending of the width of the viewport', async ({
    page
  }) => {
    const trendingCommunitiesSideBar = await page.locator('[data-testid="card-trending-comunities"]');

    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Validate trending communities sidebar visibility before changing viewport size
    const trendingCommunitiesSideBarBeforeChangeViewportSize = await homePage.getElementCssPropertyValue(
      trendingCommunitiesSideBar,
      'display'
    );
    await expect(trendingCommunitiesSideBarBeforeChangeViewportSize).toBe('flex');

    // Change width of the viewport size to less than 768 px
    await page.setViewportSize({ width: 767, height: 720 });

    // Validate trending communities sidebar visibility after changing viewport size
    const trendingCommunitiesSideBarAfterChangeViewportSize = await homePage.getElementCssPropertyValue(
      trendingCommunitiesSideBar,
      'display'
    );
    await expect(trendingCommunitiesSideBarAfterChangeViewportSize).toBe('none');
  });

  test('check if clicking new post button in LeoFinance community without login moves to the create post page with specific message', async ({
    page
  }) => {
    // expected specific message is "Log in to make a post."
    const leoFinanceCommunity: string = 'hive-167922';
    const logInToMakePostMessagePage = new MakePostWarningPage(page);

    await homePage.moveToLeoFinanceCommunities();
    await expect(communitiesPage.communityNewPostButton).toBeVisible();
    await communitiesPage.communityNewPostButton.click();
    await logInToMakePostMessagePage.validateMakePostWarningPageIsLoadedOfSpecificCommunities(
      leoFinanceCommunity
    );
  });

  test('check if clicking new post button in Worldmappin community without login moves to the create post page with specific message', async ({
    page
  }) => {
    // expected specific message is "Log in to make a post."
    const worldmappinCommunity: string = 'hive-163772';
    const logInToMakePostMessagePage = new MakePostWarningPage(page);

    await homePage.moveToWorldmappinCommunities();
    await expect(communitiesPage.communityNewPostButton).toBeVisible();
    await communitiesPage.communityNewPostButton.click();
    await logInToMakePostMessagePage.validateMakePostWarningPageIsLoadedOfSpecificCommunities(
      worldmappinCommunity
    );
  });

  test('validate style of the create post message page in the light mode', async ({ page }) => {
    // expected specific message is "Log in to make a post."
    const worldmappinCommunity: string = 'hive-163772';
    const logInToMakePostMessagePage = new MakePostWarningPage(page);

    await homePage.moveToWorldmappinCommunities();
    await expect(communitiesPage.communityNewPostButton).toBeVisible();
    await communitiesPage.communityNewPostButton.click();
    await logInToMakePostMessagePage.validateMakePostWarningPageIsLoadedOfSpecificCommunities(
      worldmappinCommunity
    );

    expect(
      await homePage.getElementCssPropertyValue(
        logInToMakePostMessagePage.logInToMakePostMessage,
        'background-color'
      )
    ).toBe('rgb(240, 253, 244)');

    expect(
      await homePage.getElementCssPropertyValue(logInToMakePostMessagePage.logInToMakePostMessage, 'color')
    ).toBe('rgb(0, 0, 0)');
  });

  test('validate style of the create post message page in the dark mode', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
    // expected specific message is "Log in to make a post."
    const leoFinanceCommunity: string = 'hive-167922';
    const logInToMakePostMessagePage = new MakePostWarningPage(page);

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.moveToLeoFinanceCommunities();
    await expect(communitiesPage.communityNewPostButton).toBeVisible();
    await communitiesPage.communityNewPostButton.click();
    await logInToMakePostMessagePage.validateMakePostWarningPageIsLoadedOfSpecificCommunities(
      leoFinanceCommunity
    );

    expect(
      await homePage.getElementCssPropertyValue(
        logInToMakePostMessagePage.logInToMakePostMessage,
        'background-color'
      )
    ).toBe('rgb(30, 41, 59)');

    expect(
      await homePage.getElementCssPropertyValue(logInToMakePostMessagePage.logInToMakePostMessage, 'color')
    ).toBe('rgb(255, 255, 255)');
  });
});
