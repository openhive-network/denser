import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectVoteOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { VotingSlider } from '../support/pages/votingSlider';

/**
 * Post voting — slider downvote (§6.1 VOTE-07).
 *
 * Mirror of VOTE-05 for the downvote arrow. Uses the same high-HP fixture
 * variant (seeded user has enough VESTS to render the slider popover).
 * The captured broadcast should carry a negative weight proportional to
 * the actual slider landing (mouse drag snaps to integers).
 */

const VOTER = process.env.CI_TEST_USER || 'guest4test';
const FIRST_POST_AUTHOR = 'angelica7';
const FIRST_POST_PERMLINK = 'mis-8-anos-en-hive';

const TARGET_PERCENT = 73;
const SLIDER_MIN = 1;
const SLIDER_MAX = 100;
const DRAG_TOLERANCE = 3;

test.use({
  fixtureTestName: 'postVoting_highHP',
  authenticatedUser: {}
});

test.describe('Post voting — slider downvote (§6.1)', () => {
  test('VOTE-07: downvote with custom slider weight', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await page.goto('/trending');
    await expect(page.getByTestId('login-btn')).toBeHidden();

    await page.getByTestId('downvote-button').first().click();

    const slider = new VotingSlider(page);
    await expect(slider.downvoteSliderModal).toBeVisible();

    await slider.moveCustomSlider(
      slider.downvoteSliderTrack,
      slider.downvoteSliderThumb,
      TARGET_PERCENT,
      SLIDER_MIN,
      SLIDER_MAX
    );

    // The downvote percent label is rendered as `-{sliderDownvote}%`
    // (hardcoded minus in votes-component.tsx) while the underlying
    // sliderDownvote state is positive. Take absolute value so we work
    // with the magnitude and sign-flip when building the expected weight.
    const percentText =
      await slider.downvoteSliderPercentageValue.textContent();
    const sliderPercent = Math.abs(
      parseInt((percentText ?? '0').replace('%', '').trim(), 10)
    );
    expect(sliderPercent).toBeGreaterThanOrEqual(
      TARGET_PERCENT - DRAG_TOLERANCE
    );
    expect(sliderPercent).toBeLessThanOrEqual(
      TARGET_PERCENT + DRAG_TOLERANCE
    );

    await page.getByTestId('downvote-button-slider').click();

    await broadcast.waitForCount(1);
    expectVoteOperation(broadcast.calls[0], {
      voter: VOTER,
      author: FIRST_POST_AUTHOR,
      permlink: FIRST_POST_PERMLINK,
      weight: -sliderPercent * 100
    });

    await expect(
      page.getByText('You have successfully downvoted.', { exact: true })
    ).toBeVisible();
  });
});
