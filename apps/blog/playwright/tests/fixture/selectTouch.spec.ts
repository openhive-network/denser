import type { Locator, Page } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { tapUntilOpen } from '../support/uiPrimitives';

/**
 * The feed sort and community Selects (Radix Select 2) driven by touch, as on a phone. For a touch pointer Radix
 * opens the trigger and selects an option on the `click` the browser derives from the tap, so
 * anything that cancels the tap's `touchend` turns an option tap into a no-op. Plain mouse clicks
 * and synthetic pointer events never fire touch events, so only a touch-enabled context with real
 * taps covers it. The community list is long enough to scroll inside its viewport, so it also needs
 * a finger drag (raw CDP touch events) to move the list, which a cancelled `touchstart` blocks.
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

const SWIPE_STEPS = 10;
const SWIPE_STEP_PX = 20;

/**
 * Drags one finger upwards across `element`, as a phone user scrolls a list down. Raw CDP touch
 * events go through the browser's touch input pipeline, so a cancelled `touchstart` blocks the
 * scroll as it does on a phone (`Input.synthesizeScrollGesture` does not scroll in headless here).
 */
async function swipeUp(page: Page, element: Locator): Promise<void> {
  const box = await element.boundingBox();
  expect(box, 'the swiped element has a layout box').not.toBeNull();
  if (!box) return;
  const x = box.x + box.width / 2;
  let y = box.y + box.height - SWIPE_STEP_PX;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 0; step < SWIPE_STEPS; step++) {
    y -= SWIPE_STEP_PX;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('UI-SELECT-TOUCH-02 — the scrollable community select scrolls and takes taps on a touch screen', async ({
  page
}) => {
  const homePage = new HomePage(page);
  const trigger = page.getByRole('combobox').filter({ hasText: 'All posts' });
  const list = page.getByRole('listbox');
  const viewport = list.locator('[data-radix-select-viewport]');

  await page.goto('/hot');
  await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

  await tapUntilOpen(trigger, list);

  const scrollState = () =>
    viewport.evaluate((element) => ({
      overflow: element.scrollHeight - element.clientHeight,
      scrollTop: element.scrollTop
    }));
  const before = await scrollState();
  expect(before.overflow, 'the community list overflows its viewport').toBeGreaterThan(0);
  expect(before.scrollTop).toBe(0);

  await swipeUp(page, viewport);
  await expect.poll(async () => (await scrollState()).scrollTop).toBeGreaterThan(0);

  // "All posts" leads to /trending, the other page this recording holds.
  await page.getByRole('option', { name: 'All posts' }).tap();

  await expect(list).toBeHidden();
  await expect(page).toHaveURL(/\/trending$/);
});
