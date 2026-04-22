import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { VotingSlider } from '../support/pages/votingSlider';

/**
 * Post voting — slider upvote (§6.1 VOTE-05).
 *
 * Runs against `postVoting_highHP/` — a variant with inflated
 * `vesting_shares` on the seeded user so `net_vests > 1M` and the UI
 * renders the slider popover instead of the one-click upvote button.
 *
 * Drag approach reuses the existing `VotingSlider.moveCustomSlider` POM
 * (mouse drag on the track). The drag lands within ~1 integer step of the
 * target, so we read the actual displayed percent and use it for the
 * TX-04 weight assertion rather than pinning it to the target value.
 *
 * Regenerate the variant after any re-record of the base:
 *   node playwright/tests/support/fixture-auth/generate-voted-variants.mjs
 */

const VOTER = process.env.CI_TEST_USER || 'guest4test';
const FIRST_POST_AUTHOR = 'angelica7';
const FIRST_POST_PERMLINK = 'mis-8-anos-en-hive';

const TARGET_PERCENT = 73;
const SLIDER_MIN = 1;
const SLIDER_MAX = 100;
const DRAG_TOLERANCE = 3; // mouse drag may snap ±1-2 around target

test.use({
  fixtureTestName: 'postVoting_highHP',
  authenticatedUser: {}
});

test.describe('Post voting — slider upvote (§6.1)', () => {
  test('VOTE-05: upvote with custom slider weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await page.goto('/trending');
    await expect(page.getByTestId('login-btn')).toBeHidden();

    await page.getByTestId('upvote-button').first().click();

    const slider = new VotingSlider(page);
    await expect(slider.upvoteSliderModal).toBeVisible();

    await slider.moveCustomSlider(
      slider.upvoteSliderTrack,
      slider.upvoteSliderThumb,
      TARGET_PERCENT,
      SLIDER_MIN,
      SLIDER_MAX
    );

    // Read the actual slider value post-drag — Radix snaps to integers
    // and the drag can land a step or two off target.
    const percentText = await slider.upvoteSliderPercentageValue.textContent();
    const sliderPercent = parseInt(
      (percentText ?? '0').replace('%', '').trim(),
      10
    );
    expect(sliderPercent).toBeGreaterThanOrEqual(
      TARGET_PERCENT - DRAG_TOLERANCE
    );
    expect(sliderPercent).toBeLessThanOrEqual(
      TARGET_PERCENT + DRAG_TOLERANCE
    );

    await page.getByTestId('upvote-button-slider').click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: sliderPercent * 100
    });

    await expect(
      page.getByText('You have successfully upvoted.', { exact: true })
    ).toBeVisible();
  });
});
