import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * Logged out, the vote arrows are named buttons in the Tab order that open the login dialog from
 * the keyboard, and closing the dialog with Esc returns focus to the arrow that opened it.
 *
 * Fixture set: `postDetail` (anonymous post page).
 */

test.use({ fixtureTestName: 'postDetail' });

const POST_URL = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';

test.describe('Logged-out vote arrows', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
    await page.goto(POST_URL, { waitUntil: 'load' });
    await postPage.waitForPostHydration();
    await page.waitForLoadState('networkidle');
  });

  test('VOTE-ANON-01: post and comment arrows are named buttons', async () => {
    await expect(postPage.upvoteButton.getByRole('button', { name: 'Upvote', exact: true })).toBeVisible();
    await expect(postPage.downvoteButton.getByRole('button', { name: 'Downvote', exact: true })).toBeVisible();
    await expect(
      postPage.commentCardsFooterUpvotes.first().getByRole('button', { name: 'Upvote', exact: true })
    ).toBeVisible();
    await expect(
      postPage.commentCardsFooterDownvotes.first().getByRole('button', { name: 'Downvote', exact: true })
    ).toBeVisible();
  });

  test('VOTE-ANON-02: Tab reaches the arrows, Enter and Space open login, Esc returns focus', async ({
    page
  }) => {
    const upvote = postPage.upvoteButton.getByRole('button', { name: 'Upvote', exact: true });
    const downvote = postPage.downvoteButton.getByRole('button', { name: 'Downvote', exact: true });
    const loginDialog = page.getByTestId('login-dialog');

    await upvote.focus();
    await page.keyboard.press('Tab');
    await expect(downvote).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(upvote).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(loginDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(loginDialog).toBeHidden();
    await expect(upvote).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(downvote).toBeFocused();
    await page.keyboard.press('Space');
    await expect(loginDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(loginDialog).toBeHidden();
    await expect(downvote).toBeFocused();
  });
});
