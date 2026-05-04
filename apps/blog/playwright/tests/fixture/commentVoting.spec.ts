import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  VOTER,
  FULL_UPVOTE,
  FULL_DOWNVOTE,
  gotoPostLoggedIn,
  readFirstCommentIdent,
  firstCommentUpvoteButton,
  firstCommentDownvoteButton
} from '../support/commentVotingContext';

/**
 * Comment voting — fresh state (§6.2 VOTE-C01, VOTE-C02).
 *
 * First-broadcast flows: user hasn't voted on the first comment of the
 * target post yet, clicks the up/down arrow in the comment-card-footer,
 * captured broadcast is validated against TX-04 (voter/author/permlink/
 * weight) and the success toast appears.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- commentVoting.spec
 *          node playwright/tests/support/fixture-auth/generate-voted-variants.mjs
 * Replay:  pnpm --filter @hive/blog test:fixture -- commentVoting.spec
 */

test.use({ fixtureTestName: 'commentVoting', authenticatedUser: {} });

test.describe('Comment voting — fresh state (§6.2)', () => {
  test('VOTE-C01: upvote a comment with default weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);
    const postPage = new PostPage(page);
    const { author, permlink } = await readFirstCommentIdent(postPage);

    await firstCommentUpvoteButton(postPage).click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author,
      permlink,
      weight: FULL_UPVOTE
    });

    await expect(
      page.getByText('You have successfully upvoted.', { exact: true })
    ).toBeVisible();
  });

  test('VOTE-C02: downvote a comment with default weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);
    const postPage = new PostPage(page);
    const { author, permlink } = await readFirstCommentIdent(postPage);

    await firstCommentDownvoteButton(postPage).click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author,
      permlink,
      weight: FULL_DOWNVOTE
    });

    await expect(
      page.getByText('You have successfully downvoted.', { exact: true })
    ).toBeVisible();
  });
});
