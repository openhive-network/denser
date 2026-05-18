import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import {
  gotoOwnPostLoggedIn,
  enterEditMode
} from '../support/postEditingContext';

/**
 * §3 EDIT-03b — payout option restriction when the post has received votes.
 *
 * Fixture overlay `postEditOwn_voted` patches `net_rshares > 0` on the post.
 * PostPublishingSection (line 163) only renders the `<SelectItem value="0%">`
 * ("Decline Payout") when `!post_s || post_s.net_rshares <= 0`, so we expect
 * exactly two options in the edit-mode reward select.
 *
 * No broadcast — this is a render-only assertion. Installing the interceptor
 * anyway is cheap insurance against accidental fires (e.g. submit-on-Enter
 * regressions).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postEditPayoutVoted
 */

test.use({ fixtureTestName: 'postEditOwn_voted', authenticatedUser: {} });

test.describe('Post editing — payout restrictions when voted (§3 EDIT-03b)', () => {
  test('EDIT-03b: post with votes → reward select hides "Decline Payout"', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoOwnPostLoggedIn(page);
    await enterEditMode(page);

    const editor = new PostEditorPage(page);
    await editor.getEditRewardTypeSelect.click();
    await expect(editor.getEditRewardTypeOptions).toHaveCount(2);
    await expect(
      page.getByRole('option', { name: /50%\s*hbd\s*\/\s*50%\s*hp/i })
    ).toBeVisible();
    await expect(page.getByRole('option', { name: /power up/i })).toBeVisible();
    await expect(
      page.getByRole('option', { name: /decline payout/i })
    ).toHaveCount(0);

    expect(broadcast.calls).toHaveLength(0);
  });
});
