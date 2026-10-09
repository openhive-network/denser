import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, STUB_FOLLOWED, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';

/**
 * The transfer dialog's guard against a memo that leaks a private key or a master password: the
 * Next button stays disabled and a warning shows until the user ticks the override, and nothing is
 * broadcast meanwhile. The API answers come from the stub node (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;

const WIF = '5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
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

/** Opens the owner's transfer dialog from the HIVE balance menu, retried until hydration attached the handlers. */
const openTransferDialog = async (page: Page): Promise<Locator> => {
  await logInAsStubAccount(page);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  const menuTrigger = page.getByTestId('wallet-hive-value').getByRole('button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await menuTrigger.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await menu.getByText('Transfer', { exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Transfer To Account', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};

const fillTransfer = async (dialog: Locator, memo: string) => {
  const recipient = dialog.locator('input[cmdk-input]');
  await recipient.fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
  await expect(recipient).toHaveValue(STUB_FOLLOWED);
  await dialog.getByPlaceholder('Amount').fill('1');
  await dialog.getByPlaceholder('Memo').fill(memo);
};

const confirmDialog = (page: Page) => page.getByRole('dialog', { name: 'Confirm Transfer To Account' });

test.describe('Transfer dialog memo secret guard', () => {
  test('WALLET-MEMO-01 — a private key in the memo blocks Next until the override is ticked', async ({ page }) => {
    const dialog = await openTransferDialog(page);
    await fillTransfer(dialog, `here is my key ${WIF}`);

    const warning = dialog.getByTestId('memo-secret-warning');
    const next = dialog.getByRole('button', { name: 'Next' });
    await expect(warning).toContainText('looks like a private key');
    await expect(next).toBeDisabled();
    await expect(confirmDialog(page)).toBeHidden();

    await warning.getByText('I understand this memo is public').click();
    await expect(warning.getByRole('checkbox')).toBeChecked();
    await expect(next).toBeEnabled();
    expect(broadcasts, 'nothing is broadcast before the override').toEqual([]);

    await next.click();
    await expect(confirmDialog(page)).toBeVisible();
    expect(broadcasts, 'reaching the confirm step broadcasts nothing').toEqual([]);
  });

  test('WALLET-MEMO-02 — editing the memo after the override asks for it again', async ({ page }) => {
    const dialog = await openTransferDialog(page);
    await fillTransfer(dialog, `P${WIF}`);

    const warning = dialog.getByTestId('memo-secret-warning');
    const next = dialog.getByRole('button', { name: 'Next' });
    await expect(warning).toContainText('looks like a master password');
    await warning.getByText('I understand this memo is public').click();
    await expect(next).toBeEnabled();

    await dialog.getByPlaceholder('Memo').fill(`my password P${WIF}`);
    await expect(warning.getByRole('checkbox')).not.toBeChecked();
    await expect(next).toBeDisabled();

    await dialog.getByPlaceholder('Memo').fill('thanks for the coffee');
    await expect(warning).toBeHidden();
    await expect(next).toBeEnabled();
    expect(broadcasts).toEqual([]);
  });

  test('WALLET-MEMO-03 — an ordinary memo shows no warning and goes straight to the confirm step', async ({ page }) => {
    const dialog = await openTransferDialog(page);
    await fillTransfer(dialog, 'thanks for the coffee');

    await expect(dialog.getByTestId('memo-secret-warning')).toBeHidden();
    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(confirmDialog(page)).toBeVisible();
    expect(broadcasts).toEqual([]);
  });
});
