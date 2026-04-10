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
});
