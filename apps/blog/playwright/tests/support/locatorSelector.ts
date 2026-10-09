import type { Locator } from '@playwright/test';

/**
 * The selector string a Playwright locator resolves, for APIs that take a selector rather than a
 * locator (`page.waitForSelector`). Reads Playwright's internal `_selector` field, which its public
 * types do not declare; throws if a Playwright upgrade removes it.
 */
export function locatorSelector(locator: Locator): string {
  if ('_selector' in locator && typeof locator._selector === 'string') return locator._selector;
  throw new Error('Playwright Locator no longer exposes _selector');
}
