import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { CommentViewPage } from '../support/pages/commentViewPage';
import { ApiHelper } from '../support/apiHelper';
import { LoginForm } from '../support/pages/loginForm';
import { ReblogThisPostDialog } from '../support/pages/reblogThisPostDialog';

test.describe('Comments of post', () => {
  let homePage: HomePage;
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
  });
  test('Validate a first comment of a first post page with number of comments is visible', async ({
    page
  }) => {
    await homePage.goto();
    await homePage.moveToTheFirstPostWithCommentsNumberMoreThanZero();
    await expect(postPage.commentCardsHeaders.first()).toBeVisible();
    await expect(postPage.commentCardsDescriptions.first()).toBeVisible();
    await expect(postPage.commentCardsFooters.first()).toBeVisible();
  });

  test('Validate a hovered comment changes backgroundcolor style', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToTheFirstPostWithCommentsNumberMoreThanZero();
    // Before hover
    expect(
      await postPage.getElementCssPropertyValue(
        postPage.commentContentToHover.first(),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');

    // After hover
    await postPage.commentContentToHover.first().hover();
    expect(
      await postPage.getElementCssPropertyValue(
        postPage.commentContentToHover.first(),
        'background-color'
      )
    ).toBe('rgb(225, 231, 239)');
  });

  test('Validate a hovered comment changes backgroundcolor style in the dark mode', async ({
    page,
    browserName
  }) => {
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
    await homePage.goto();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    await homePage.moveToTheFirstPostWithCommentsNumberMoreThanZero();

    // Before hover
    expect(
      await postPage.getElementCssPropertyValue(
        postPage.commentContentToHover.first(),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');

    // After hover
    await postPage.commentContentToHover.first().hover();
    expect(
      await postPage.getElementCssPropertyValue(
        postPage.commentContentToHover.first(),
        'background-color'
      )
    ).toBe('rgb(56, 66, 82)');
  });

  test('move to the comment view page of the first comment of the first post', async ({ page }) => {
    const commentViewPage = new CommentViewPage(page);

    await homePage.goto();
    await homePage.moveToTheFirstPostWithCommentsNumberMoreThanZero();
    await expect(postPage.commentCardsHeaders.first()).toBeVisible();
    await expect(postPage.commentCardsDescriptions.first()).toBeVisible();
    await expect(postPage.commentCardsFooters.first()).toBeVisible();

    const firstPostTitle = await postPage.articleTitle.textContent();

    await postPage.getFirstCommentPageLink.click();
    await commentViewPage.validataCommentViewPageIsLoaded(firstPostTitle);
  });
});

test.describe('@gtg - Comments of "hive-160391/@gtg/hive-hardfork-25-jump-starter-kit" post', () => {
  const communityCategoryName: string = 'hive-160391';
  const postAuthorName: string = 'gtg';
  const postPermlink: string = 'hive-hardfork-25-jump-starter-kit';
  const postPermlinkCommentsPart: string = 'hive-hardfork-25-jump-starter-kit#comments';
  const reArticleTitle: string = 'RE: Hive HardFork 25 Jump Starter Kit';
  const apiResult: string = 'result';
  const apiPostIdentifier: string = `${postAuthorName}\/${postPermlink}`;
  const apiPostChildren: string = 'children';

  let homePage: HomePage;
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
  });

  test('Validate amount of comments in the post', async ({ page }) => {
    const apiHelper = new ApiHelper(page);

    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // getDiscussionCommentsAPI : (Default - author: "gtg", permlink: "hive-hardfork-25-jump-starter-kit")
    const commentAmount = (await apiHelper.getDiscussionCommentsAPI())[apiResult][apiPostIdentifier][
      apiPostChildren
    ];
    // console.log('API Comments amount: ', commentAmount);
    // console.log('UI comments ammount ', (await postPage.commentListItems.all()).length)
    expect((await postPage.commentListItems.all()).length).toBe(commentAmount);
  });

  test('Validate the first comment in the post', async ({ page }) => {
    const defaultLoginForm = new LoginForm(page);

    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // sicarius is expected as the first comment author
    await expect(postPage.commentAuthorLink.first()).toHaveText('sicarius');
    // the content of comment contain specific text
    await expect(postPage.commentCardsDescriptions.first()).toContainText(
      "Did my 'ol due diligence and threw a star and fork at the openhive repo."
    );
    // click Upvote and move to the Login to Vote Dialog and back
    await postPage.commentCardsFooterUpvotes.first().click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
    await expect(postPage.commentAuthorLink.first()).toHaveText('sicarius');
    // click Downvote and move to the Login to Vote Dialog and back
    await postPage.commentCardsFooterDownvotes.first().click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
    await expect(postPage.commentAuthorLink.first()).toHaveText('sicarius');
    // Read value of the first comment payout
    const firstCommentPayoutValue = '$0.29';
    await expect(postPage.commentCardsFooterPayoutNonZero.first()).toHaveText(firstCommentPayoutValue);
    // Read value of the first comment votes
    const firstCommentVotes = '4 votes';
    await expect(postPage.commentCardsFooterVotes.first()).toHaveText(firstCommentVotes);
    // Click Reply of the first comment and open login form
    await postPage.commentCardsFooterReply.first().click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
  });

  test('Validate the second comment (nested) in the post', async ({ page }) => {
    const commentViewPage = new CommentViewPage(page);
    const defaultLoginForm = new LoginForm(page);

    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // gtg is expected as the second comment author
    await expect(postPage.commentAuthorLink.nth(1)).toHaveText(postAuthorName);
    // gtg's Wizard affiliation tag is expected
    await expect(commentViewPage.getCommentUserAffiliationTag.nth(0)).toHaveText('Wizard');
    // the content of comment contain specific text
    await expect(postPage.commentCardsDescriptions.nth(1)).toContainText('Great to hear, thank you! :-)');
    // click Upvote and move to the Login to Vote Dialog and back
    await postPage.commentCardsFooterUpvotes.nth(1).click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
    await expect(postPage.commentAuthorLink.nth(1)).toHaveText(postAuthorName);
    // click Downvote and move to the Login to Vote Dialog and back
    await postPage.commentCardsFooterDownvotes.nth(1).click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
    await expect(postPage.commentAuthorLink.nth(1)).toHaveText(postAuthorName);
    // Read value of the second comment payout
    const secondCommentPayoutValue = '$0.00';
    await expect(postPage.commentCardsFooterPayoutZero.first()).toHaveText(secondCommentPayoutValue);
    // The value of the second comment votes is invisible
    await expect(postPage.commentCardsFooters.nth(1)).not.toHaveAttribute('data-testid', 'comment-votes');
    // Click Reply of the second comment and open login form
    await postPage.commentCardsFooterReply.nth(1).click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
  });

  test('Validate the timestamp in the second comment (nested) in the post', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // gtg is expected as the second comment author
    await expect(postPage.commentAuthorLink.nth(1)).toHaveText(postAuthorName);
    // click timestamp in the second comment and validat that it was highlighted by the red boarder
    // and the background color is green
    await postPage.commentCardsHeadersTimeStampLink.nth(1).scrollIntoViewIfNeeded();
    await postPage.commentCardsHeadersTimeStampLink.nth(1).click();
    await postPage.commentCardsHeadersTimeStampLink.nth(1).waitFor({state: "visible"});
    // border color of the first comment
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(0).locator('..'),
        'border-color'
      )
    ).toBe('rgb(237, 237, 237)');
    // background-color of the first comment
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(0).locator('..'),
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // border color of the second comment
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(1).locator('..'),
        'border-color'
      )
    ).toBe('rgb(220, 38, 38)');
    // background-color of the second comment
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(1).locator('..'),
        'background-color'
      )
    ).toBe('rgb(240, 253, 244)');
  });

  test('Validate the timestamp in the first comment in the post', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // sicarius is expected as the second comment author
    await expect(postPage.commentAuthorLink.nth(0)).toHaveText('sicarius');
    // click timestamp in the first comment and validate that all comment thread was highlighted by the red boarder
    // and the background color is green
    await postPage.commentCardsHeadersTimeStampLink.nth(0).scrollIntoViewIfNeeded();
    await postPage.commentCardsHeadersTimeStampLink.nth(0).click();
    await postPage.commentCardsHeadersTimeStampLink.nth(0).waitFor({state: "visible"});
    // border color of the first comment
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(0).locator('..'),
        'border-color'
      )
    ).toBe('rgb(220, 38, 38)');
    // background-color of the first comment
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(0).locator('..'),
        'background-color'
      )
    ).toBe('rgb(240, 253, 244)');
    // border color of the second comment
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(1).locator('../../..'),
        'border-color'
      )
    ).toBe('rgb(220, 38, 38)');
    // background-color of the second comment
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(1).locator('../../..'),
        'background-color'
      )
    ).toBe('rgb(240, 253, 244)');
  });

  test('Validate the first comment author link styles in the post in the light mode', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);
    // Color of the author of the first comment without hovering
    expect(await postPage.getElementCssPropertyValue(postPage.commentAuthorLink.first(), 'color')).toBe(
      'rgb(24, 30, 42)'
    );
    // expect(
    //   await postPage.getElementCssPropertyValue(
    //     await postPage.commentAuthorLink.first(),
    //     'color'
    //   )
    // ).toBe('rgb(24, 30, 42)');
    // Color of the author of the first comment after hovering
    await postPage.commentAuthorLink.first().hover();
    await postPage.page.waitForTimeout(1000);
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentAuthorLink.first().locator('div span'),
        'color'
      )
    ).toBe('rgb(218, 43, 43)');

    // Validate the user info popover card is visible
    await postPage.commentAuthorLink.first().click();
    await expect(postPage.userPopoverCard).toBeVisible();
  });

  test('Validate the first comment reputation styles in the post in the light mode', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Color of the reputation of the first comment without hovering
    expect(
      await postPage.getElementCssPropertyValue(await postPage.commentAuthorReputation.first(), 'color')
    ).toBe('rgb(24, 30, 42)');
    // Color of the reputation of the first comment after hovering
    await postPage.commentAuthorReputation.first().hover();
    await postPage.page.waitForTimeout(1000);
    expect(
      await postPage.getElementCssPropertyValue(await postPage.commentAuthorReputation.first(), 'color')
    ).toBe('rgb(24, 30, 42)');
    // Validate the tooltip of reputation
    const atrTitle = await postPage.commentAuthorReputation.first().getAttribute('title');
    await expect(atrTitle).toBe('Reputation');
  });

  test('Validate the first comment timestamp styles in the post in the light mode', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Color of the timestamp of the first comment without hovering
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentCardsHeadersTimeStampLink.first(),
        'color'
      )
    ).toBe('rgb(24, 30, 42)');
    // Color of the timestamp of the first comment after hovering
    await postPage.commentCardsHeadersTimeStampLink.first().hover();
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentCardsHeadersTimeStampLink.first(),
        'color'
      )
    ).toBe('rgb(218, 43, 43)');

    // Validate the timestamp tooltip
    const atrTitle = await postPage.commentCardsHeadersTimeStampLink.first().getAttribute('title');
    await expect(atrTitle).toContain('Fri Jun 18 2021');
  });

  test('Validate the first comment author link styles in the post in the dark mode', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of the author of the first comment without hovering
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentAuthorLink.first().locator('div span'),
        'color'
      )
    ).toBe('rgb(248, 250, 252)');
    // Color of the author of the first comment after hovering
    await postPage.commentAuthorLink.first().hover();
    await homePage.page.waitForTimeout(1000);
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentAuthorLink.first().locator('div span'),
        'color'
      )
    ).toBe('rgb(226, 18, 53)');

    // Validate the user info popover card is visible
    await postPage.commentAuthorLink.first().click();
    await expect(postPage.userPopoverCard).toBeVisible();
  });

  test('Validate the first comment reputation styles in the post in the dark mode', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of the reputation of the first comment without hovering
    expect(
      await postPage.getElementCssPropertyValue(await postPage.commentAuthorReputation.first(), 'color')
    ).toBe('rgb(248, 250, 252)');
    // Color of the reputation of the first comment after hovering
    await postPage.commentAuthorReputation.first().hover();
    await homePage.page.waitForTimeout(500);
    expect(
      await postPage.getElementCssPropertyValue(await postPage.commentAuthorReputation.first(), 'color')
    ).toBe('rgb(248, 250, 252)');

    // Validate the tooltip of reputation
    const atrTitle = await postPage.commentAuthorReputation.first().getAttribute('title');
    await expect(atrTitle).toBe('Reputation');
  });

  test('Validate the first comment timestamp styles in the post in the dark mode', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of the timestamp of the first comment without hovering
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentCardsHeadersTimeStampLink.first(),
        'color'
      )
    ).toBe('rgb(248, 250, 252)');
    // Color of the timestamp of the first comment after hovering
    await postPage.commentCardsHeadersTimeStampLink.first().hover();
    await homePage.page.waitForTimeout(1000);
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentCardsHeadersTimeStampLink.first(),
        'color'
      )
    ).toBe('rgb(226, 18, 53)');

    // Validate the timestamp tooltip
    const atrTitle = await postPage.commentCardsHeadersTimeStampLink.first().getAttribute('title');
    await expect(atrTitle).toContain('Fri Jun 18 2021');
  });

  test('Validate the popover card name, nickname and avatar is displayed after click username in the post', async ({
    page
  }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Click comment name to display the author info popover card
    await postPage.commentAuthorLink.first().click();
    // Validate if the author avatar is displayed in the popover card
    await expect(postPage.userPopoverCardAvatar).toHaveAttribute('href', '/@sicarius');
    // Validate if the author name with name displayed on the comment card
    const firstCommentAuthorName = await postPage.commentAuthorLink.first().textContent();
    const firstCommentPopoverCardAuthorName = await postPage.userPopoverCardName.textContent();
    expect(firstCommentAuthorName).toBe(firstCommentPopoverCardAuthorName?.toLocaleLowerCase());
    // Validate if the comment author nickname is correct
    const firstCommentPopoverCardNickName = await postPage.userPopoverCardNickName.textContent();
    await expect(firstCommentPopoverCardNickName).toBe('@' + firstCommentAuthorName);
  });

  test('Move to the first comment author profile page by clicking the author Name in the popover card', async ({
    page
  }) => {
    const profilePage = new ProfilePage(page);

    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Click comment name to display the author info popover card
    await postPage.commentAuthorLink.first().click();

    const firstCommentAuthorName = await postPage.userPopoverCardName.first().textContent();
    await postPage.userPopoverCardName.click();
    await profilePage.page.waitForLoadState('domcontentloaded');
    await profilePage.profileNameIsEqual(firstCommentAuthorName || '');
  });

  test('Move to the first comment author profile page by clicking the author Nickname in the popover card', async ({
    page
  }) => {
    const profilePage = new ProfilePage(page);

    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Click comment name to display the author info popover card
    await postPage.commentAuthorLink.first().click();

    const firstCommentAuthorName = await postPage.userPopoverCardName.first().textContent();
    await postPage.userPopoverCardNickName.click();
    await profilePage.page.waitForLoadState('domcontentloaded');
    await profilePage.profileNameIsEqual(firstCommentAuthorName || '');
  });

  test('Move to the first comment author profile page by clicking the author Avatar in the popover card', async ({
    page
  }) => {
    const profilePage = new ProfilePage(page);

    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Click comment name to display the author info popover card
    await postPage.commentAuthorLink.first().click();

    const firstCommentAuthorName = await postPage.userPopoverCardName.first().textContent();
    await postPage.userPopoverCardAvatar.click();
    await profilePage.page.waitForLoadState('domcontentloaded');
    await profilePage.profileNameIsEqual(firstCommentAuthorName || '');
  });

  test('Validate followers and following in the popover card of the first comment author', async ({
    page
  }) => {
    const apiHelper = new ApiHelper(page);

    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // Click comment name to display the author info popover card
    await postPage.commentAuthorLink.first().click();
    await page.waitForSelector(await postPage.userAboutPopoverCard['_selector']);

    // Compare followers of `sicarius` of API and UI
    const userFollowersAPI = (await apiHelper.getFollowCountAPI('sicarius'))['result'].follower_count;
    const userFollowersAPIString = `${userFollowersAPI}Followers`;
    expect(await postPage.userFollowersPopoverCard.textContent()).toBe(userFollowersAPIString);

    // Compare following of `sicarius` of API and UI
    const userFollowingAPI = (await apiHelper.getFollowCountAPI('sicarius'))['result'].following_count;
    const userFollowingAPIString = `${userFollowingAPI}Following`;
    expect(await postPage.userFollowingPopoverCard.textContent()).toBe(userFollowingAPIString);
  });

  test('Validate user about in the popover card of the first comment author', async ({ page }) => {
    const apiHelper = new ApiHelper(page);

    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    await postPage.commentAuthorLink.first().click();
    await page.waitForSelector(await postPage.userAboutPopoverCard['_selector']);

    const userPostingJsonMetadata = await JSON.parse(
      (await apiHelper.getAccountInfoAPI('sicarius'))['result'][0].posting_json_metadata
    );

    let userAboutAPI: any;
    let userAboutUI: string;
    let removeThreeDotsUserAboutUI;
    if (userPostingJsonMetadata.profile.about) {
      userAboutAPI = await userPostingJsonMetadata.profile.about;
      userAboutUI = await postPage.userAboutPopoverCard.textContent() || '';
      removeThreeDotsUserAboutUI = userAboutUI.replace('...', '');
      // console.log('userAboutAPI: ', await userAboutAPI);
      expect(userAboutAPI).toContain(await removeThreeDotsUserAboutUI);
    } else {
      userAboutAPI = '';
      // console.log('userAboutAPI: ', await userAboutAPI);
      expect(await postPage.userAboutPopoverCard.textContent()).toBe(userAboutAPI);
    }
  });

  test('Validate Follow button style in the popover card of the first comment author in light theme', async ({
    page
  }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    await postPage.commentAuthorLink.first().click();
    await page.waitForSelector(await postPage.userAboutPopoverCard['_selector']);

    // button styles
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'color')).toBe(
      'rgb(248, 250, 252)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'background-color')
    ).toBe('rgb(24, 30, 42)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'border-color')).toBe(
      'rgb(237, 237, 237)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'border-style')).toBe(
      'solid'
    );

    // button styles when hovered over it
    await postPage.buttonFollowPopoverCard.hover();
    await postPage.page.waitForTimeout(1000);

    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'color')).toBe(
      'rgb(218, 43, 43)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'background-color')
    ).toBe('rgb(24, 30, 42)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'border-color')).toBe(
      'rgb(237, 237, 237)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'border-style')).toBe(
      'solid'
    );
  });

  test('Validate Follow button style in the popover card of the first comment author in dark theme', async ({
    page
  }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // move to the dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Click the first comment author link
    await postPage.commentAuthorLink.first().click();
    await page.waitForSelector(await postPage.userAboutPopoverCard['_selector']);

    // button styles
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'color')).toBe(
      'rgb(2, 2, 5)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'background-color')
    ).toBe('rgb(248, 250, 252)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'border-color')).toBe(
      'rgb(29, 40, 58)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'border-style')).toBe(
      'solid'
    );

    // button styles when hovered over it
    await postPage.buttonFollowPopoverCard.hover();
    await postPage.page.waitForTimeout(1000);

    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'color')).toBe(
      'rgb(226, 18, 53)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'background-color')
    ).toBe('rgb(248, 250, 252)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'border-color')).toBe(
      'rgb(29, 40, 58)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowPopoverCard, 'border-style')).toBe(
      'solid'
    );
  });

  test('Validate styles of the popover card of the first comment author in dark mode', async ({ page }) => {
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Popover the first comment author link
    await postPage.commentAuthorLink.first().click();
    await page.waitForSelector(await postPage.userAboutPopoverCard['_selector']);

    expect(await postPage.getElementCssPropertyValue(postPage.userPopoverCard, 'background-color')).toBe(
      'rgb(44, 48, 53)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.userPopoverCard, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
  });

  test('Move to the comment view page of the first comment by clicking comment link and validate the main comment', async ({
    page
  }) => {
    const commentViewPage = new CommentViewPage(page);
    const defaultLoginForm = new LoginForm(page);
    const reblogDialog = new ReblogThisPostDialog(page);

    // Move to the post with comments
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // click comment link of the first comment
    await postPage.commentPageLink.first().scrollIntoViewIfNeeded();
    await postPage.commentPageLink.first().click();
    await commentViewPage.page.waitForLoadState('domcontentloaded');
    // validate re-title of the comment's thread
    await expect(commentViewPage.getReArticleTitle).toHaveText(reArticleTitle);
    // validate author of the main comment
    await expect(commentViewPage.getMainCommentAuthorNameLink).toHaveText('sicarius');
    // click the comment author of the comment
    await commentViewPage.getMainCommentAuthorNameLink.first().scrollIntoViewIfNeeded();
    await commentViewPage.getMainCommentAuthorNameLink.first().click();
    // validate the user info click card is visibled
    await expect(commentViewPage.getPopoverCardContent.first()).toBeVisible();
    // the content of comment contain specific text
    await expect(commentViewPage.getMainCommentContent.first()).toContainText(
      "Did my 'ol due diligence and threw a star and fork at the openhive repo."
    );
    // click Upvote and move to the Login to Vote Dialog and back
    await commentViewPage.getMainCommentUpvoteButton.scrollIntoViewIfNeeded();
    await commentViewPage.getMainCommentUpvoteButton.click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
    await expect(commentViewPage.getMainCommentAuthorNameLink.first()).toHaveText('sicarius');
    // click Downvote and move to the Login to Vote Dialog and back
    await commentViewPage.getMainCommentDownvoteButton.scrollIntoViewIfNeeded();
    await commentViewPage.getMainCommentDownvoteButton.click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
    await expect(commentViewPage.getMainCommentAuthorNameLink.first()).toHaveText('sicarius');
    // Read value of the first comment payout
    const firstCommentPayoutValue = '$0.29';
    await expect(commentViewPage.getMainCommentPayout).toHaveText(firstCommentPayoutValue);
    // Read value of the first comment votes
    const firstCommentVotes = '4 votes';
    await expect(commentViewPage.getMainCommentVotes).toHaveText(firstCommentVotes);
    // Click Reply of the first comment and open login form
    await commentViewPage.getMainCommentReplyButton.scrollIntoViewIfNeeded();
    await commentViewPage.getMainCommentReplyButton.click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
    // Click Reblog icon and open reblog dialog
    await commentViewPage.getMainCommentReblogButton.click();
    await reblogDialog.validateReblogThisPostHeaderIsVisible();
    await reblogDialog.validateReblogThisPostDescriptionIsVisible();
    await expect(reblogDialog.getDialogOkButton).toBeVisible();
    await expect(reblogDialog.getDialogCancelButton).toBeVisible();
    await reblogDialog.closeReblogDialog();
    // validate re-title of the comment's thread
    await expect(commentViewPage.getReArticleTitle).toHaveText(reArticleTitle);
    // Read responses number
    const numberResponses = await commentViewPage.getMainCommentResponsButton.textContent();
    await expect(numberResponses).toBe('1');
  });

  test('Move to the comment view page of the first comment by clicking comment link and validate the response comment', async ({
    page
  }) => {
    const commentViewPage = new CommentViewPage(page);
    const defaultLoginForm = new LoginForm(page);

    // Move to the post with comments
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);

    // click comment link of the first comment
    await postPage.commentPageLink.first().scrollIntoViewIfNeeded();
    await postPage.commentPageLink.first().click();
    await commentViewPage.page.waitForLoadState('domcontentloaded');
    // validate re-title of the comment's thread - comment view page is loaded
    await expect(commentViewPage.getReArticleTitle).toHaveText(reArticleTitle);
    // validate the response comment's author
    await expect(commentViewPage.getResponseCommentAuthorNameLink).toHaveText('gtg');
    // validate the response comment's author reputation
    expect(await commentViewPage.getResponseCommentAuthorReputation.textContent()).toBe('(75)');
    // validate the response comment's author affiliation tag
    expect(await commentViewPage.getResponseCommentAffiliationTag).toHaveText('Wizard');
    // validate the response comment's author content
    const contentResponseComment: string =
      (await commentViewPage.getResponseCommentContent.textContent()) || '';
    await expect(contentResponseComment).toContain('Great to hear, thank you');
    // vaidate the response comment's author payout
    const responseCommentPayout = await commentViewPage.getResponseCommentPayout.textContent();
    expect(await responseCommentPayout).toBe('$0.00');
    // Click Reply of the response comment
    await commentViewPage.getResponseCommentReply.click();
    await defaultLoginForm.validateDefaultLoginFormIsLoaded();
    await defaultLoginForm.closeLoginForm();
  });

  test('Move to the comment view page and go back to the "View the full context"', async ({ page }) => {
    const commentViewPage = new CommentViewPage(page);
    const postPage = new PostPage(page);

    // Move to the post with comments
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);
    // Click comment link of the second comment(nested comment - gtg as author)
    await postPage.commentPageLink.nth(1).scrollIntoViewIfNeeded();
    await postPage.commentPageLink.nth(1).click();
    await commentViewPage.page.waitForLoadState('domcontentloaded');
    // Validate re-title of the comment's thread - comment view page is loaded
    await expect(commentViewPage.getReArticleTitle).toHaveText(reArticleTitle);
    await postPage.articleBody.waitFor({state: 'visible'});
    // Click 'View the full context'
    await commentViewPage.getViewFullContext.click();
    await postPage.page.waitForLoadState('domcontentloaded');
    await postPage.articleBody.waitFor({state: 'visible'});
    // Validate that the post page of Hive HardFork 25 Jump Starter Kit of gtg is loaded
    expect(await postPage.articleTitle).toHaveText('Hive HardFork 25 Jump Starter Kit');
    expect(await postPage.articleAuthorName).toHaveText('gtg');
    // Validate that the response comment of the first comment in the post is selected by red border
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(1).locator('..'),
        'border-color'
      )
    ).toBe('rgb(220, 38, 38)');
    // Validate that the first comment is not selected by red border
    expect(
      await postPage.getElementCssPropertyValue(
        await postPage.commentListItems.nth(0).locator('..'),
        'border-color'
      )
    ).toBe('rgb(237, 237, 237)');
  });

  test('Move to the comment view page and go back to the "View the direct parent"', async ({ page }) => {
    const commentViewPage = new CommentViewPage(page);

    // Move to the post with comments
    await postPage.gotoPostPage(communityCategoryName, postAuthorName, postPermlink);
    // Click comment link of the second comment(nested comment - gtg as author)
    await postPage.commentPageLink.nth(1).scrollIntoViewIfNeeded();
    await postPage.commentPageLink.nth(1).click();
    await commentViewPage.page.waitForLoadState('domcontentloaded');
    // Validate re-title of the comment's thread - comment view page is loaded
    await expect(commentViewPage.getReArticleTitle).toHaveText(reArticleTitle);
    await postPage.articleBody.waitFor({state: 'visible'});
    // Click 'View the direct parent'
    commentViewPage.getViewDirectParent.click();
    await postPage.commentListLocator.first().waitFor({state: 'visible'});
    // Validate that the `sicarius` comment is visibled on the comment view page
    await expect(await commentViewPage.getMainCommentAuthorData).toBeVisible();
    await expect(await commentViewPage.getMainCommentAuthorNameLink).toHaveText('sicarius');
  });
});

