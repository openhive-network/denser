import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Checks for the responses counter (💬 N) on post cards and in the post footer: it must be one
 * link, not a tooltip `<button>` wrapping links, named with the count, with a decorative icon.
 */

export async function readResponsesCount(link: Locator): Promise<number> {
  const text = (await link.textContent())?.trim() ?? '';
  expect(text).toMatch(/^\d+$/);
  return Number(text);
}

export async function expectSingleNamedResponsesLink(link: Locator, count: number) {
  expect(await link.evaluate((el) => el.tagName)).toBe('A');
  expect(await link.evaluate((el) => el.parentElement?.closest('a, button') ?? null)).toBeNull();
  await expect(link.locator('a, button')).toHaveCount(0);
  const countText = count === 0 ? 'No responses' : `${count} responses?`;
  await expect(link).toHaveAttribute('aria-label', new RegExp(`^${countText}\\. Open comments$`));
  await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
}

/** Tab leaves the link and Shift+Tab returns straight to it: no extra stop around or inside it. */
export async function expectSingleTabStop(page: Page, link: Locator) {
  await link.focus();
  await page.keyboard.press('Tab');
  expect(await link.evaluate((el) => el.contains(document.activeElement))).toBe(false);
  await page.keyboard.press('Shift+Tab');
  await expect(link).toBeFocused();
}
