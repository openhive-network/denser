import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  stubTransfer
} from '../support/walletApiStub';

/**
 * The recipient suggestions of the Delegate RC dialog list an account that is both in the
 * transfer history and followed once, with its transfer count, and close once the typed text is a
 * suggested account in full. The stub node's history holds one transfer from STUB_FOLLOWED, the
 * one account STUB_ACCOUNT follows.
 */

const HYDRATION_TIMEOUT = 30_000;
const DIALOG_NAME = 'Delegate RC';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, undefined, {
    [`/hivemind-api/accounts/${STUB_ACCOUNT}/operations`]: () => ({
      total_operations: 1,
      total_pages: 1,
      block_range: { from: 1, to: 100_000_000 },
      operations_result: [stubTransfer({ from: STUB_FOLLOWED, operationId: '429492434051907584' })]
    })
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

const openDelegateRcDialog = async (page: Page) => {
  await logInAsStubAccount(page);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  const trigger = page.getByRole('button', { name: DIALOG_NAME, exact: true });
  const dialog = page.getByRole('dialog', { name: DIALOG_NAME, exact: true });
  await expect(async () => {
    await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return dialog;
};

test.describe('Recipient suggestions', () => {
  test('WALLET-SUGGEST-01 — a followed account with transfers is suggested once, with its transfer count', async ({
    page
  }) => {
    const dialog = await openDelegateRcDialog(page);
    const recipient = dialog.getByRole('combobox', { name: 'To Account' });

    await recipient.fill('stub-f');

    await expect(dialog.getByRole('option', { name: `${STUB_FOLLOWED} (1 previous transfer)` })).toBeVisible();
    await expect(dialog.getByRole('option', { name: new RegExp(`^${STUB_FOLLOWED} `) })).toHaveCount(1);
  });

  test('WALLET-SUGGEST-02 — typing a suggested account in full closes the suggestions', async ({ page }) => {
    const dialog = await openDelegateRcDialog(page);
    const recipient = dialog.getByRole('combobox', { name: 'To Account' });
    const suggestion = dialog.getByRole('option', { name: `${STUB_FOLLOWED} (1 previous transfer)` });

    await recipient.fill('stub-f');
    await expect(suggestion).toBeVisible();

    await recipient.fill(STUB_FOLLOWED);

    await expect(suggestion).toBeHidden();
    await expect(recipient).toHaveAttribute('aria-expanded', 'false');
    await expect(recipient).toHaveValue(STUB_FOLLOWED);
    await expect(dialog).toBeVisible();
  });
});
