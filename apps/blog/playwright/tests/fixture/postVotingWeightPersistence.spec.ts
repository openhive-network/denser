import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { HomePage } from '../support/pages/homePage';
import { VotingSlider } from '../support/pages/votingSlider';
import {
  SLIDER_MIN,
  SLIDER_MAX,
  SLIDER_TARGET_PERCENT,
  SLIDER_DRAG_TOLERANCE,
  gotoTrendingLoggedIn
} from '../support/postVotingContext';

/**
 * Post voting — vote weight persistence (§6.1 VOTE-09).
 *
 * votes-component saves the current slider percent to
 * localStorage.votesValues via useStorageWithTTL with StorageTTL.PERMANENT,
 * and reads it back into sliderUpvote when the slider popover mounts.
 * This test exercises the round trip: set a custom percent, submit,
 * reload, re-open the slider, assert it recovers the same value.
 *
 * Storage shape (per `@ui/lib/storage-with-ttl.setStorageItem`):
 *   { value: { post: { upvote: [N], downvote: [N] }, comment: {...} },
 *     expiresAt: null, createdAt: <ts> }
 */

test.use({
  fixtureTestName: 'postVoting_highHP',
  authenticatedUser: {}
});

test.describe('Post voting — weight persistence (§6.1)', () => {
  test('VOTE-09: slider weight persists across reload', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoTrendingLoggedIn(page);

    const homePage = new HomePage(page);
    const slider = new VotingSlider(page);

    // Step 1 — set custom slider value and submit vote.
    await homePage.getFirstPostUpvoteButton.click();
    await expect(slider.upvoteSliderModal).toBeVisible();
    await slider.moveCustomSlider(
      slider.upvoteSliderTrack,
      slider.upvoteSliderThumb,
      SLIDER_TARGET_PERCENT,
      SLIDER_MIN,
      SLIDER_MAX
    );
    const firstText = await slider.upvoteSliderPercentageValue.textContent();
    const firstPercent = parseInt(
      (firstText ?? '0').replace('%', '').trim(),
      10
    );
    expect(firstPercent).toBeGreaterThanOrEqual(
      SLIDER_TARGET_PERCENT - SLIDER_DRAG_TOLERANCE
    );
    expect(firstPercent).toBeLessThanOrEqual(
      SLIDER_TARGET_PERCENT + SLIDER_DRAG_TOLERANCE
    );

    await page.getByTestId('upvote-button-slider').click();
    await broadcast.waitForCount(1);

    // Step 2 — localStorage reflects the slider value. useStorageWithTTL
    // wraps in {value, expiresAt, createdAt}; poll to let the effect flush.
    await page.waitForFunction(
      (expected) => {
        const raw = window.localStorage.getItem('votesValues');
        if (!raw) return false;
        try {
          const parsed = JSON.parse(raw);
          return parsed?.value?.post?.upvote?.[0] === expected;
        } catch {
          return false;
        }
      },
      firstPercent
    );

    // Step 3 — reload wipes in-memory state but localStorage persists.
    // The seeder's addInitScript re-seeds user+wif on every navigation;
    // it does not touch `votesValues`, so the stored percent survives.
    await page.reload();
    await expect(page.getByTestId('login-btn')).toBeHidden();

    // Step 4 — open the slider again; it should hydrate from stored
    // value rather than the DEFAULT_VOTES_VALUES of 100%.
    await homePage.getFirstPostUpvoteButton.click();
    await expect(slider.upvoteSliderModal).toBeVisible();
    await expect(slider.upvoteSliderPercentageValue).toHaveText(
      `${firstPercent}%`
    );
  });
});
