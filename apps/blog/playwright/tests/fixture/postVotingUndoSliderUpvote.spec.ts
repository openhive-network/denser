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
 * Post voting — undo a slider-based upvote (§6.1 VOTE-06).
 *
 * Seeded user has high HP (slider would be available for a fresh vote)
 * AND already has a slider-valued upvote (vote_percent=5000, not 10000).
 * The "already upvoted" branch wins over the slider branch, so clicking
 * upvote opens the VoteRemovalDialog and confirming produces a
 * weight=0 broadcast.
 */

test.use({
  fixtureTestName: 'postVoting_highHP_upvoted',
  authenticatedUser: {}
});

test.describe('Post voting — undo slider upvote (§6.1)', () => {
  test('VOTE-06: undo an existing slider-based upvote', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);
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
