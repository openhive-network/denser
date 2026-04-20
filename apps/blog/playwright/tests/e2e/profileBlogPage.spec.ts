import { Locator, expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { PostPage } from '../support/pages/postPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { ReblogThisPostDialog } from '../support/pages/reblogThisPostDialog';
import { LoginForm } from '../support/pages/loginForm';


test.describe('Profile page of @gtg', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
  });

  test('profile Blog tab of @gtg is loaded', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    // Validate URL of page is "http://.../@gtg"
    await expect(profilePage.page).toHaveURL(/ *.\/@gtg$/);
    await profilePage.profileBlogTabIsSelected();
  });

  test('if a post item is reblogged then compare profile owner with the post author', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostRebloggedLabel = await profilePage.postBlogItem.first();
    const firstPostRebloggedAuthorLink = await profilePage.postRebloggedAuthorLink.nth(0);
    const firstPostAuthor = await profilePage.postsPostAuthor.nth(0);

    if (await firstPostRebloggedLabel.locator('[data-testid="reblogged-label"]').isVisible())
      expect(await firstPostRebloggedAuthorLink.textContent()).not.toBe(await firstPostAuthor.textContent());
    else
      expect(await firstPostAuthor.textContent()).toBe('gtg');
  });

  test('validate amount of post items before and after loading more cards', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    await expect(profilePage.postBlogItem.nth(19)).toBeVisible({ timeout: 15000 });
    const postListItemsBeforeLoadMore = await profilePage.postBlogItem.all();
    expect(await postListItemsBeforeLoadMore.length).toBe(20);

    await profilePage.page.keyboard.down('End');

    // Wait for new posts to load with dynamic timeout
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="post-list-item"]').length >= 40,
      { timeout: 10000 }
    );

    const postListItemsAfterScrollDown = await profilePage.postBlogItem.all();
    expect(await postListItemsAfterScrollDown.length).toBeGreaterThanOrEqual(40);
    expect(await postListItemsAfterScrollDown.length).toBeLessThanOrEqual(60);

    // Verify that new posts were actually loaded
    expect(await postListItemsAfterScrollDown.length).toBeGreaterThan(postListItemsBeforeLoadMore.length);
  });

  test('move to the profile page after clicking avatar of the first post card', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostNickName: any = await profilePage.postAvatar.first().getAttribute('href');

    // Click avatar of the first comment card
    await profilePage.postAvatar.first().click();
    await expect(profilePage.profileStats).toBeVisible({ timeout: 15000 });
    await profilePage.moveToPostsTab();
    const profilePagePostAuthor: any = await profilePage.postsPostAuthor.first().textContent();
    // Validate the post author name is the same as autor post in the profile page in posts tab
    await expect(await firstPostNickName).toContain(await profilePagePostAuthor);
  });

  test('move to the profile page after clicking nickname of the first post card', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostNickName: any = await profilePage.postAvatar.first().getAttribute('href');

    // Click nickname of the first comment card
    await profilePage.postsPostAuthor.first().click();
    await expect(profilePage.profileStats).toBeVisible({ timeout: 15000 });
    await profilePage.moveToPostsTab();
    const profilePagePostAuthor: any = await profilePage.postsPostAuthor.first().textContent();
    // Validate the post author name is the same as autor post in the profile page in posts tab
    await expect(await firstPostNickName).toContain(await profilePagePostAuthor);
  });

  test('move to the post page after clicking the card title', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostCardTitle: any = await profilePage.postTitle.first().textContent();
    const firstPostCardDescription: any = await profilePage.postDescription.first().textContent();
    await profilePage.postTitle.first().click();
    await postPage.page.waitForSelector(await postPage.articleBody['_selector']);
    await expect(postPage.articleTitle).toHaveText(await firstPostCardTitle);
    await expect(postPage.articleBody).toBeVisible();
  });

  test('move to the post page after clicking the card description', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostCardTitle: any = await profilePage.postTitle.first().textContent();
    await profilePage.postDescription.first().click();
    await postPage.page.waitForSelector(await postPage.articleBody['_selector']);
    await expect(postPage.articleTitle).toHaveText(await firstPostCardTitle);
    await expect(postPage.articleBody).toBeVisible();
  });

  test('move to the community page after clicking community/category link of the first post card', async ({ page }) => {
    let communityPage = new CommunitiesPage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileBlogTabIsSelected();

    const firstPostItem: Locator = await profilePage.postBlogItem.first();
    const postCommunityLink: Locator = await profilePage.postCommunityLink;
    const postCategoryLink: Locator = await profilePage.postCategoryLink;


    if (await firstPostItem.filter({ has: postCommunityLink }).isVisible()) {
      const firstPostCommunityLinkName: any = await firstPostItem.filter({ has: postCommunityLink }).locator(postCommunityLink).textContent();
      console.log('Fist Post Community Name ', await firstPostCommunityLinkName);

      await postCommunityLink.first().click();
      await expect(communityPage.communityNameTitle).toHaveText(firstPostCommunityLinkName);

      await expect(communityPage.communityInfoSidebar.locator('h3')).toHaveText(firstPostCommunityLinkName);
      await communityPage.validataCommunitiesPageIsLoaded(await firstPostCommunityLinkName);
    }

    if (await firstPostItem.filter({ has: postCategoryLink }).isVisible()) {
      const firstPostCategoryLinkName: any = await firstPostItem.filter({ has: postCategoryLink }).locator(postCategoryLink).textContent();
      // console.log('Fist Post Category Name ', await firstPostCategoryLinkName);

      await postCategoryLink.first().click();
      await expect(communityPage.communityNameTitle).toHaveText(firstPostCategoryLinkName);
    }
  });

  test('validate styles of the post header in the light mode', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    // Validate post header elements are visible and have correct attributes
    await profilePage.validatePostHeaderElementsVisible();

    // Validate interactive elements have pointer cursor (links)
    await profilePage.validatePostHeaderHoverBehavior();
  });

  test('validate styles of the post header in the dark mode', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await homePage.changeThemeMode('Dark');
    await homePage.validateDarkModeByClass();

    // Validate post header elements are visible and have correct attributes
    await profilePage.validatePostHeaderElementsVisible();

    // Validate interactive elements have pointer cursor (links)
    await profilePage.validatePostHeaderHoverBehavior();
  });

  test('move to the post page after clicking the timestamp', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostCardTitle: any = await profilePage.postTitle.first().textContent();
    const firstPostCardDescription: any = await profilePage.postDescription.first().textContent();

    await profilePage.postTimestamp.first().click();

    await postPage.page.waitForSelector(await postPage.articleBody['_selector']);
    await expect(postPage.articleTitle).toHaveText(await firstPostCardTitle);
    await expect(postPage.articleBody).toBeVisible();
  });

  test('move to the login page after clicking upvote of the first post card', async ({ page }) => {
    let loginDialog = new LoginForm(page);

    await profilePage.gotoProfilePage('@gtg');

    // Validate upvote button structure
    await profilePage.validateUpvoteButtonStructure();

    // Hover upvote button
    await profilePage.postUpvoteButton.first().hover();
    await expect(profilePage.postUpvoteTooltip).toBeVisible({ timeout: 15000 });
    // Validate the tooltip message
    const tooltipText = await profilePage.postUpvoteTooltip.textContent();
    expect(
      tooltipText === "UpvoteUpvote" || tooltipText === "UpvoteVoting on Content after their payout does not generate any new rewardsUpvoteVoting on Content after their payout does not generate any new rewards"
    ).toBeTruthy();

    await profilePage.postUpvoteButton.first().click();
    await loginDialog.validateDefaultLoginFormIsLoaded();
    await loginDialog.closeLoginForm();
  });

  test('move to the login page after clicking downvote of the first post card', async ({ page }) => {
    let loginDialog = new LoginForm(page);

    await profilePage.gotoProfilePage('@gtg');

    // Validate downvote button structure
    await profilePage.validateDownvoteButtonStructure();

    // Hover Downvote button
    await profilePage.postDownvoteButton.first().hover();
    await expect(profilePage.postDownvoteTooltip).toBeVisible({ timeout: 15000 });
    // Validate the tooltip message
    const tooltipText = await profilePage.postDownvoteTooltip.textContent();
    expect(
      tooltipText === "DownvoteDownvote" || tooltipText === "DownvoteVoting on Content after their payout does not generate any new rewardsDownvoteVoting on Content after their payout does not generate any new rewards"
    ).toBeTruthy();

    await profilePage.postDownvoteButton.first().click();
    await loginDialog.validateDefaultLoginFormIsLoaded();
    await loginDialog.closeLoginForm();
  });

  test('validate payout of the first post card', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    // Validate payout is visible and has correct format
    await profilePage.validatePayoutVisible();

    const firstPostPayoutText = await profilePage.postPayout.first().textContent();
    const firstPostPayout = await profilePage.postPayout.first();

    // If payout > $0.00, tooltip should appear on hover
    if (firstPostPayoutText !== '$0.00') {
      await firstPostPayout.hover();
      await expect(profilePage.postPayoutTooltip.first()).toBeVisible({ timeout: 15000 });
    }
  });

  test('validate votes of the first post card', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    // Wait for the first post card to be visible before interacting with votes
    await expect(profilePage.postBlogItem.first()).toBeVisible({ timeout: 15000 });

    const firstPostVote = profilePage.postVotes.nth(0);
    await expect(firstPostVote).toBeVisible({ timeout: 15000 });
    const firstPostVoteText = await firstPostVote.textContent();

    if (Number(firstPostVoteText) > 1) {
      // more than 1 vote
      await firstPostVote.hover();
      await expect(profilePage.postVotesTooltip.nth(0)).toBeVisible({ timeout: 15000 });
      await expect(profilePage.postVotesTooltip.nth(0)).toContainText('votes');
    } else if (Number(firstPostVoteText) == 1) {
      // equal 1 vote
      await firstPostVote.hover();
      await expect(profilePage.postVotesTooltip.nth(0)).toBeVisible({ timeout: 15000 });
      await expect(profilePage.postVotesTooltip.nth(0)).toHaveText('1 vote');
    }
    else {
      // no vote
      await firstPostVote.hover();
      await expect(profilePage.postVotesTooltip.nth(0)).toBeVisible({ timeout: 15000 });
      await expect(profilePage.postVotesTooltip.nth(0)).toHaveText('no vote');
    }
  });

  test('validate styles and tooltips of response button', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    // Wait for the first post card to be visible before interacting with response
    await expect(profilePage.postBlogItem.first()).toBeVisible({ timeout: 15000 });

    const firstPostRespond = profilePage.postResponse.first();
    await expect(firstPostRespond).toBeVisible({ timeout: 15000 });
    const firstPostRespondText = await firstPostRespond.textContent();

    if (Number(firstPostRespondText) > 1) {
      // more than 1 responses
      await firstPostRespond.hover();
      await expect(profilePage.postResponseTooltip.nth(0)).toBeVisible({ timeout: 15000 });
      await expect(profilePage.postResponseTooltip.nth(0)).toContainText('responses. Click to respond');
    } else if (Number(firstPostRespondText) == 1) {
      // equal 1 response
      await firstPostRespond.hover();
      await expect(profilePage.postResponseTooltip.nth(0)).toBeVisible({ timeout: 15000 });
      await expect(profilePage.postResponseTooltip.nth(0)).toHaveText('1 response. Click to respond');
    } else {
      // no response
      await firstPostRespond.hover();
      await expect(profilePage.postResponseTooltip.nth(0)).toBeVisible({ timeout: 15000 });
      await expect(profilePage.postResponseTooltip.nth(0)).toHaveText('No responses. Click to respond');
    }
  });

  test('move to the comment part of the post page after clicking respond', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostResponse: any = await profilePage.postResponse.first();
    const firstPostTitle: any = await profilePage.postTitle.first().textContent();
    const firstPostAuthor: any = await profilePage.postsPostAuthor.first().textContent();

    await firstPostResponse.click();

    await expect(postPage.articleTitle).toHaveText(firstPostTitle);
    await expect(postPage.articleAuthorName).toHaveText(firstPostAuthor);
    await expect(await postPage.page.url()).toContain('#comments');
  });

  test('validate reblog count display styles in the light theme', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    // Validate reblog count is visible and tooltip shows reblog info
    await profilePage.validateReblogCountWithTooltip();
  });

  test('validate reblog count display styles in the dark theme', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await homePage.changeThemeMode('Dark');
    await homePage.validateDarkModeByClass();

    // Validate reblog count is visible and tooltip shows reblog info
    await profilePage.validateReblogCountWithTooltip();
  });

  test('move to the reblog dialog of the first post ', async ({ page }) => {
    const reblogDialog = new ReblogThisPostDialog(page);
    await profilePage.gotoProfilePage('@gtg');

    // Navigate to first post page (reblog is now interactive only on post pages)
    await profilePage.postTitle.first().click();
    await page.waitForSelector('[data-testid="article-title"]');

    // Click reblog icon on post page
    await postPage.footerReblogIcon.click();
    // Wait for the dialog to appear before validating
    await expect(reblogDialog.getDialogHeader).toBeVisible({ timeout: 15000 });
    await reblogDialog.validateReblogThisPostHeaderIsVisible();
    await reblogDialog.validateReblogThisPostDescriptionIsVisible();
    await expect(reblogDialog.getDialogOkButton).toBeVisible();
    await expect(reblogDialog.getDialogCancelButton).toBeVisible();
    await reblogDialog.closeReblogDialog();
  });
});

test.describe('Profile page of @polish.hive - cross-post author', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
  });

  test('cross-post original link author matches the displayed post author', async () => {
    await profilePage.gotoPostsProfilePage('@polish.hive');
    await expect(profilePage.postBlogItem.first()).toBeVisible();

    const crossPostedItems = profilePage.postBlogItem
      .filter({ has: profilePage.crossPostBanner });
    const crossPostCount = await crossPostedItems.count();
    test.skip(crossPostCount === 0, 'No cross-posted items found on this profile');

    const firstCrossPostedItem = crossPostedItems.first();
    const postAuthorText = await firstCrossPostedItem.locator(profilePage.postsPostAuthor).textContent();
    const originalLinkText = await firstCrossPostedItem.locator(profilePage.crossPostOriginalLink).textContent();
    const originalAuthor = originalLinkText?.replace(/^@/, '').split('/')[0];

    expect(postAuthorText).toBe(originalAuthor);
  });
});
