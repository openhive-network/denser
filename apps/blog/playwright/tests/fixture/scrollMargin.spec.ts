import type { Locator } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { pressUntilOpen } from '../support/uiPrimitives';

/**
 * The 80 px kept clear of the sticky header is a scroll-margin of page-level jump targets only
 * (`:target`, `[id]`, in `@hive/tailwindcss-config`'s globals.css). A scroll-margin holds in every
 * scroll container, so on all elements it also kept a list's keyboard-highlighted option 80 px
 * below the top of the list (#1398).
 *
 * Fixtures: reuses `homeMainPage` (holds /trending; the FAQ is static markdown).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- scrollMargin
 */

test.use({ fixtureTestName: 'homeMainPage', viewport: { width: 390, height: 844 } });
test.skip(isRecordMode, 'replay-only: shares the homeMainPage recording');

const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const FAQ_PATH = `${BASE_PATH}/faq.html`;
const DHF_FIRST_ANSWER_ID = 'What_is_the_Decentralized_Hive_Fund__DHF';
/** globals.css's 5rem: the sticky header's 64 px plus a buffer */
const JUMP_TARGET_OFFSET_PX = 80;
/** Rounding of the inline target's box against the margin */
const JUMP_TARGET_TOLERANCE_PX = 4;
/** An option scrolled into view from above sits at the list's top, give or take the list's padding */
const LIST_TOP_TOLERANCE_PX = 10;

/** `focusedIndex` while the focus is on no option of the list */
const NO_OPTION = -1;
/** Re-read a moving list at a steady pace instead of expect.poll's growing back-off */
const SETTLE_POLL_INTERVALS_MS = [50];

interface IListScroll {
  scrollTop: number;
  /** The focused option's distance from the top of the list's viewport */
  focusedTop: number;
  /** The focused option's position among the list's options */
  focusedIndex: number;
}

const listScroll = (viewport: Locator) =>
  viewport.evaluate((element): IListScroll => {
    const focused = document.activeElement;
    const focusedTop = focused ? focused.getBoundingClientRect().top - element.getBoundingClientRect().top : NaN;
    const options = Array.from(element.querySelectorAll('[role="option"]'));
    const focusedIndex = focused ? options.indexOf(focused) : -1;
    return { scrollTop: element.scrollTop, focusedTop, focusedIndex };
  });

const isSameListScroll = (a: IListScroll, b: IListScroll) =>
  a.scrollTop === b.scrollTop && a.focusedTop === b.focusedTop && a.focusedIndex === b.focusedIndex;

/**
 * The list once a key press has taken effect. Radix Select moves the focus (and so scrolls the
 * list) in a zero-delay timer after the keydown, which a busy main thread runs after queued input:
 * a read right after the press sees the previous step, and the next press, still starting from the
 * old option, is lost. Waits until an option other than `leftIndex` is focused and two consecutive
 * reads agree.
 */
const settledListScroll = async (viewport: Locator, leftIndex: number): Promise<IListScroll> => {
  let read = await listScroll(viewport);
  await expect
    .poll(
      async () => {
        const previous = read;
        read = await listScroll(viewport);
        return read.focusedIndex !== NO_OPTION && read.focusedIndex !== leftIndex && isSameListScroll(previous, read);
      },
      { message: 'the focus moves to another option and the list stops scrolling', intervals: SETTLE_POLL_INTERVALS_MS }
    )
    .toBe(true);
  return read;
};

test('SCROLL-MARGIN-01 — arrowing up a scrollable Select brings the focused option to the list top', async ({
  page
}) => {
  const homePage = new HomePage(page);
  const trigger = page.getByRole('combobox').filter({ hasText: 'All posts' });
  const list = page.getByRole('listbox');
  const viewport = list.locator('[data-radix-select-viewport]');

  await page.goto('/trending');
  await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

  await pressUntilOpen(trigger, 'Enter', list);
  await page.keyboard.press('End');
  await expect.poll(async () => (await listScroll(viewport)).scrollTop).toBeGreaterThan(0);

  const optionCount = await list.getByRole('option').count();
  let focusedIndex = (await settledListScroll(viewport, NO_OPTION)).focusedIndex;
  const scrolledSteps: IListScroll[] = [];
  for (let step = 0; step < optionCount; step++) {
    await page.keyboard.press('ArrowUp');
    const state = await settledListScroll(viewport, focusedIndex);
    if (state.scrollTop === 0) break;
    scrolledSteps.push(state);
    focusedIndex = state.focusedIndex;
  }

  expect(scrolledSteps.length, 'the list still scrolls while the focus moves up').toBeGreaterThan(0);
  const closestToTop = Math.min(...scrolledSteps.map((state) => state.focusedTop));
  expect(closestToTop).toBeGreaterThanOrEqual(0);
  expect(closestToTop).toBeLessThan(LIST_TOP_TOLERANCE_PX);
});

test('SCROLL-MARGIN-02 — a hash link lands its target below the sticky header', async ({ page }) => {
  await page.goto(FAQ_PATH);
  const link = page.locator('#articleBody li').getByRole('link', { name: 'Decentralized Hive Fund (DHF)', exact: true });
  await expect(link).toHaveAttribute('href', `#${DHF_FIRST_ANSWER_ID}`);

  await link.click();
  await expect(page).toHaveURL(new RegExp(`#${DHF_FIRST_ANSWER_ID}$`));

  const target = page.locator(`[id="${DHF_FIRST_ANSWER_ID}"]`);
  await expect
    .poll(() => target.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBeGreaterThanOrEqual(JUMP_TARGET_OFFSET_PX - JUMP_TARGET_TOLERANCE_PX);
  await expect
    .poll(() => target.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBeLessThanOrEqual(JUMP_TARGET_OFFSET_PX + JUMP_TARGET_TOLERANCE_PX);
  await expect(page.getByRole('banner')).toBeVisible();
});
