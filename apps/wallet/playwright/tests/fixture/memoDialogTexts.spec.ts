import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installKeychainStub } from '../support/keychainStub';
import { ENCRYPTED_MEMO, RECIPIENT_MEMO_PUBLIC_KEY } from '../support/memoKeys';
import { fillTransfer, openTransferDialog } from '../support/transferDialog';
import {
  STUB_ACCOUNT,
  STUB_TRANSFER_SENDER,
  fullAccount,
  logInAsStubAccount,
  startWalletApiStub,
  stubTransfer
} from '../support/walletApiStub';

/**
 * The texts of the memo dialogs follow the session: the Encrypt dialog names the extension the
 * session signs with, and none in a safe-storage session; the close (X) button of a dialog that
 * passes no label of its own is named in the page's language. Reads come from the stub node
 * (support/walletApiStub.ts), the history with its one encrypted memo through `page.route`.
 */

const HYDRATION_TIMEOUT = 30_000;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, {
    'database_api.find_accounts': ({ accounts = [] }) => ({
      accounts: accounts.map((name) => fullAccount({ name, memo_key: RECIPIENT_MEMO_PUBLIC_KEY }))
    })
  });
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

/** Opens the transfer dialog as STUB_ACCOUNT and asks to send a `#` memo, which opens the Encrypt dialog. */
const openEncryptDialog = async (page: Page) => {
  const dialog = await openTransferDialog(page);
  await fillTransfer(dialog, '#hello');
  await dialog.getByRole('button', { name: 'Next' }).click();
  const encryptDialog = page.getByRole('dialog', { name: 'Encrypt MEMO message' });
  await expect(encryptDialog).toBeVisible();
  return encryptDialog;
};

test.describe('Memo dialog texts', () => {
  test('WALLET-MEMO-TEXT-01 — in a Keychain session the Encrypt dialog offers Hive Keychain', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'keychain' });
    await installKeychainStub(page, {});

    const dialog = await openEncryptDialog(page);

    await expect(dialog.getByRole('button', { name: 'Encrypt with Keychain' })).toBeVisible();
    await expect(dialog).toContainText(
      'This memo will be encrypted before sending. Provide the MEMO private key or use Hive Keychain.'
    );
  });

  test('WALLET-MEMO-TEXT-02 — in a safe-storage session the Encrypt dialog names no extension', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'hbauth' });

    const dialog = await openEncryptDialog(page);

    await expect(dialog).toContainText(
      'This memo will be encrypted before sending. Provide the MEMO private key.'
    );
    await expect(dialog).not.toContainText('Keychain');
    await expect(dialog.getByTestId('close-dialog')).toHaveAccessibleName('Close');
  });

  test('WALLET-MEMO-TEXT-03 — in Polish the Decode dialog has a Polish close label', async ({
    page,
    baseURL
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL }]);
    await logInAsStubAccount(page);
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    const trigger = page
      .getByTestId('wallet-account-history-encoded-memo')
      .getByTestId('decode-memo-trigger');
    const dialog = page.getByRole('dialog', { name: 'Odszyfruj wiadomość MEMO' });
    await expect(async () => {
      await trigger.click();
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });

    await expect(dialog.getByTestId('close-dialog')).toHaveAccessibleName('Zamknij');
  });
});
