import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startWalletApiStub } from '../support/walletApiStub';

/**
 * The header's menu panel lists each item as one link: no link wraps a button (or the reverse),
 * so a keyboard user reaches every item with a single Tab. The API answers come from the stub
 * node (support/walletApiStub.ts).
 */

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// Without a network Chromium reports navigator.onLine === false and React Query pauses every
// query; report online, as anonymousNoWasm.spec.ts does.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

test.describe('Wallet menu panel', () => {
  test('WALLET-MENU-01 — menu items are single links, one Tab stop each', async ({ page }) => {
    await page.goto(`${WALLET_BASE_PATH}/market`);

    const trigger = page.getByTestId('nav-sidebar-menu-button');
    const menu = page.getByTestId('nav-sidebar-menu-content');
    await expect(async () => {
      await trigger.click();
      await menu.waitFor({ state: 'visible', timeout: 5000 });
    }).toPass({ timeout: 20000, intervals: [1000, 2000, 3000] });

    await expect(menu.locator('a button, button a, a a, button button')).toHaveCount(0);
    const focusablePerItem = await menu
      .locator('li')
      .evaluateAll((items) =>
        items.map((item) => item.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])').length)
      );
    expect(focusablePerItem.length).toBeGreaterThan(0);
    expect(focusablePerItem.every((count) => count <= 1)).toBe(true);

    await menu.getByRole('link', { name: 'Vote for Witnesses' }).focus();
    await page.keyboard.press('Tab');
    await expect(menu.getByRole('link', { name: 'Hive Proposals' })).toBeFocused();

    const developerPortal = menu.getByRole('link', { name: 'Developer Portal' });
    await expect(developerPortal).toHaveAttribute('target', '_blank');
    await expect(developerPortal).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
