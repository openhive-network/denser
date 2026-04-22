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
 * Post voting — slider downvote (§6.1 VOTE-07).
 *
 * Mirror of VOTE-05 for the downvote arrow. The captured broadcast
 * carries a negative weight proportional to the actual slider landing.
 */

test.use({
  fixtureTestName: 'postVoting_highHP',
  authenticatedUser: {}
});

test.describe('Post voting — slider downvote (§6.1)', () => {
  test('VOTE-07: downvote with custom slider weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);

    await new HomePage(page).getFirstPostDownvoteButton.click();

    const slider = new VotingSlider(page);
    await expect(slider.downvoteSliderModal).toBeVisible();

    await slider.moveCustomSlider(
      slider.downvoteSliderTrack,
      slider.downvoteSliderThumb,
      SLIDER_TARGET_PERCENT,
      SLIDER_MIN,
      SLIDER_MAX
    );

    // Label is rendered as `-{sliderDownvote}%` while the underlying
    // state is positive — take absolute value and sign-flip for weight.
    const percentText =
      await slider.downvoteSliderPercentageValue.textContent();
    const sliderPercent = Math.abs(
      parseInt((percentText ?? '0').replace('%', '').trim(), 10)
    );
    expect(sliderPercent).toBeGreaterThanOrEqual(
      SLIDER_TARGET_PERCENT - SLIDER_DRAG_TOLERANCE
    );
    expect(sliderPercent).toBeLessThanOrEqual(
      SLIDER_TARGET_PERCENT + SLIDER_DRAG_TOLERANCE
    );

    await page.getByTestId('downvote-button-slider').click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: -sliderPercent * BASIS_POINTS_PER_PERCENT
    });

    await expect(
      page.getByText('You have successfully downvoted.', { exact: true })
    ).toBeVisible();
  });
});
