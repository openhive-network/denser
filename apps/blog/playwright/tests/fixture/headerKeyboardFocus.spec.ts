import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';

/**
 * Keyboard focus in the signed-in header, wide and narrow: every Tab stop is a visible element with
 * a name, not nested in another link or button, and shows the Button's focus ring (a box-shadow, no
 * browser outline);
 * the avatar's ring surrounds its Resource Credits ring; and no header tooltip stays open once focus
 * has left the header.
 *
 * Fixtures: reuses `accountSwitchLogout`, which loads the same page for a signed-in user.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- headerKeyboardFocus
 */

const PAGE_WITH_HEADER = '/faq.html';
const WIDE = { width: 1491, height: 900 };
const NARROW = { width: 375, height: 667 };
/** More Tab stops than the header has */
const MAX_HEADER_STOPS = 30;

test.use({
  fixtureTestName: 'accountSwitchLogout',
  authenticatedUser: { strict: true, authenticateOnBackend: true }
});

interface TabStop {
  name: string;
  width: number;
  height: number;
  nestedIn: string | null;
  /** A browser outline is drawn (Tailwind's `outline-none` is a transparent one) */
  hasOutline: boolean;
  boxShadow: string;
}

/** Reads the focused element, by what a keyboard user gets from it */
function readFocused(page: Page): Promise<TabStop> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) throw new Error('nothing is focused');
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const outer = element.parentElement?.closest('a, button');
    return {
      name: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim(),
      width: rect.width,
      height: rect.height,
      nestedIn: outer ? outer.outerHTML.slice(0, 80) : null,
      hasOutline: style.outlineStyle !== 'none' && style.outlineColor !== 'rgba(0, 0, 0, 0)',
      boxShadow: style.boxShadow
    };
  });
}

/** The open tooltips that do not describe the focused element */
const tooltipsOfOthers = (page: Page) =>
  page.evaluate(() => {
    const describedBy = document.activeElement?.getAttribute('aria-describedby')?.split(' ') ?? [];
    return [...document.querySelectorAll('[role="tooltip"]')]
      .filter((tooltip) => !describedBy.includes(tooltip.id))
      .map((tooltip) => tooltip.textContent);
  });

const focusIsInHeader = (page: Page) => page.evaluate(() => document.activeElement?.closest('header') !== null);

/** Tabs from the logo through the header, reading each stop, until focus leaves it */
async function tabThroughHeader(page: Page): Promise<TabStop[]> {
  const stops: TabStop[] = [];
  // Reached by keyboard, as every later stop is, so it matches :focus-visible
  await page.locator('header a[href="/"]').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  for (let i = 0; i < MAX_HEADER_STOPS && (await focusIsInHeader(page)); i++) {
    stops.push(await readFocused(page));
    await page.keyboard.press('Tab');
  }
  expect(await focusIsInHeader(page)).toBe(false);
  return stops;
}

async function openHeader(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(PAGE_WITH_HEADER);
  await expect(page.getByTestId('profile-avatar-button')).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await expect(page.getByTestId('nav-pencil')).toHaveAttribute('href', '/submit.html');
}

for (const [layout, viewport] of [
  ['wide', WIDE],
  ['narrow', NARROW]
] as const) {
  test(`A11Y-HEADER-FOCUS-01 (${layout}) — each header Tab stop is visible, named, not nested and shows a ring`, async ({
    page
  }) => {
    await openHeader(page, viewport);

    const stops = await tabThroughHeader(page);
    expect(stops.map((stop) => stop.name)).toEqual(expect.arrayContaining(['Create Post', 'Menu Panel']));
    expect(stops.filter((stop) => stop.name === 'Create Post')).toHaveLength(1);
    for (const stop of stops) {
      expect(stop.width, stop.name).toBeGreaterThan(0);
      expect(stop.height, stop.name).toBeGreaterThan(0);
      expect(stop.name).not.toBe('');
      expect(stop.nestedIn, stop.name).toBeNull();
    }
    // A text field shows its caret; every other stop shows the ring
    for (const stop of stops.filter((stop) => !/search/i.test(stop.name) || stop.boxShadow !== 'none')) {
      expect(stop.hasOutline, stop.name).toBe(false);
      expect(stop.boxShadow, stop.name).not.toBe('none');
    }
    // Focus has moved on: a tooltip still open is the focused element's own, none of the header's
    expect(await tooltipsOfOthers(page)).toEqual([]);
  });
}

test('A11Y-HEADER-FOCUS-02 (narrow) — search is one Tab stop, a link named Search', async ({ page }) => {
  await openHeader(page, NARROW);

  const search = page.getByTestId('navbar-search-link');
  await expect(search).toHaveAttribute('href', '/search');
  await expect(search).toHaveAccessibleName(/search/i);
  await expect(search.locator('a, button')).toHaveCount(0);
});

test('A11Y-HEADER-FOCUS-03 (wide) — the narrow header search link is hidden, not an empty Tab stop', async ({
  page
}) => {
  await openHeader(page, WIDE);

  await expect(page.getByTestId('navbar-search-link')).toBeHidden();
});

test('A11Y-HEADER-FOCUS-04 — the avatar focus ring surrounds its Resource Credits ring', async ({ page }) => {
  await openHeader(page, WIDE);
  const avatar = page.getByTestId('profile-avatar-button');

  await page.getByTestId('nav-pencil').focus();
  await page.keyboard.press('Tab');
  await expect(avatar).toBeFocused();

  const { ringInnerRadius, rcRingRadius } = await avatar.evaluate((button) => {
    // `<offset> 0 0 <offset px>, <ring> 0 0 <offset + width px>, <none> 0 0 0`: the ring starts where the offset ends
    const spreads = [...getComputedStyle(button).boxShadow.matchAll(/0px 0px 0px (\d+(?:\.\d+)?)px/g)]
      .map((match) => Number(match[1]))
      .filter((spread) => spread > 0);
    const visibleRings = [...button.children].filter(
      (child) =>
        child instanceof HTMLElement &&
        getComputedStyle(child).visibility === 'visible' &&
        child.style.borderRadius === '50%'
    );
    return {
      ringInnerRadius: button.getBoundingClientRect().width / 2 + Math.min(...spreads),
      rcRingRadius: Math.max(...visibleRings.map((ring) => ring.getBoundingClientRect().width / 2))
    };
  });
  expect(rcRingRadius).toBeGreaterThan(0);
  expect(ringInnerRadius).toBeGreaterThan(rcRingRadius);
});
