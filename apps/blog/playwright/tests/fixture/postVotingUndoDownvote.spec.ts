import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';

/**
 * Post voting — undo an existing downvote (§6.1 VOTE-04).
 *
 * Runs against `postVoting_downvoted/` — a variant generated from the base
 * `postVoting/` fixtures, with first post's active_votes + list_votes
 * patched so the UI loads in the "already downvoted by {voter}" branch
 * and clicking downvote opens the VoteRemovalDialog.
 *
 * Regenerate variants after any re-record of the base:
 *   node playwright/tests/support/fixture-auth/generate-voted-variants.mjs
 */

const VOTER = process.env.CI_TEST_USER || 'guest4test';
const FIRST_POST_AUTHOR = 'angelica7';
const FIRST_POST_PERMLINK = 'mis-8-anos-en-hive';

test.use({
  fixtureTestName: 'postVoting_downvoted',
  authenticatedUser: {}
});

test.describe('Post voting — previously downvoted (§6.1)', () => {
  test('VOTE-04: undo an existing downvote', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await page.goto('/trending');
    await expect(page.getByTestId('login-btn')).toBeHidden();

    await page.getByTestId('downvote-button').first().click();

    await expect(
      page.getByTestId('vote-removal-dialog-header')
    ).toBeVisible();
    await page.getByTestId('vote-removal-dialog-ok').click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: 0
    });

    await expect(
      page.getByText('Your vote has been removed.', { exact: true })
    ).toBeVisible();
  });
});
