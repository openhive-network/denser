import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import {
  VOTER,
  gotoPostLoggedIn,
  expectFirstCommentUpvotedState
} from '../support/commentVotingContext';

/**
 * A logged-in reader (the `observer` cookie plus localStorage `user`) still sees their
 * own vote on a post: the first comment of the HF25 post is upvoted by {voter} in the
 * `commentVoting_upvoted` recording, so its upvote button renders filled, while a
 * comment the reader has not voted on stays unfilled.
 */

test.use({ fixtureTestName: 'commentVoting_upvoted', authenticatedUser: {} });

test('LOGGED-STATE-01: a logged-in post page renders the reader\'s vote state', async ({ page, context }) => {
  const observerCookie = (await context.cookies()).find((cookie) => cookie.name === 'observer');
  expect(observerCookie?.value).toBe(VOTER);

  await gotoPostLoggedIn(page);
  await expectFirstCommentUpvotedState(page);

  const postPage = new PostPage(page);
  await expect(postPage.commentCardsFooterUpvotes.nth(1).locator('svg')).not.toHaveClass(
    /(?:^|\s)text-white(?:\s|$)/
  );
});
