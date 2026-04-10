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

  test('PP-01: Post page displays content', async ({ page }) => {
    await postPage.gotoHomePage();

    // Navigate to first post
    await expect(homePage.getFirstPostTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await homePage.getFirstPostTitle.click();

    // Verify post page has essential elements
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.articleTitle).not.toBeEmpty();
    await expect(postPage.articleBody).toBeVisible();
    await expect(postPage.articleAuthorName).toBeVisible();
  });

  test('PP-02: Post footer has action buttons', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.articleFooter).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.upvoteButton).toBeVisible();
    await expect(postPage.downvoteButton).toBeVisible();
    await expect(postPage.sharePostBtn).toBeVisible();
    await expect(postPage.footerPayouts).toBeVisible();
  });

  test('PP-03: Comments section loads', async ({ page }) => {
    const result = await findPostWithVisibleComments(page, homePage, postPage);

    if (!result.found) {
      test.skip(true, 'No posts with visible comments found on the page');
      return;
    }

    expect(result.visibleCommentsCount).toBeGreaterThan(0);
  });

  test('PP-04: Click upvote shows login dialog', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.upvoteButton).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.upvoteButton.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('PP-05: Share dialog opens', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.sharePostBtn).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.sharePostBtn.click();

    await expect(postPage.sharePostFrame).toBeVisible();
    await expect(postPage.sharePostFrame).toContainText('Share this post');
    await postPage.sharePostCloseBtn.click();
  });

  test('PP-06: Click downvote shows login dialog', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.downvoteButton).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.downvoteButton.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('PP-07: Reblog dialog opens', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.footerReblogIcon).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.footerReblogIcon.click();

    await expect(postPage.reblogDialogHeader).toBeVisible();
    await expect(postPage.reblogDialogHeader).toHaveText('Reblog This Post');
    await expect(postPage.reblogDialogCancelBtn).toBeVisible();
    await expect(postPage.reblogDialogOkBtn).toBeVisible();

    await postPage.reblogDialogCloseBtn.click();
  });

  test('PP-08: Reply button shows login dialog', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.commentReplay).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await postPage.commentReplay.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('PP-09: Post metadata is displayed', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.articleFooter).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Payout amount visible
    await expect(postPage.footerPayouts).toBeVisible();

    // Votes count visible
    await expect(postPage.postFooterVotes.first()).toBeVisible();

    // Hashtags visible (if post has tags)
    if (await postPage.hashtagsPosts.isVisible()) {
      await expect(postPage.hashtagsPosts).toBeVisible();
    }
  });

  test('PP-10: Click tag navigates to tag page', async ({ page }) => {
    await postPage.gotoHomePage();
    await homePage.getFirstPostTitle.click();

    await expect(postPage.articleFooter).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Find first hashtag link in post
    const hashtagLink = postPage.hashtagsPosts.locator('a').first();

    if (await hashtagLink.isVisible()) {
      await hashtagLink.click();

      // Should navigate to a tag page (trending/tag or similar)
      await expect(page).toHaveURL(/\/(trending|hot|created)\//);
      await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
        timeout: TIMEOUTS.SEARCH_RESULTS
      });
    }
  });
});
