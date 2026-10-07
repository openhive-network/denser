import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import {
  gotoPostLoggedIn,
  firstCommentUpvoteButton,
  expectFirstCommentUpvotedState
} from '../support/commentVotingContext';

/**
 * A logged-in reader's own vote renders on a post without a vote lookup per comment.
 *
 * Runs against `commentVoting_upvoted/`: the observer (seeded through the `observer`
 * cookie and the localStorage user) has upvoted the post's first comment, which its
 * `active_votes` entry in `bridge.get_discussion` carries. The vote's direction comes
 * from there; `database_api.list_votes` is asked only for the vote's percent, once the
 * button's tooltip opens.
 */

test.use({
  fixtureTestName: 'commentVoting_upvoted',
  authenticatedUser: {}
});

function countListVotesRequests(page: Page): () => number {
  let count = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && (request.postData() ?? '').includes('"database_api.list_votes"')) count++;
  });
  return () => count;
}

test('LOGGED-STATE-01: the observer\'s comment upvote renders on load, with no list_votes request', async ({ page }) => {
  const listVotesRequests = countListVotesRequests(page);
  await gotoPostLoggedIn(page);
  await expectFirstCommentUpvotedState(page);
  await page.waitForLoadState('networkidle');
  expect(listVotesRequests()).toBe(0);

  await firstCommentUpvoteButton(new PostPage(page)).hover();
  await expect(page.getByTestId('upvote-button-tooltip').first()).toContainText('Undo your upvote');
  await expect.poll(listVotesRequests).toBe(1);
  await expectFirstCommentUpvotedState(page);
});
