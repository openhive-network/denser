import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';

/**
 * Post voting — fresh state (§6.1 VOTE-01, VOTE-03).
 *
 * First-broadcast vote flows: user hasn't voted on the first trending post
 * yet, clicks the up/down arrow, captured broadcast is validated against
 * TX-04 (voter, author, permlink, weight) and the UI shows the success
 * toast. The "already voted" cases (VOTE-02, VOTE-04) live in their own
 * spec files because `fixtureTestName` is worker-scoped.
 *
 * Record:  pnpm --filter @hive/blog test:fixture:record -- postVoting.spec
 *          node playwright/tests/support/fixture-auth/generate-voted-variants.mjs
 * Replay:  pnpm --filter @hive/blog test:fixture -- postVoting.spec
 */

const VOTER = process.env.CI_TEST_USER || 'guest4test';
const FIRST_POST_AUTHOR = 'angelica7';
const FIRST_POST_PERMLINK = 'mis-8-anos-en-hive';

test.use({ fixtureTestName: 'postVoting', authenticatedUser: {} });

test.describe('Post voting — fresh state (§6.1)', () => {
  test('VOTE-01: upvote a post with default weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await page.goto('/trending');
    // Wait for App Router hydration so post cards render in their
    // logged-in branch (see loggedInHomepage.spec for the rationale).
    await expect(page.getByTestId('login-btn')).toBeHidden();

    await page.getByTestId('upvote-button').first().click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: 10000
    });

    // `exact: true` scopes to the visible toast <div> — without it, an
    // aria-live announcement ("Notification Vote successfulYou have…")
    // also matches as a substring and triggers strict-mode violation.
    await expect(
      page.getByText('You have successfully upvoted.', { exact: true })
    ).toBeVisible();
  });

  test('VOTE-03: downvote a post with default weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await page.goto('/trending');
    await expect(page.getByTestId('login-btn')).toBeHidden();

    await page.getByTestId('downvote-button').first().click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: -10000
    });

    await expect(
      page.getByText('You have successfully downvoted.', { exact: true })
    ).toBeVisible();
  });
});
