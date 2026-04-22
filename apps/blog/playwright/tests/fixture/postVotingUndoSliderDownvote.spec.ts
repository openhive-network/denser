import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';

/**
 * Post voting — undo a slider-based downvote (§6.1 VOTE-08).
 *
 * Mirror of VOTE-06 for the downvote arrow. Fixture variant seeds a
 * prior slider-based downvote (vote_percent=-5000), so clicking
 * downvote-button opens VoteRemovalDialog.
 */

const VOTER = process.env.CI_TEST_USER || 'guest4test';
const FIRST_POST_AUTHOR = 'angelica7';
const FIRST_POST_PERMLINK = 'mis-8-anos-en-hive';

test.use({
  fixtureTestName: 'postVoting_highHP_downvoted',
  authenticatedUser: {}
});

test.describe('Post voting — undo slider downvote (§6.1)', () => {
  test('VOTE-08: undo an existing slider-based downvote', async ({
    page
  }) => {
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
