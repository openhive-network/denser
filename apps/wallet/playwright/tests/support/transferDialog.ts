import { expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from './basePath';
import { STUB_ACCOUNT, STUB_FOLLOWED } from './walletApiStub';

const HYDRATION_TIMEOUT = 30_000;

/**
 * Opens the owner's transfer dialog from the HIVE balance menu, retried until hydration attached
 * the handlers. The user must be logged in as STUB_ACCOUNT (`logInAsStubAccount`).
 */
export const openTransferDialog = async (page: Page): Promise<Locator> => {
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

/** Fills a transfer of 1 HIVE to STUB_FOLLOWED with `memo`. */
export const fillTransfer = async (dialog: Locator, memo: string) => {
  const recipient = dialog.locator('input[cmdk-input]');
  await recipient.fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
  await expect(recipient).toHaveValue(STUB_FOLLOWED);
  await dialog.getByPlaceholder('Amount').fill('1');
  await dialog.getByPlaceholder('Memo').fill(memo);
};

export const confirmDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Confirm Transfer To Account' });

/**
 * Records the memos of the transfers the page broadcasts (`network_broadcast_api.broadcast_transaction`),
 * as sent on the wire; the array fills as requests are made.
 */
export const captureBroadcastMemos = (page: Page): string[] => {
  const memos: string[] = [];
  page.on('request', (request) => {
    const body = request.postData();
    if (!body?.includes('broadcast_transaction')) return;
    const { params } = JSON.parse(body);
    for (const operation of params.trx.operations) memos.push(operation.value.memo);
  });
  return memos;
};
