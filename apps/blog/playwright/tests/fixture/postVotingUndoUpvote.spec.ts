import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { HomePage } from '../support/pages/homePage';
import {
  VOTER,
  FIRST_POST_AUTHOR,
  FIRST_POST_PERMLINK,
  REMOVE_VOTE,
  gotoTrendingLoggedIn,
  expectFirstPostUpvotedState
} from '../support/postVotingContext';

/**
 * Post voting — undo an existing upvote (§6.1 VOTE-02).
 *
 * Runs against `postVoting_upvoted/` — the first post's active_votes +
 * list_votes are patched so the UI loads in the "already upvoted by
 * {voter}" branch and clicking upvote opens the VoteRemovalDialog.
 */

test.use({
  fixtureTestName: 'postVoting_upvoted',
  authenticatedUser: {}
});

test.describe('Post voting — previously upvoted (§6.1)', () => {
  test('VOTE-02: undo an existing upvote', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);
    // Wait for list_votes to land before clicking — otherwise the
    // component renders the direct-click branch and submits a fresh
    // upvote instead of opening the removal dialog.
    await expectFirstPostUpvotedState(page);

    await new HomePage(page).getFirstPostUpvoteButton.click();

    await expect(
      page.getByTestId('vote-removal-dialog-header')
    ).toBeVisible();
    await page.getByTestId('vote-removal-dialog-ok').click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: REMOVE_VOTE
    });

    await expect(
      page.getByText('Your vote has been removed.', { exact: true })
    ).toBeVisible();
  });
});