test.describe('Load more... comments in the post', () => {
  let homePage: HomePage;
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
  });

  test('Validate "Load more... button in comments" in the post "leofinance/@leo-curation/organic-curation-report-week-25"', async ({
    page
  }) => {
    const commentViewPage = new CommentViewPage(page);
    const rePostTitle: string = 'RE: Organic Curation report - Week 25, 2023';

    // Move to the post "leofinance/@leo-curation/organic-curation-report-week-25"
    await postPage.gotoPostPage('leofinance', 'leo-curation', 'organic-curation-report-week-25');
    await expect(await postPage.articleTitle).toBeVisible();
    await expect(await postPage.articleTitle).toHaveText('Organic Curation report - Week 25, 2023');
    await expect(postPage.commentListItems.first()).toBeVisible();
    await expect((await postPage.commentListItems.all()).length).toBe(12);
    // Click "Load more... link" and validate that you moved to the comment view page with the others post
    await postPage.getLoadMoreCommentsLink.click();
    await expect(await commentViewPage.getReArticleTitle).toBeVisible();
    await expect(await commentViewPage.getReArticleTitle).toHaveText(rePostTitle);
    await expect(postPage.commentListItems.first()).toBeVisible();
    expect((await postPage.commentListItems.all()).length).toBe(3);
  });

  test('Validate sorting the comments in the post "leofinance/@leo-curation/organic-curation-report-week-25"', async ({
    page
  }) => {
    const commentViewPage = new CommentViewPage(page);

    // Move to the post "leofinance/@leo-curation/organic-curation-report-week-25"
    await postPage.gotoPostPage('leofinance', 'leo-curation', 'organic-curation-report-week-25');
    await expect(await postPage.articleTitle).toHaveText('Organic Curation report - Week 25, 2023');
    // Validate the number of visible posts
    await postPage.commentListLocator.first().waitFor({state: 'visible'});
    await expect((await postPage.commentListItems.all()).length).toBe(12);
    // Validate the author and content of the first post in the Trending filter
    await expect(await postPage.commentAuthorLink.first()).toHaveText('infinity0');
    await expect(await postPage.commentCardsDescriptions.first()).toContainText(
      'Thank you! 3 days here and I love everything single second'
    );
    // Click Sort for Age
    await postPage.getCommentFilter.click();
    await postPage.getCommentFilterList.getByText('Age').waitFor();
    await postPage.getCommentFilterList.getByText('Age').click();
    // Validate the author and content of the first post in the Age filter is different than in the Trending filter
    await postPage.commentListItems.first().waitFor();
    await expect(await postPage.commentAuthorLink.first()).toHaveText('takhar');
    await expect(await postPage.commentCardsDescriptions.first()).toContainText(
      "Thanks for the curation, I'm very grateful"
    );
  });
});
