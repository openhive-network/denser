import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { tapUntilOpen } from '../support/uiPrimitives';

/**
 * The feed sort Select (Radix Select 2) driven by touch, as on a phone. For a touch pointer Radix
 * opens the trigger and selects an option on the `click` the browser derives from the tap, so
 * anything that cancels the tap's `touchend` turns an option tap into a no-op. Plain mouse clicks
 * and synthetic pointer events never fire touch events, so only a touch-enabled context with real
 * taps covers it.
 *
 * Fixtures: reuses `homeMainPage` (holds /trending and /hot), as uiPrimitivesAnonymous.spec.ts does.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- selectTouch
 */

test.use({ fixtureTestName: 'homeMainPage', hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
test.skip(isRecordMode, 'replay-only: shares the homeMainPage recording');

test('UI-SELECT-TOUCH-01 — tapping a feed sort option on a touch screen applies it', async ({ page }) => {
  const homePage = new HomePage(page);
  const trigger = homePage.getFilterPosts;
  const list = homePage.getFilterPostsList;

  await page.goto('/trending');
  await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

  await tapUntilOpen(trigger, list);

  await page.getByRole('option', { name: 'Hot' }).tap();

  await expect(list).toBeHidden();
  await expect(page).toHaveURL(/\/hot$/);
  await expect(trigger).toHaveText('Hot');
});
