import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { answerUnansweredKeychainRequests, installKeychainStub, keychainCalls } from '../support/keychainStub';
import { installPeakVaultStub, peakVaultCalls } from '../support/peakVaultStub';
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
 * memo encrypted between generated key pairs, support/memoKeys.ts) or with a stubbed Keychain or Peak Vault.
 * The reads come from the stub node (support/walletApiStub.ts); the history through `page.route`.
 */

const UNRELATED_WIF = '5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg';
/** What Keychain and Peak Vault answer a request the user rejected */
const USER_CANCEL = { error: 'user_cancel', message: 'Request was canceled by the user.' };
/** What Keychain answers a request whose prompt was left open once a newer request supersedes it */
const IGNORED = { error: 'ignored', message: 'User ignored this transaction' };
/** Past the dialog's bounded wait for the wallet's answer (use-unanswered-request.ts) */
const PAST_UNANSWERED_WAIT = '00:25';
const KEYCHAIN_NO_ANSWER =
  'No answer from Hive Keychain: the request may have been rejected. Try again, or decode with the MEMO private key.';

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

/** Waits until the dialog has sent Keychain its decode request: the dialog says it is trying before that. */
const expectKeychainDecodeRequested = (page: Page) =>
  expect
    .poll(async () => (await keychainCalls(page)).filter(({ method }) => method === 'requestVerifyKey').length)
    .toBe(1);

