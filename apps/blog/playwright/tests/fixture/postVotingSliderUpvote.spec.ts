import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { HomePage } from '../support/pages/homePage';
import { VotingSlider } from '../support/pages/votingSlider';
import {
  VOTER,
  FIRST_POST_AUTHOR,
  FIRST_POST_PERMLINK,
  SLIDER_MIN,
  SLIDER_MAX,
  SLIDER_TARGET_PERCENT,
  SLIDER_DRAG_TOLERANCE,
  BASIS_POINTS_PER_PERCENT,
  gotoTrendingLoggedIn
} from '../support/postVotingContext';

/**
 * Post voting — slider upvote (§6.1 VOTE-05).
 *
 * Runs against `postVoting_highHP/` — a variant with inflated
 * `vesting_shares` so `net_vests > 1M` and the slider popover renders
 * instead of the one-click upvote button. Drag snaps to integers
 * within ±1-2 of target, so the test reads the displayed percent and
 * uses it for the TX-04 weight assertion.
 */

test.use({
  fixtureTestName: 'postVoting_highHP',
  authenticatedUser: {}
});

test.describe('Post voting — slider upvote (§6.1)', () => {
  test('VOTE-05: upvote with custom slider weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);

    await new HomePage(page).getFirstPostUpvoteButton.click();

    const slider = new VotingSlider(page);
    await expect(slider.upvoteSliderModal).toBeVisible();

    await slider.moveCustomSlider(
      slider.upvoteSliderTrack,
      slider.upvoteSliderThumb,
      SLIDER_TARGET_PERCENT,
      SLIDER_MIN,
      SLIDER_MAX
    );

    const percentText = await slider.upvoteSliderPercentageValue.textContent();
    const sliderPercent = parseInt(
      (percentText ?? '0').replace('%', '').trim(),
      10
    );
    expect(sliderPercent).toBeGreaterThanOrEqual(
      SLIDER_TARGET_PERCENT - SLIDER_DRAG_TOLERANCE
    );
    expect(sliderPercent).toBeLessThanOrEqual(
      SLIDER_TARGET_PERCENT + SLIDER_DRAG_TOLERANCE
    );

    await page.getByTestId('upvote-button-slider').click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: sliderPercent * BASIS_POINTS_PER_PERCENT
    });

    await expect(
      page.getByText('You have successfully upvoted.', { exact: true })
    ).toBeVisible();
  });
});
