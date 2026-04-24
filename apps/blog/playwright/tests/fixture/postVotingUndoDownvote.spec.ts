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
  expectFirstPostDownvotedState
} from '../support/postVotingContext';

/**
 * Post voting — undo an existing downvote (§6.1 VOTE-04).
 *
 * Runs against `postVoting_downvoted/` — first post's active_votes +
 * list_votes are patched so the UI loads in the "already downvoted by
 * {voter}" branch and clicking downvote opens the VoteRemovalDialog.
 */

test.use({
  fixtureTestName: 'postVoting_downvoted',
  authenticatedUser: {}
});

test.describe('Post voting — previously downvoted (§6.1)', () => {
  test('VOTE-04: undo an existing downvote', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);
    await expectFirstPostDownvotedState(page);

    await new HomePage(page).getFirstPostDownvoteButton.click();

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
