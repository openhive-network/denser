import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';

/**
 * The wallet tabs are a named nav landmark that marks the current tab and keeps keyboard focus on
 * the activated tab across the client-side navigation; the Keys & Permissions page has one h1, an
 * h2 per key and an h3 per permission list. Reads come from the stub node (support/walletApiStub.ts).
 */

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.use({ locale: 'en-US' });

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

test.describe('Wallet tabs accessibility', () => {
  test('WALLET-A11Y-TABS-01 — the active tab is marked and keeps focus after Enter', async ({ page }) => {
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    const walletNav = page.getByRole('navigation', { name: 'Wallet' });
    const balances = walletNav.getByRole('link', { name: 'Balances' });
    await expect(balances).toHaveAttribute('aria-current', 'page');
    await expect(walletNav.locator('[aria-current="page"]')).toHaveCount(1);

    await walletNav.getByRole('link', { name: 'Delegations' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`**/@${STUB_ACCOUNT}/delegations`);

    const delegations = page
      .getByRole('navigation', { name: 'Wallet' })
      .getByRole('link', { name: 'Delegations' });
    await expect(delegations).toHaveAttribute('aria-current', 'page');
    await expect(delegations).toBeFocused();
  });

  test('WALLET-A11Y-TABS-02 — Keys & Permissions has one h1, an h2 per key and an h3 per permission list', async ({
    page
  }) => {
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/permissions`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(['Keys & Permissions']);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Posting Key',
      'Active Key',
      'Owner Key',
      'Memo Key',
      'Public keys'
    ]);
    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      'Posting Key permissions',
      'Active Key permissions',
      'Owner Key permissions',
      'Memo Key permissions'
    ]);
  });
});
