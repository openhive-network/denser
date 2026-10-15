import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { gotoTrendingLoggedIn, expectFirstPostSliderEnabled } from '../support/postVotingContext';

/**
 * The weight slider popover from the keyboard: the arrows, the popover, its slider and its submit
 * button are named, a downvote weight is announced as negative, and opening the popover with
 * Enter puts focus on the slider rather than on the submit button, so a second Enter does not vote.
 *
 * Fixture set: `postVoting_highHP` (voter above the slider threshold, no prior vote).
 */

test.use({
  fixtureTestName: 'postVoting_highHP',
  authenticatedUser: {}
});

test.describe('Vote weight slider keyboard access', () => {
  test('VOTE-KB-02: downvote popover opens on the slider with named controls', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);
    await expectFirstPostSliderEnabled(page, 'downvote');

    await expect(
      page.getByTestId('upvote-button').first().getByRole('button', { name: 'Upvote', exact: true })
    ).toBeVisible();
    const downvote = page
      .getByTestId('downvote-button')
      .first()
      .getByRole('button', { name: 'Downvote', exact: true });

    await downvote.focus();
    await page.keyboard.press('Enter');

    const popover = page.getByRole('dialog', { name: 'Downvote weight' });
    await expect(popover).toBeVisible();
    const slider = popover.getByRole('slider', { name: 'Downvote weight' });
    await expect(slider).toBeFocused();
    await expect(slider).toHaveAttribute('aria-valuetext', '-100%');

    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuetext', '-99%');

    await page.keyboard.press('Shift+Tab');
    await expect(popover.getByRole('button', { name: 'Submit downvote at -99%', exact: true })).toBeFocused();
    expect(broadcast.calls).toHaveLength(0);

    // The submit button's tooltip would take the first Esc.
    await page.keyboard.press('Tab');
    await expect(slider).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(downvote).toBeFocused();
  });
});
