import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { ApiHelper } from '../support/apiHelper';
import { PostPage } from '../support/pages/postPage';
import { CommentViewPage } from '../support/pages/commentViewPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { LoginToVoteDialog } from '../support/pages/loginToVoteDialog';

test.describe('Replies Tab in Profile page of @gtg', () => {
  let homePage: HomePage;
  let profilePage: ProfilePage;
  let apiHelper: ApiHelper;
  let commentViewPage: CommentViewPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    profilePage = new ProfilePage(page);
    apiHelper = new ApiHelper(page);
    commentViewPage = new CommentViewPage(page);
  });

  test('Replies Tab of @gtg is loaded', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();
  });

  test('validate amount of comment list items before and after loading more cards', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const commentListItemsBeforeLoadMore = await profilePage.repliesCommentListItem.all();
    expect(await commentListItemsBeforeLoadMore.length).toBe(20);

    await profilePage.page.keyboard.down('End');
    await page.waitForTimeout(3000);
    const commentListItemsAfterScrollDown = await profilePage.repliesCommentListItem.all();
    expect(await commentListItemsAfterScrollDown.length).toBe(40);
  });

  test('move to the comment view page after clicking the card title', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardTitle: any = await profilePage.repliesCommentListItemTitle.first().textContent();
    const firstCommentCardDescription: any = await profilePage.repliesCommentListItemDescription
      .first()
      .textContent();
    const firstCommentCardDescriptionDots: any = await firstCommentCardDescription.replace(/\u2026/g, '');
    const firstCommentCardDescriptionWitoutSpaces: any = await firstCommentCardDescriptionDots.replace(
      /\s/g,
      ''
    );
    // console.log('firstCommentCardDescriptionDots: ', firstCommentCardDescriptionDots);
    // console.log('firstCommentCardDescriptionWitoutSpaces: ', firstCommentCardDescriptionWitoutSpaces);
    await profilePage.repliesCommentListItemTitle.locator('a').first().click();
    await profilePage.page.waitForSelector(profilePage.repliesCommentListItemArticleTitle['_selector']);
    await expect(commentViewPage.getReArticleTitle).toHaveText(firstCommentCardTitle);
    const commentContent: any = await commentViewPage.getMainCommentContent.textContent();
    const commentContentWithoutSpaces: any = await commentContent.replace(/\s/g, '');
    // console.log('commentContentWithoutSpaces: ', await commentContentWithoutSpaces);
    await expect(commentContentWithoutSpaces).toContain(firstCommentCardDescriptionWitoutSpaces);
  });

  test('move to the comment view page after clicking the card description', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardTitle: any = await profilePage.repliesCommentListItemTitle.first().textContent();
    const firstCommentCardDescription: any = await profilePage.repliesCommentListItemDescription
      .first()
      .textContent();
    const firstCommentCardDescriptionDots: any = await firstCommentCardDescription.replace(/\u2026/g, '');
    const firstCommentCardDescriptionWitoutSpaces: any = await firstCommentCardDescriptionDots.replace(
      /\s/g,
      ''
    );
    await profilePage.repliesCommentListItemDescription.locator('a').first().click();
    await expect(commentViewPage.getReArticleTitle).toHaveText(firstCommentCardTitle);
    const commentContent: any = await commentViewPage.getMainCommentContent.textContent();
    const commentContentWithoutSpaces: any = await commentContent.replace(/\s/g, '');
    await expect(commentContentWithoutSpaces).toContain(firstCommentCardDescriptionWitoutSpaces);
  });

  test('move to the profile page after clicking avatar of the first comment card', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardNickName: any = await profilePage.repliesCommentListItemAvatarLink
      .first()
      .getAttribute('href');

    // Click avatar of the first comment card
    await profilePage.repliesCommentListItemAvatar.first().click();
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await profilePage.page.waitForSelector(page.locator('[data-testid="post-list-item"]')['_selector']);
      await profilePage.moveToPostsTab();
      await profilePage.profilePostsTabIsSelected();
      const profilePagePostAuthor: any = await profilePage.postsPostAuthor.first().textContent();
      // Validate the comment author name is the same as autor post in the profile page in posts tab
      await expect(await firstCommentCardNickName).toContain(await profilePagePostAuthor);
    } else
      await expect(profilePage.userHasNotStartedBloggingYetMsg).toHaveText(
        "Looks like @levex hasn't started blogging yet!"
      );
  });

  test('move to the profile page after clicking nickname of the first comment card', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardNickName: any = await profilePage.repliesCommentListItemAvatarLink
      .first()
      .getAttribute('href');

    // Click nickname of the first comment card
    await profilePage.postsPostAuthor.first().click();
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await profilePage.page.waitForSelector(page.locator('[data-testid="post-list-item"]')['_selector']);
      await profilePage.moveToPostsTab();
      await profilePage.profilePostsTabIsSelected();
      const profilePagePostAuthor: any = await profilePage.postsPostAuthor.first().textContent();
      // Validate the comment author name is the same as autor post in the profile page in posts tab
      await expect(await firstCommentCardNickName).toContain(await profilePagePostAuthor);
    } else
      await expect(profilePage.userHasNotStartedBloggingYetMsg).toHaveText(
        "Looks like @levex hasn't started blogging yet!"
      );
  });

  test('move to the community page after clicking community/category link of the first comment card', async ({
    page
  }) => {
    let communityPage = new CommunitiesPage(page);

    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardCommunityName: any = await profilePage.repliesCommentListItemCommunityLink
      .first()
      .textContent();

    await profilePage.repliesCommentListItemCommunityLink.first().click();
    await expect(communityPage.communityNameTitle).toHaveText(firstCommentCardCommunityName);

    if (await !firstCommentCardCommunityName.includes('#')) {
      await expect(communityPage.communityInfoSidebar.locator('h3')).toHaveText(
        firstCommentCardCommunityName
      );
      await communityPage.quickValidataCommunitiesPageIsLoaded(firstCommentCardCommunityName);
    }
  });

  test('move to the comment view page after clicking timestamp link of the first comment card', async ({
    page
  }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardTitle: any = await profilePage.repliesCommentListItemTitle.first().textContent();
    const firstCommentCardDescription: any = await profilePage.repliesCommentListItemDescription
      .first()
      .textContent();
    const firstCommentCardDescriptionDots: any = await firstCommentCardDescription.replace(/\u2026/g, '');
    const firstCommentCardDescriptionWitoutSpaces: any = await firstCommentCardDescriptionDots.replace(
      /\s/g,
      ''
    );
    await profilePage.repliesCommentListItemTimestamp.first().click();
    await expect(commentViewPage.getReArticleTitle).toHaveText(firstCommentCardTitle);
    const commentContent: any = await commentViewPage.getMainCommentContent.textContent();
    const commentContentWithoutSpaces: any = await commentContent.replace(/\s/g, '');
    await expect(commentContentWithoutSpaces).toContain(firstCommentCardDescriptionWitoutSpaces);
  });

  test('move to the login page after clicking upvote of the first comment card', async ({ page }) => {
    let loginDialog = new LoginToVoteDialog(page);

    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    // Hover upvote button
    await profilePage.repliesCommentListItemUpvote.first().hover();
    await profilePage.page.waitForTimeout(1000);
    // Validate the tooltip message
    expect(await profilePage.repliesCommentListItemUpvoteTooltip.textContent()).toBe('UpvoteUpvote');
    // Upvote icon color
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.repliesCommentListItemUpvote.locator('svg').first(),
        'color'
      )
    ).toBe('rgb(255, 255, 255)');

    // Upvote icon background-color
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.repliesCommentListItemUpvote.locator('svg').first(),
        'background-color'
      )
    ).toBe('rgb(220, 38, 38)');

    await profilePage.repliesCommentListItemUpvote.first().click();
    await loginDialog.validateLoginToVoteDialogIsVisible();
  });

  test('move to the login page after clicking downvote of the first comment card', async ({ page }) => {
    let loginDialog = new LoginToVoteDialog(page);

    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    // Hover Downvote button
    await profilePage.repliesCommentListItemDownvote.first().hover();
    await profilePage.page.waitForTimeout(1000);
    // Validate the tooltip message
    expect(await profilePage.repliesCommentListItemDownvoteTooltip.textContent()).toBe('DownvoteDownvote');
    // Upvote icon color
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.repliesCommentListItemDownvote.locator('svg').first(),
        'color'
      )
    ).toBe('rgb(255, 255, 255)');

    // Downvote icon background-color
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.repliesCommentListItemDownvote.locator('svg').first(),
        'background-color'
      )
    ).toBe('rgb(75, 85, 99)');

    await profilePage.repliesCommentListItemDownvote.first().click();
    await loginDialog.validateLoginToVoteDialogIsVisible();
  });

  test('validate payout of the first comment card', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardPayoutText = await profilePage.repliesCommentListItemPayout.first().textContent();
    const firstCommentCardPayout = await profilePage.repliesCommentListItemPayout.first();
    // console.log('firstCommentCardPayoutText ', firstCommentCardPayoutText);

    // Validate payout is visible and color after hovering
    if (firstCommentCardPayoutText == '$0.00') {
      await expect(firstCommentCardPayout).toBeVisible();
      expect(
        await profilePage.getElementCssPropertyValue(
          await profilePage.repliesCommentListItemPayout.first(),
          'color'
        )
      ).toBe('rgb(15, 23, 42)');
    } else {
      await firstCommentCardPayout.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(profilePage.repliesCommentListItemPayoutTooltip.first()).toBeVisible();
      expect(
        await profilePage.getElementCssPropertyValue(
          await profilePage.repliesCommentListItemPayout.first(),
          'color'
        )
      ).toBe('rgb(220, 38, 38)');
    }
  });

  test('validate votes of the first comment card', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardVote = await profilePage.repliesCommentListItemVotes.nth(0);
    const firstCommentCardVoteText = await profilePage.repliesCommentListItemVotes.nth(0).textContent();

    if (Number(firstCommentCardVoteText) > 1) {
      // more than 1 vote
      await expect(firstCommentCardVote).toBeVisible();
      await firstCommentCardVote.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.repliesCommentListItemVotesTooltip.nth(0)).toContainText('votes');
    } else if (Number(firstCommentCardVoteText) == 1) {
      // equal 1 vote
      await expect(firstCommentCardVote).toBeVisible();
      await firstCommentCardVote.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.repliesCommentListItemVotesTooltip.nth(0)).toHaveText('1 vote');
    } else {
      // no vote
      await expect(firstCommentCardVote).toBeVisible();
      await firstCommentCardVote.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.repliesCommentListItemVotesTooltip.nth(0)).toHaveText('no votes');
    }
  });

  test('move to the comment view page after clicking respond', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardRespond: any = await profilePage.repliesCommentListItemRespond.first();
    const firstCommentCardTitle: any = await profilePage.repliesCommentListItemTitle.first().textContent();
    const firstCommentCardDescription: any = await profilePage.repliesCommentListItemDescription
      .first()
      .textContent();
    const firstCommentCardDescriptionDots: any = await firstCommentCardDescription.replace(/\u2026/g, '');
    const firstCommentCardDescriptionWitoutSpaces: any = await firstCommentCardDescriptionDots.replace(
      /\s/g,
      ''
    );

    await firstCommentCardRespond.click();

    await expect(commentViewPage.getReArticleTitle).toHaveText(firstCommentCardTitle);
    const commentContent: any = await commentViewPage.getMainCommentContent.textContent();
    const commentContentWithoutSpaces: any = await commentContent.replace(/\s/g, '');
    await expect(commentContentWithoutSpaces).toContain(firstCommentCardDescriptionWitoutSpaces);
  });

  test('validate styles and tooltips of response button', async ({ page }) => {
    await profilePage.gotoRepliesProfilePage('@gtg');
    await profilePage.profileRepliesTabIsSelected();

    const firstCommentCardRespond: any = await profilePage.repliesCommentListItemRespond.first();
    const firstCommentCardRespondText: any = await profilePage.repliesCommentListItemRespond
      .first()
      .textContent();

    if (Number(firstCommentCardRespondText) > 1) {
      // more than 1 responses
      await expect(firstCommentCardRespond).toBeVisible();
      await firstCommentCardRespond.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.repliesCommentListItemRespondTooltip.nth(0)).toContainText(
        'responses. Click to respond'
      );
    } else if (Number(firstCommentCardRespondText) == 1) {
      // equal 1 response
      await expect(firstCommentCardRespond).toBeVisible();
      await firstCommentCardRespond.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.repliesCommentListItemRespondTooltip.nth(0)).toHaveText(
        '1 response. Click to respond'
      );
    } else {
      // no response
      await expect(firstCommentCardRespond).toBeVisible();
      await firstCommentCardRespond.hover();
      await profilePage.page.waitForTimeout(1000);
      await expect(await profilePage.repliesCommentListItemRespondTooltip.nth(0)).toHaveText(
        'No responses. Click to respond'
      );
    }
  });
});
