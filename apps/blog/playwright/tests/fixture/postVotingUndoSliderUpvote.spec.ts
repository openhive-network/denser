import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';

/**
 * Post voting — undo a slider-based upvote (§6.1 VOTE-06).
 *
 * Runs against `postVoting_highHP_upvoted/` — seeded user has high HP
 * (slider would be available for a fresh vote) AND already has a
 * slider-valued upvote (vote_percent=5000, not 10000) on the first post.
 * Clicking upvote-button therefore opens the VoteRemovalDialog (the
 * `vote_upvoted` branch wins over the `enable_slider` branch), and
 * confirming removal produces a weight=0 broadcast.
 */

const VOTER = process.env.CI_TEST_USER || 'guest4test';
const FIRST_POST_AUTHOR = 'angelica7';
const FIRST_POST_PERMLINK = 'mis-8-anos-en-hive';

test.use({
  fixtureTestName: 'postVoting_highHP_upvoted',
  authenticatedUser: {}
});

test.describe('Post voting — undo slider upvote (§6.1)', () => {
  test('VOTE-06: undo an existing slider-based upvote', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await page.goto('/trending');
    await expect(page.getByTestId('login-btn')).toBeHidden();

    await page.getByTestId('upvote-button').first().click();

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
