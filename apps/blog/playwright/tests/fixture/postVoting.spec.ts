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
  FULL_UPVOTE,
  FULL_DOWNVOTE,
  gotoTrendingLoggedIn
} from '../support/postVotingContext';

/**
 * Post voting — fresh state (§6.1 VOTE-01, VOTE-03).
 *
 * First-broadcast flows: user hasn't voted on the first trending post
 * yet, clicks the up/down arrow, captured broadcast is validated against
 * TX-04 (voter/author/permlink/weight) and the success toast appears.
 *
 * Record:  pnpm --filter @hive/blog test:fixture:record -- postVoting.spec
 *          node playwright/tests/support/fixture-auth/generate-voted-variants.mjs
 * Replay:  pnpm --filter @hive/blog test:fixture -- postVoting.spec
 */

test.use({ fixtureTestName: 'postVoting', authenticatedUser: {} });

test.describe('Post voting — fresh state (§6.1)', () => {
  test('VOTE-01: upvote a post with default weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);

    await new HomePage(page).getFirstPostUpvoteButton.click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: FULL_UPVOTE
    });

    // `exact: true` scopes to the visible toast <div> — without it, an
    // aria-live announcement also matches as a substring (strict-mode).
    await expect(
      page.getByText('You have successfully upvoted.', { exact: true })
    ).toBeVisible();
  });

  test('VOTE-03: downvote a post with default weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);

    await new HomePage(page).getFirstPostDownvoteButton.click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: FULL_DOWNVOTE
    });

    await expect(
      page.getByText('You have successfully downvoted.', { exact: true })
    ).toBeVisible();
  });
});
