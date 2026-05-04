import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  VOTER,
  REMOVE_VOTE,
  gotoPostLoggedIn,
  readFirstCommentIdent,
  firstCommentDownvoteButton,
  expectFirstCommentDownvotedState
} from '../support/commentVotingContext';

/**
 * Comment voting — undo an existing downvote (§6.2 VOTE-C04).
 *
 * Runs against `commentVoting_downvoted/` — the first comment's
 * active_votes (in bridge.get_discussion) and its list_votes response
 * are patched so the UI loads in the "already downvoted by {voter}"
 * branch and clicking downvote opens the VoteRemovalDialog.
 */

test.use({
  fixtureTestName: 'commentVoting_downvoted',
  authenticatedUser: {}
});

test.describe('Comment voting — previously downvoted (§6.2)', () => {
  test('VOTE-C04: undo an existing comment downvote', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);
    await expectFirstCommentDownvotedState(page);
    const postPage = new PostPage(page);
    const { author, permlink } = await readFirstCommentIdent(postPage);

    // See note in commentVotingUndoUpvote.spec.ts about `force: true`.
    await firstCommentDownvoteButton(postPage).click({ force: true });

    await expect(
      page.getByTestId('vote-removal-dialog-header')
    ).toBeVisible();
    await page.getByTestId('vote-removal-dialog-ok').click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author,
      permlink,
      weight: REMOVE_VOTE
    });

    await expect(
      page.getByText('Your vote has been removed.', { exact: true })
    ).toBeVisible();
  });
});
