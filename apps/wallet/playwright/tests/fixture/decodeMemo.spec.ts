import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installKeychainStub, keychainCalls } from '../support/keychainStub';
import { ENCRYPTED_MEMO, PLAINTEXT_MEMO, RECIPIENT_MEMO_WIF } from '../support/memoKeys';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  STUB_TRANSFER_SENDER,
  logInAsStubAccount,
  startWalletApiStub,
  stubTransfer
} from '../support/walletApiStub';

/**
 * An encrypted memo (`#…`) in the account history shows a placeholder instead of the ciphertext,
 * and, in the owner's own history, a Decode button: with the MEMO private key (real decryption of a
 * memo encrypted between generated key pairs, support/memoKeys.ts) or with a stubbed Keychain.
 * The reads come from the stub node (support/walletApiStub.ts); the history through `page.route`.
 */

const UNRELATED_WIF = '5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  await page.route(new RegExp(`/hivemind-api/accounts/${STUB_ACCOUNT}/operations\\?`), (route) =>
    route.fulfill({
      json: {
        total_operations: 1,
        total_pages: 1,
        block_range: { from: 1, to: 100_000_000 },
        operations_result: [
          stubTransfer({
            from: STUB_TRANSFER_SENDER,
            operationId: '429492434051907584',
            memo: ENCRYPTED_MEMO
          })
        ]
      },
      headers: { 'access-control-allow-origin': '*' }
    })
  );
});

const encodedMemoCell = (page: Page) => page.getByTestId('wallet-account-history-encoded-memo');
const decodeDialog = (page: Page) => page.getByRole('dialog', { name: 'Decode MEMO message' });

/** Opens STUB_ACCOUNT's history and the Decode dialog of its encrypted memo, retried until hydration attached the handlers. */
const openDecodeDialog = async (page: Page) => {
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  await expect(encodedMemoCell(page)).toContainText('Encrypted memo');
  await expect(encodedMemoCell(page)).not.toContainText(ENCRYPTED_MEMO);
  await expect(async () => {
    await encodedMemoCell(page).getByTestId('decode-memo-trigger').click();
    await expect(decodeDialog(page)).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  return decodeDialog(page);
};

test.describe('Encrypted memos in the account history', () => {
  test('WALLET-MEMO-DEC-01 — the owner decodes a memo with the MEMO private key', async ({ page }) => {
    await logInAsStubAccount(page);
    const dialog = await openDecodeDialog(page);

    await dialog.getByLabel('MEMO private key').fill(RECIPIENT_MEMO_WIF);
    await dialog.getByRole('button', { name: 'Decode with private key' }).click();

    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue(PLAINTEXT_MEMO);
  });

  test('WALLET-MEMO-DEC-02 — a MEMO key of neither party shows an error and decodes nothing', async ({
    page
  }) => {
    await logInAsStubAccount(page);
    const dialog = await openDecodeDialog(page);

    await dialog.getByLabel('MEMO private key').fill(UNRELATED_WIF);
    await dialog.getByRole('button', { name: 'Decode with private key' }).click();

    await expect(dialog).toContainText('Error decoding MEMO');
    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue('');
  });

  test('WALLET-MEMO-DEC-03 — logged in with Keychain, the memo is decoded by Keychain on opening', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'keychain' });
    await installKeychainStub(page, { verifyKey: PLAINTEXT_MEMO });
    const dialog = await openDecodeDialog(page);

    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue(PLAINTEXT_MEMO);
    const verifyCalls = (await keychainCalls(page)).filter(({ method }) => method === 'requestVerifyKey');
    expect(verifyCalls.map(({ args }) => args)).toEqual([[STUB_ACCOUNT, ENCRYPTED_MEMO, 'memo']]);
  });

  test("WALLET-MEMO-DEC-04 — another account's history shows the placeholder without Decode", async ({
    page
  }) => {
    await logInAsStubAccount(page, { username: STUB_FOLLOWED });
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    await expect(encodedMemoCell(page)).toContainText('Encrypted memo');
    await expect(encodedMemoCell(page)).not.toContainText(ENCRYPTED_MEMO);
    await expect(encodedMemoCell(page).getByTestId('decode-memo-trigger')).toHaveCount(0);
  });
});
