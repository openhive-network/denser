import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import {
  gotoOwnPostLoggedIn,
  enterEditMode
} from '../support/postEditingContext';

/**
 * §3 EDIT-03c — payout finalised (max_accepted_payout === 0).
 *
 * Fixture overlay `postEditOwn_finalized` sets `max_accepted_payout` to
 * `"0.000 HBD"`. PostPublishingSection.tsx:122-125 short-circuits the
 * reward Select for that condition and renders a read-only line
 * ("Reward options are final") instead.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postEditPayoutFinalized
 */

test.use({
  fixtureTestName: 'postEditOwn_finalized',
  authenticatedUser: {}
});

test.describe('Post editing — payout finalized (§3 EDIT-03c)', () => {
  test('EDIT-03c: max_accepted_payout=0 → reward select replaced with read-only message', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoOwnPostLoggedIn(page);
    await enterEditMode(page);

    const editor = new PostEditorPage(page);
    await expect(editor.getRewardOptionsFinalText).toBeVisible();
    await expect(editor.getEditRewardTypeSelect).toHaveCount(0);

    expect(broadcast.calls).toHaveLength(0);
  });
});
