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

    const postListItemsBeforeLoadMore = await profilePage.postBlogItem.all();
    expect(await postListItemsBeforeLoadMore.length).toBe(20);

    await profilePage.page.keyboard.down('End');
    await page.waitForTimeout(1000);
    const postListItemsAfterScrollDown = await profilePage.postBlogItem.all();
    expect(await postListItemsAfterScrollDown.length).toBe(40);
  });

  test('move to the profile page after clicking avatar of the first post card', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostNickName: any = await profilePage.postAvatar.first().getAttribute('href');

    // Click avatar of the first comment card
    await profilePage.postAvatar.first().click();
    await profilePage.page.waitForTimeout(1000);
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
    await profilePage.page.waitForTimeout(1000);
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

    const firstPostItem: Locator = await profilePage.postBlogItem.nth(1);
    const postCommunityLink: Locator = await profilePage.postCommunityLink;
    const postCategoryLink: Locator = await profilePage.postCategoryLink;


    if (await firstPostItem.filter({ has: postCommunityLink }).isVisible()){
        const firstPostCommunityLinkName: any = await firstPostItem.filter({ has: postCommunityLink }).locator(postCommunityLink).textContent();
        // console.log('Fist Post Community Name ', await firstPostCommunityLinkName);

        await postCommunityLink.first().click();
        expect(await communityPage.communityNameTitle.textContent()).toBe(firstPostCommunityLinkName);

        expect(await communityPage.communityInfoSidebar.locator('h3').textContent()).toBe(firstPostCommunityLinkName);
        await communityPage.validataCommunitiesPageIsLoaded(await firstPostCommunityLinkName);
    }

    if (await firstPostItem.filter({ has: postCategoryLink }).isVisible()){
        const firstPostCategoryLinkName: any = await firstPostItem.filter({ has: postCategoryLink }).locator(postCategoryLink).textContent();
        // console.log('Fist Post Category Name ', await firstPostCategoryLinkName);

        await postCategoryLink.first().click();
        expect(await communityPage.communityNameTitle.textContent()).toBe(firstPostCategoryLinkName);
    }
  });

  test('validate styles of the post header in the light mode', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostNickName = await profilePage.postsPostAuthor.first();

    // Validate color of nickname before hovering
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostNickName,
      'color'
      )
    ).toBe('rgb(0, 0, 0)');

    // Validate color of nickname after hovering
    await firstPostNickName.hover();
    await profilePage.page.waitForTimeout(1000);
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostNickName,
      'color'
      )
    ).toBe('rgb(220, 38, 38)');

    // Validate reputation color and tooltip
    const firstPostReputation = await profilePage.postReputation.first();
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostReputation,
      'color'
      )
    ).toBe('rgb(100, 116, 139)');

    await expect(homePage.getFirstPostAuthorReputation).toHaveAttribute('title', 'Reputation');

    // Validate community/category style before hovering
    const firstPostItem: Locator = await profilePage.postBlogItem.first();
    const postCommunityLink: Locator = await profilePage.postCommunityLink;
    const postCategoryLink: Locator = await profilePage.postCategoryLink;

    if (await firstPostItem.filter({ has: postCommunityLink }).isVisible()){
      // Validate color of community before hovering
      expect(
        await profilePage.getElementCssPropertyValue(
        await postCommunityLink.first(),
        'color'
        )
      ).toBe('rgb(100, 116, 139)');

      // Validate color of community after hovering
      await postCommunityLink.first().hover();
      await profilePage.page.waitForTimeout(1000);
      expect(
        await profilePage.getElementCssPropertyValue(
        await postCommunityLink.first(),
        'color'
        )
      ).toBe('rgb(220, 38, 38)');
    }

    if (await firstPostItem.filter({ has: postCategoryLink }).isVisible()){
      // Validate color of category before hovering
      expect(
        await profilePage.getElementCssPropertyValue(
        await postCategoryLink.first(),
        'color'
        )
      ).toBe('rgb(100, 116, 139)');

      // Validate color of category after hovering
      await postCategoryLink.first().hover();
      await profilePage.page.waitForTimeout(1000);
      expect(
        await profilePage.getElementCssPropertyValue(
        await postCategoryLink.first(),
        'color'
        )
      ).toBe('rgb(220, 38, 38)');
    }

    // Validate style of the timestamp of the first post
    const firstPostTimestamp = await profilePage.postTimestamp.first();
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostTimestamp,
      'color'
      )
    ).toBe('rgb(100, 116, 139)');

    // Validate color of the timestamp after hovering
    await firstPostTimestamp.first().hover();
    await profilePage.page.waitForTimeout(1000);
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostTimestamp,
      'color'
      )
    ).toBe('rgb(220, 38, 38)');
  });

  test('validate styles of the post header in the dark mode', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    const firstPostNickName = await profilePage.postsPostAuthor.first();

    // Validate color of nickname before hovering
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostNickName,
      'color'
      )
    ).toBe('rgb(255, 255, 255)');

    // Validate color of nickname after hovering
    await firstPostNickName.hover();
    await profilePage.page.waitForTimeout(1000);
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostNickName,
      'color'
      )
    ).toBe('rgb(220, 38, 38)');

    // Validate reputation color and tooltip
    const firstPostReputation = await profilePage.postReputation.first();
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostReputation,
      'color'
      )
    ).toBe('rgb(148, 163, 184)');

    await expect(homePage.getFirstPostAuthorReputation).toHaveAttribute('title', 'Reputation');

    // Validate community/category style before hovering
    const firstPostItem: Locator = await profilePage.postBlogItem.first();
    const postCommunityLink: Locator = await profilePage.postCommunityLink;
    const postCategoryLink: Locator = await profilePage.postCategoryLink;

    if (await firstPostItem.filter({ has: postCommunityLink }).isVisible()){
      // Validate color of community before hovering
      expect(
        await profilePage.getElementCssPropertyValue(
        await postCommunityLink.first(),
        'color'
        )
      ).toBe('rgb(148, 163, 184)');

      // Validate color of community after hovering
      await postCommunityLink.first().hover();
      await profilePage.page.waitForTimeout(1000);
      expect(
        await profilePage.getElementCssPropertyValue(
        await postCommunityLink.first(),
        'color'
        )
      ).toBe('rgb(220, 38, 38)');
    }

    if (await firstPostItem.filter({ has: postCategoryLink }).isVisible()){
      // Validate color of category before hovering
      expect(
        await profilePage.getElementCssPropertyValue(
        await postCategoryLink.first(),
        'color'
        )
      ).toBe('rgb(148, 163, 184)');

      // Validate color of category after hovering
      await postCategoryLink.first().hover();
      await profilePage.page.waitForTimeout(1000);
      expect(
        await profilePage.getElementCssPropertyValue(
        await postCategoryLink.first(),
        'color'
        )
      ).toBe('rgb(220, 38, 38)');
    }

    // Validate style of the timestamp of the first post
    const firstPostTimestamp = await profilePage.postTimestamp.first();
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostTimestamp,
      'color'
      )
    ).toBe('rgb(148, 163, 184)');

    // Validate color of the timestamp after hovering
    await firstPostTimestamp.first().hover();
    await profilePage.page.waitForTimeout(1000);
    expect(
      await profilePage.getElementCssPropertyValue(
      await firstPostTimestamp,
      'color'
      )
    ).toBe('rgb(220, 38, 38)');
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

    // Hover upvote button
    await profilePage.postUpvoteButton.first().hover();
    await profilePage.page.waitForTimeout(1000);
    // Validate the tooltip message
    expect(await profilePage.postUpvoteTooltip.textContent()).toBe('UpvoteUpvote');
    // Upvote icon color
    expect(
        await profilePage.getElementCssPropertyValue(
        await profilePage.postUpvoteButton.locator('svg').first(),
        'color'
        )
    ).toBe('rgb(255, 255, 255)');

    // Upvote icon background-color
    expect(
        await profilePage.getElementCssPropertyValue(
        await profilePage.postUpvoteButton.locator('svg').first(),
        'background-color'
        )
    ).toBe('rgb(220, 38, 38)');

    await profilePage.postUpvoteButton.first().click();
    await loginDialog.validateDefaultLoginFormIsLoaded();
    await loginDialog.closeLoginForm();
  });

  test('move to the login page after clicking downvote of the first post card', async ({ page }) => {
    let loginDialog = new LoginForm(page);

    await profilePage.gotoProfilePage('@gtg');

    // Hover Downvote button
    await profilePage.postDownvoteButton.first().hover();
    await profilePage.page.waitForTimeout(1000);
    // Validate the tooltip message
    expect(await profilePage.postDownvoteTooltip.textContent()).toBe('DownvoteDownvote');
    // Upvote icon color
    expect(
        await profilePage.getElementCssPropertyValue(
        await profilePage.postDownvoteButton.locator('svg').first(),
        'color'
        )
    ).toBe('rgb(255, 255, 255)');

    // Downvote icon background-color
    expect(
        await profilePage.getElementCssPropertyValue(
        await profilePage.postDownvoteButton.locator('svg').first(),
        'background-color'
        )
    ).toBe('rgb(75, 85, 99)');

    await profilePage.postDownvoteButton.first().click();
    await loginDialog.validateDefaultLoginFormIsLoaded();
    await loginDialog.closeLoginForm();
  });

  test('validate payout of the first post card', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostPayoutText = await profilePage.postPayout.first().textContent();
    const firstPostPayout = await profilePage.postPayout.first();
    console.log('firstPostPayoutText ', firstPostPayoutText);

    // Validate payout is visible and color after hovering
    if (firstPostPayoutText == '$0.00') {
      await expect(firstPostPayout).toBeVisible();
      expect(
        await profilePage.getElementCssPropertyValue(
        await profilePage.postPayout.first(),
        'color'
        )
      ).toBe('rgb(15, 23, 42)');
    }
    else {
      await firstPostPayout.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(profilePage.postPayoutTooltip.first()).toBeVisible();
      expect(
        await profilePage.getElementCssPropertyValue(
        await profilePage.postPayout.first(),
        'color'
        )
      ).toBe('rgb(220, 38, 38)');
    }
  });

  test('validate votes of the first post card', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostVote = await profilePage.postVotes.nth(0);
    const firstPostVoteText = await profilePage.postVotes.nth(0).textContent();

    if (Number(firstPostVoteText) > 1){
      // more than 1 vote
      await expect(firstPostVote).toBeVisible();
      await firstPostVote.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.postVotesTooltip.nth(0)).toContainText('votes');
    } else if (Number(firstPostVoteText) == 1){
      // equal 1 vote
      await expect(firstPostVote).toBeVisible();
      await firstPostVote.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.postVotesTooltip.nth(0)).toHaveText('1 vote');
    }
    else {
      // no vote
      await expect(firstPostVote).toBeVisible();
      await firstPostVote.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.postVotesTooltip.nth(0)).toHaveText('no vote');
    }
  });

  test('validate styles and tooltips of response button', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    const firstPostRespond: any = await profilePage.postResponse.first();
    const firstPostRespondText: any = await profilePage.postResponse.first().textContent();

    if (Number(firstPostRespondText) > 1){
      // more than 1 responses
      await expect(firstPostRespond).toBeVisible();
      await firstPostRespond.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.postResponseTooltip.nth(0)).toContainText('responses. Click to respond');
    } else if (Number(firstPostRespondText) == 1){
      // equal 1 response
      await expect(firstPostRespond).toBeVisible();
      await firstPostRespond.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.postResponseTooltip.nth(0)).toHaveText('1 response. Click to respond');
    } else {
      // no response
      await expect(firstPostRespond).toBeVisible();
      await firstPostRespond.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.postResponseTooltip.nth(0)).toHaveText('No responses. Click to respond');
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

  test('validate reblog button styles in the light theme', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');

    // Color of reblog button
    expect(await profilePage.getElementCssPropertyValue(await profilePage.postReblog.first(), 'color')).toBe(
      'rgb(15, 23, 42)'
    );

    // The tooltip message and colors
    await profilePage.postReblog.first().hover();
    expect(await profilePage.postReblogTooltip.first().textContent()).toContain('Reblog @');
    expect(await profilePage.getElementCssPropertyValue(await profilePage.postReblogTooltip, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.postReblogTooltip, 'background-color')
    ).toBe('rgb(255, 255, 255)');
  });

  test('validate reblog button styles in the dark theme', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of reblog button
    expect(await profilePage.getElementCssPropertyValue(await profilePage.postReblog.first(), 'color')).toBe(
      'rgb(255, 255, 255)'
    );

    // The tooltip message and colors
    await profilePage.postReblog.first().hover();
    expect(await profilePage.postReblogTooltip.textContent()).toContain('Reblog @');
    expect(await profilePage.getElementCssPropertyValue(await profilePage.postReblogTooltip, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.postReblogTooltip, 'background-color')
    ).toBe('rgb(3, 7, 17)');
  });

  test('move to the reblog dialog of the first post ', async ({ page }) => {
    let reblogDialog = new ReblogThisPostDialog(page);
    await profilePage.gotoProfilePage('@gtg');

    await profilePage.postReblog.first().click();
    await reblogDialog.validateReblogThisPostHeaderIsVisible();
    await reblogDialog.validateReblogThisPostDescriptionIsVisible();
    await expect(reblogDialog.getDialogOkButton).toBeVisible();
    await expect(reblogDialog.getDialogCancelButton).toBeVisible();
    await reblogDialog.closeReblogDialog();
    await profilePage.profileBlogTabIsSelected();
  });
});