/** The dialog offers both ways out of a decode the wallet did not do: a retry and the private key. */
const expectRetryAndPrivateKey = async (page: Page, retryButtonName: string) => {
  const dialog = decodeDialog(page);
  await expect(dialog.getByLabel('MEMO private key')).toBeVisible();
  await expect(dialog.getByRole('button', { name: retryButtonName })).toBeEnabled();
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
    expect(verifyCalls.map(({ args }) => args)).toEqual([[STUB_ACCOUNT, ENCRYPTED_MEMO, 'Memo']]);
  });

  test('WALLET-MEMO-DEC-05 — a Keychain prompt rejected on opening says so and can be retried', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'keychain' });
    await installKeychainStub(page, { verifyKey: PLAINTEXT_MEMO, verifyKeyFailures: [USER_CANCEL] });
    const dialog = await openDecodeDialog(page);

    await expect(dialog.getByTestId('decode-memo-error')).toHaveText(
      'The request was rejected in Hive Keychain. Try again, or decode with the MEMO private key.'
    );
    await expect(dialog.getByTestId('decode-memo-auto-trying')).toHaveCount(0);
    await expectRetryAndPrivateKey(page, 'Decode with Keychain');

    await dialog.getByRole('button', { name: 'Decode with Keychain' }).click();
    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue(PLAINTEXT_MEMO);
    await expect(dialog.getByTestId('decode-memo-error')).toHaveCount(0);
  });

  test('WALLET-MEMO-DEC-06 — while Keychain leaves the prompt unanswered, the retry and the private key stay available', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'keychain' });
    await installKeychainStub(page, { verifyKey: PLAINTEXT_MEMO, verifyKeyFailures: ['no answer'] });
    const dialog = await openDecodeDialog(page);

    await expect(dialog.getByTestId('decode-memo-auto-trying')).toBeVisible();
    await expectRetryAndPrivateKey(page, 'Decode with Keychain');

    await dialog.getByLabel('MEMO private key').fill(RECIPIENT_MEMO_WIF);
    await dialog.getByRole('button', { name: 'Decode with private key' }).click();
    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue(PLAINTEXT_MEMO);
    await expect(dialog.getByTestId('decode-memo-auto-trying')).toHaveCount(0);
  });

  test('WALLET-MEMO-DEC-09 — a Keychain prompt left unanswered says so after a bounded wait', async ({ page }) => {
    await page.clock.install();
    await logInAsStubAccount(page, { loginType: 'keychain' });
    await installKeychainStub(page, { verifyKey: PLAINTEXT_MEMO, verifyKeyFailures: ['no answer'] });
    const dialog = await openDecodeDialog(page);
    await expectKeychainDecodeRequested(page);
    await expect(dialog.getByTestId('decode-memo-auto-trying')).toBeVisible();
    await expect(dialog.getByTestId('decode-memo-no-answer')).toHaveCount(0);

    await page.clock.fastForward(PAST_UNANSWERED_WAIT);

    await expect(dialog.getByTestId('decode-memo-no-answer')).toHaveText(KEYCHAIN_NO_ANSWER);
    await expect(dialog.getByTestId('decode-memo-auto-trying')).toHaveCount(0);
    await expectRetryAndPrivateKey(page, 'Decode with Keychain');

    await dialog.getByRole('button', { name: 'Decode with Keychain' }).click();
    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue(PLAINTEXT_MEMO);
    await expect(dialog.getByTestId('decode-memo-no-answer')).toHaveCount(0);
  });

  test('WALLET-MEMO-DEC-10 — a late "ignored" answer to the awaited Keychain request is shown as rejected', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'keychain' });
    await installKeychainStub(page, { verifyKey: PLAINTEXT_MEMO, verifyKeyFailures: ['no answer'] });
    const dialog = await openDecodeDialog(page);
    await expectKeychainDecodeRequested(page);
    await expect(dialog.getByTestId('decode-memo-auto-trying')).toBeVisible();

    await answerUnansweredKeychainRequests(page, IGNORED);

    await expect(dialog.getByTestId('decode-memo-error')).toHaveText(
      'The request was rejected in Hive Keychain. Try again, or decode with the MEMO private key.'
    );
    await expect(dialog.getByTestId('decode-memo-auto-trying')).toHaveCount(0);
    await expectRetryAndPrivateKey(page, 'Decode with Keychain');
  });

  test('WALLET-MEMO-DEC-11 — logged in with Keychain but without the extension, the dialog asks only for the private key', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'keychain' });
    const dialog = await openDecodeDialog(page);

    await expect(dialog.getByLabel('MEMO private key')).toBeVisible();
    await expect(dialog).toContainText('you will need to provide the MEMO private key');
    await expect(dialog).not.toContainText('Hive Keychain');
    await expect(dialog.getByRole('button', { name: 'Decode with Keychain' })).toHaveCount(0);
  });

  test('WALLET-MEMO-DEC-07 — a Peak Vault prompt cancelled on opening says so instead of blaming the private key', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'peakvault' });
    await installPeakVaultStub(page, [USER_CANCEL, PLAINTEXT_MEMO]);
    const dialog = await openDecodeDialog(page);

    await expect(dialog.getByTestId('decode-memo-error')).toHaveText(
      'The request was rejected in Peak Vault. Try again, or decode with the MEMO private key.'
    );
    await expect(dialog).not.toContainText('the private key is invalid');
    await expect(dialog).toContainText('use Peak Vault or provide the MEMO private key');
    await expect(dialog).not.toContainText('Hive Keychain');
    await expectRetryAndPrivateKey(page, 'Decode with Peak Vault');

    await dialog.getByRole('button', { name: 'Decode with Peak Vault' }).click();
    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue(PLAINTEXT_MEMO);
    const decodeCalls = await peakVaultCalls(page);
    expect(decodeCalls.map(({ args }) => args)).toEqual([
      [STUB_ACCOUNT, ENCRYPTED_MEMO, 'memo'],
      [STUB_ACCOUNT, ENCRYPTED_MEMO, 'memo']
    ]);
  });

  test('WALLET-MEMO-DEC-08 — a Peak Vault retry cancelled after a decode replaces the old result with the rejection', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'peakvault' });
    await installPeakVaultStub(page, [PLAINTEXT_MEMO, USER_CANCEL]);
    const dialog = await openDecodeDialog(page);
    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue(PLAINTEXT_MEMO);

    await dialog.getByRole('button', { name: 'Decode with Peak Vault' }).click();

    await expect(dialog.getByTestId('decode-memo-error')).toContainText(
      'The request was rejected in Peak Vault'
    );
    await expect(dialog.getByTestId('decoded-memo-result')).toHaveValue('');
    await expectRetryAndPrivateKey(page, 'Decode with Peak Vault');
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
