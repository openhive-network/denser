import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { PostPage } from '../../support/pages/postPage';
import { LoginForm } from '../../support/pages/loginForm';
import { TIMEOUTS } from '../../support/constants';
import { findPostWithVisibleComments } from '../../support/commentsTestHelper';

test.describe('Post page tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
  });

  test('PP-01: Post page displays full article content', async ({ page }) => {
    await postPage.gotoHomePage();

    await expect(homePage.getFirstPostTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const feedAuthor = (await homePage.getFirstPostAuthor.textContent())?.trim().replace('@', '');
    await homePage.getFirstPostTitle.click();

    // Article structure: title, author, body
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.articleTitle).not.toBeEmpty();
    await expect(postPage.articleAuthorName).toBeVisible();
    await expect(postPage.articleAuthorName).toContainText(feedAuthor ?? '');

    // Body should have real content
    await expect(postPage.articleBody).toBeVisible();
    const bodyHtml = await postPage.articleBody.innerHTML();
    expect(bodyHtml.trim().length).toBeGreaterThan(10);

    // Author metadata section should be visible
    await expect(postPage.articleAuthorData).toBeVisible();
  });

  test('PP-02: Post footer has all action buttons and metadata', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.articleFooter).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Action buttons
    await expect(postPage.upvoteButton).toBeVisible();
    await expect(postPage.downvoteButton).toBeVisible();
    await expect(postPage.footerReblogIcon).toBeVisible();
    await expect(postPage.sharePostBtn).toBeVisible();

    // Metadata
    await expect(postPage.footerPayouts).toBeVisible();
    await expect(postPage.postFooterVotes.first()).toBeVisible();

    // Footer author should be visible and non-empty
    await expect(postPage.footerAuthorName).toBeVisible();
    const footerAuthor = await postPage.footerAuthorName.textContent();
    expect(footerAuthor?.trim().length).toBeGreaterThan(0);

    // Social media share icons
    await expect(postPage.facebookIcon).toBeVisible();
    await expect(postPage.twitterIcon).toBeVisible();
    await expect(postPage.linkedinIcon).toBeVisible();
    await expect(postPage.redditIcon).toBeVisible();
  });

  test('PP-03: Comments section loads', async ({ page }) => {
    const result = await findPostWithVisibleComments(page, homePage, postPage);

    if (!result.found) {
      test.skip(true, 'No posts with visible comments found on the page');
      return;
    }

    expect(result.visibleCommentsCount).toBeGreaterThan(0);
  });

  test('PP-04: Upvote as anonymous user shows login dialog', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.upvoteButton).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.upvoteButton.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(loginForm.loginFormDescription).toHaveText('Save your posting key by filling form below');
  });

  test('PP-05: Share dialog shows all sharing options', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.sharePostBtn).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.sharePostBtn.click();

    await expect(postPage.sharePostFrame).toBeVisible();
    await expect(postPage.sharePostFrame).toContainText('Share this post');

    // Dialog should contain URL-related content
    const dialogText = await postPage.sharePostFrame.textContent();
    expect(dialogText).toContain('URL to this post');

    await postPage.sharePostCloseBtn.click();
    await expect(postPage.sharePostFrame).not.toBeVisible();
  });

  test('PP-06: Downvote as anonymous user shows login dialog', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.downvoteButton).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.downvoteButton.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('PP-07: Reblog dialog shows confirmation with cancel and OK', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.footerReblogIcon).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.footerReblogIcon.click();

    // Dialog with proper content
    await expect(postPage.reblogDialogHeader).toBeVisible();
    await expect(postPage.reblogDialogHeader).toHaveText('Reblog This Post');
    await expect(postPage.reblogDialogDescription).toBeVisible();
    await expect(postPage.reblogDialogDescription).toHaveText(
      'This post will be added to your blog and shared with your followers.'
    );

    // Action buttons
    await expect(postPage.reblogDialogCancelBtn).toBeVisible();
    await expect(postPage.reblogDialogOkBtn).toBeVisible();
    await expect(postPage.reblogDialogCloseBtn).toBeVisible();

    // Cancel closes the dialog
    await postPage.reblogDialogCancelBtn.click();
    await expect(postPage.reblogDialogHeader).not.toBeVisible();
  });

  test('PP-08: Reply as anonymous user shows login dialog', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.commentReplay).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.commentReplay.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('PP-09: Post footer shows payout, votes and hashtags', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.articleFooter).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Payout should have dollar format
    await expect(postPage.footerPayouts).toBeVisible();
    const payoutText = await postPage.footerPayouts.textContent();
    expect(payoutText).toMatch(/\$\d+/);

    // Votes count should be visible and numeric
    await expect(postPage.postFooterVotes.first()).toBeVisible();
    const votesText = await postPage.postFooterVotes.first().textContent();
    expect(votesText?.trim()).toMatch(/\d+/);

    // Hashtags visible (if post has tags)
    if (await postPage.hashtagsPosts.isVisible()) {
      const tagsText = await postPage.hashtagsPosts.textContent();
      expect(tagsText?.trim().length).toBeGreaterThan(0);
    }
  });

  test('PP-10: Clicking hashtag navigates to tag feed with posts', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.articleFooter).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const hashtagLink = postPage.hashtagsPosts.locator('a').first();

    if (await hashtagLink.isVisible()) {
      const tagText = await hashtagLink.textContent();
      await hashtagLink.click();

      // Should navigate to a tag page with posts
      await expect(page).toHaveURL(/\/(trending|hot|created)\//);
      await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
        timeout: TIMEOUTS.SEARCH_RESULTS
      });

      // Tag page should have posts
      const postsCount = await homePage.getMainTimeLineOfPosts.count();
      expect(postsCount).toBeGreaterThan(0);
    }
  });

  test('PP-11: Author popover card shows profile info on click', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.articleAuthorName).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.articleAuthorName.click();

    // Popover card should appear with user info
    await expect(postPage.userPopoverCard).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.popoverCardUserAvatar).toBeVisible();
    await expect(postPage.userFollowersPopoverCard).toBeVisible();
    await expect(postPage.userFollowingPopoverCard).toBeVisible();
    await expect(postPage.buttonFollowPopoverCard).toBeVisible();

    // Followers/following should have numeric content
    const followersText = await postPage.userFollowersPopoverCard.textContent();
    expect(followersText).toMatch(/\d+/);
  });
});
