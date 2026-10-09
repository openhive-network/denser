import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';
import { testTimeout } from '../../../../../playwright/support/timeouts';

/**
 * Helpers for the specs that drive the Radix and cmdk primitives of `@hive/ui` (dialogs, alert
 * dialogs, dropdown menus, selects) the way a user does: mouse and keyboard, focus trap and
 * focus return, and no console noise while doing it.
 */

/** More Tab presses than any of the covered dialogs has focusable elements, so focus has to wrap. */
const TAB_PRESSES = 8;

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

/**
 * A resource the offline run cannot fetch: anything off the blog and the fixture proxy (images,
 * the HiveSense probe; see fixture/CLAUDE.md). Chromium logs each as a console error.
 */
const isOfflineLoadFailure = (text: string, url: string) =>
  text.startsWith('Failed to load resource: net::') && !LOCAL_HOSTS.includes(new URL(url).hostname);

/**
 * Collects, from now on, every console error and warning and every uncaught page error, except the
 * failed loads of off-origin resources the offline run cannot reach. React reports its warnings
 * (and Radix its missing-title/description checks) through console.error / console.warn, so an
 * empty list means none of them fired.
 */
export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const { url } = msg.location();
    if (url && isOfflineLoadFailure(msg.text(), url)) return;
    problems.push(`[${msg.type()}] ${msg.text()} (${url})`);
  });
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`));
  return problems;
}

/**
 * Clicks `trigger` until `opened` is visible. A click that lands before hydration attached the
 * handlers is lost (see "Wait for hydration" in fixture/CLAUDE.md), so the first one is retried.
 */
export async function clickUntilOpen(trigger: Locator, opened: Locator): Promise<void> {
  await expect(async () => {
    await trigger.click();
    await expect(opened).toBeVisible({ timeout: testTimeout('retry-open-visible', 1000) });
  }).toPass({ timeout: TIMEOUTS.HYDRATION });
}

/** Focuses `trigger` and presses `key` until `opened` is visible (same hydration race as above). */
export async function pressUntilOpen(trigger: Locator, key: string, opened: Locator): Promise<void> {
  await expect(async () => {
    await trigger.focus();
    await trigger.press(key);
    await expect(opened).toBeVisible({ timeout: testTimeout('retry-open-visible', 1000) });
  }).toPass({ timeout: TIMEOUTS.HYDRATION });
}

const focusIsInside = (container: Locator) =>
  container.evaluate((element) => element.contains(document.activeElement));

/** Tabs forwards, then backwards, past the end of `container` and expects focus never to leave it. */
export async function expectFocusTrappedIn(page: Page, container: Locator): Promise<void> {
  expect(await focusIsInside(container), 'focus moved into the opened element').toBe(true);
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let press = 0; press < TAB_PRESSES; press++) {
      await page.keyboard.press(key);
      expect(await focusIsInside(container), `focus left the opened element after ${key} #${press + 1}`).toBe(
        true
      );
    }
  }
}

/** Clicks the page's top-left corner, outside any centred dialog or anchored popup. */
export async function clickOutside(page: Page): Promise<void> {
  await page.mouse.click(2, 2);
}
