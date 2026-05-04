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
  firstCommentUpvoteButton,
  expectFirstCommentUpvotedState
} from '../support/commentVotingContext';

/**
 * Comment voting — undo an existing upvote (§6.2 VOTE-C03).
 *
 * Runs against `commentVoting_upvoted/` — the first comment's
 * active_votes (in bridge.get_discussion) and its list_votes response
 * are patched so the UI loads in the "already upvoted by {voter}"
 * branch and clicking upvote opens the VoteRemovalDialog.
 */

test.use({
  fixtureTestName: 'commentVoting_upvoted',
  authenticatedUser: {}
});

test.describe('Comment voting — previously upvoted (§6.2)', () => {
  test('VOTE-C03: undo an existing comment upvote', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);
    // Wait for list_votes to land before clicking — otherwise the
    // component renders the direct-click branch and submits a fresh
    // upvote instead of opening the removal dialog.
    await expectFirstCommentUpvotedState(page);
    const postPage = new PostPage(page);
    const { author, permlink } = await readFirstCommentIdent(postPage);

    // `force: true` bypasses Playwright's hover-before-click step. In
    // headed mode that hover triggers Radix's Tooltip, which (intermittently)
    // ends up positioned over the click target and intercepts the click —
    // so the AlertDialogTrigger never fires and VoteRemovalDialog never
    // opens. Headless never reproduced this since hover is synthetic.
    await firstCommentUpvoteButton(postPage).click({ force: true });

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
