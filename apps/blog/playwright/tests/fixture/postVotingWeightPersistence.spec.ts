import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { VotingSlider } from '../support/pages/votingSlider';

/**
 * Post voting — vote weight persistence (§6.1 VOTE-09).
 *
 * votes-component saves the current slider percent to
 * localStorage.votesValues (via useStorageWithTTL with StorageTTL.PERMANENT)
 * right after a vote fires, and reads it back into sliderUpvote when the
 * slider popover is mounted. This test exercises the round trip: set a
 * custom slider percent, submit, reload the page, re-open the slider, and
 * assert the slider recovers the same value.
 *
 * Storage shape (per `@ui/lib/storage-with-ttl.setStorageItem`):
 *   { value: { post: { upvote: [N], downvote: [N] }, comment: {...} },
 *     expiresAt: null, createdAt: <ts> }
 */

const TARGET_PERCENT = 73;
const SLIDER_MIN = 1;
const SLIDER_MAX = 100;
const DRAG_TOLERANCE = 3;

test.use({
  fixtureTestName: 'postVoting_highHP',
  authenticatedUser: {}
});

test.describe('Post voting — weight persistence (§6.1)', () => {
  test('VOTE-09: slider weight persists across reload', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await page.goto('/trending');
    await expect(page.getByTestId('login-btn')).toBeHidden();

    const slider = new VotingSlider(page);

    // Step 1 — set custom slider value and submit vote.
    await page.getByTestId('upvote-button').first().click();
    await expect(slider.upvoteSliderModal).toBeVisible();
    await slider.moveCustomSlider(
      slider.upvoteSliderTrack,
      slider.upvoteSliderThumb,
      TARGET_PERCENT,
      SLIDER_MIN,
      SLIDER_MAX
    );
    const firstText = await slider.upvoteSliderPercentageValue.textContent();
    const firstPercent = parseInt(
      (firstText ?? '0').replace('%', '').trim(),
      10
    );
    expect(firstPercent).toBeGreaterThanOrEqual(
      TARGET_PERCENT - DRAG_TOLERANCE
    );
    expect(firstPercent).toBeLessThanOrEqual(
      TARGET_PERCENT + DRAG_TOLERANCE
    );

    await page.getByTestId('upvote-button-slider').click();
    await broadcast.waitForCount(1);

    // Step 2 — localStorage reflects the slider value. useStorageWithTTL
    // wraps the value in {value, expiresAt, createdAt}, so navigate into
    // `.value.post.upvote[0]`. Poll to allow the React effect to flush.
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

    // Step 4 — open the slider again; it should hydrate from
    // storedVotesValues rather than the DEFAULT_VOTES_VALUES of 100%.
    await page.getByTestId('upvote-button').first().click();
    await expect(slider.upvoteSliderModal).toBeVisible();
    await expect(slider.upvoteSliderPercentageValue).toHaveText(
      `${firstPercent}%`
    );
  });
});
