import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';
import { STUB_KEYS, stubAccountKeys } from '../support/accountKeys';
import enWallet from '../../../locales/en/common_wallet.json';

/**
 * The Authorities page marks the key the session signs with, refuses a role its weights cannot
 * sign for, and asks in a dialog of its own before a change that takes away the session's key. The
 * session is a WIF session signed in with STUB_ACCOUNT's active key, the active role's only key;
 * the API answers come from the stub node (support/accountKeys.ts). Nothing is signed or broadcast.
 */

const HYDRATION_TIMEOUT = 30_000;
const PAGE = enWallet.authorities_page;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, stubAccountKeys());
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

let broadcasts: string[];

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  broadcasts = [];
  page.on('request', (request) => {
    if (request.postData()?.includes('broadcast_transaction')) broadcasts.push(request.url());
  });
});

async function editActiveAuthority(page: Page) {
  await logInAsStubAccount(page, { loginType: 'wif', keyType: 'active' });
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/authorities`);
  await page
    .getByRole('button', { name: PAGE.edit_item.replace('{{name}}', PAGE.active_authority) })
    .click({ timeout: HYDRATION_TIMEOUT });
}

test.describe('Authorities lockout protection', () => {
  test("WALLET-AUTHORITIES-01 — the session's key is marked", async ({ page }) => {
    await logInAsStubAccount(page, { loginType: 'wif', keyType: 'active' });
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/authorities`);
    await page.getByTestId('authority-toggle-active').click({ timeout: HYDRATION_TIMEOUT });
    await page.getByTestId('authority-toggle-posting').click();

    await expect(page.getByTestId('key-mark-session')).toHaveCount(1, { timeout: HYDRATION_TIMEOUT });
    await expect(page.getByTestId('key-mark-session')).toHaveText(enWallet.account_keys.this_session);
  });

  test('WALLET-AUTHORITIES-02 — a threshold the weights cannot reach blocks the update', async ({ page }) => {
    await editActiveAuthority(page);
    const threshold = page.locator('#threshold-active');
    await threshold.fill('2');
    await page.keyboard.press('Tab');

    await expect(page.getByTestId('authority-problems')).toHaveText(
      PAGE.problems.unreachable_threshold
        .replace('{{authority}}', PAGE.active_authority)
        .replace('{{threshold}}', '2')
        .replace('{{total}}', '1')
    );
    await expect(page.getByRole('button', { name: PAGE.update_authority })).toBeDisabled();
    expect(broadcasts).toEqual([]);
  });

  test("WALLET-AUTHORITIES-03 — replacing the session's key asks in a dialog before anything is signed", async ({
    page
  }) => {
    await editActiveAuthority(page);
    await page.locator(`input[value="${STUB_KEYS.active.publicKey}"]`).fill(STUB_KEYS.memo.publicKey);
    // Leaving the field applies the edit
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name: PAGE.update_authority }).click();

    const dialog = page.getByTestId('authority-lockout-dialog');
    await expect(dialog).toContainText(PAGE.lockout.session_key);
    await dialog.getByRole('button', { name: PAGE.cancel }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(broadcasts).toEqual([]);
  });
});
