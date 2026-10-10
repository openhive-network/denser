import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { installKeychainStub, keychainCalls } from '../support/keychainStub';
import {
  ENCRYPTED_MEMO,
  ENCRYPTED_MEMO_SHAPE,
  RECIPIENT_MEMO_PUBLIC_KEY,
  SENDER_MEMO_WIF
} from '../support/memoKeys';
import {
  captureBroadcastMemos,
  confirmDialog,
  fillTransfer,
  openTransferDialog
} from '../support/transferDialog';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  fullAccount,
  logInAsStubAccount,
  startWalletApiStub
} from '../support/walletApiStub';

/**
 * A transfer memo starting with `#` is encrypted for the recipient before it is broadcast, with the
 * MEMO private key or with Keychain, and never goes on the wire in clear; the memo secret guard
 * checks the plaintext first. The user signs with a stubbed Keychain (support/keychainStub.ts), and
 * the stub node (support/walletApiStub.ts) accepts the broadcast, whose memo the specs read.
 */

const WIF = '5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg';
const MEMO = '#hello';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, {
    'database_api.find_accounts': ({ accounts = [] }) => ({
      accounts: accounts.map((name) => fullAccount({ name, memo_key: RECIPIENT_MEMO_PUBLIC_KEY }))
    }),
    'database_api.verify_authority': () => ({ valid: true }),
    'network_broadcast_api.broadcast_transaction': () => ({})
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

let broadcastMemos: string[];

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  broadcastMemos = captureBroadcastMemos(page);
});

const encryptDialog = (page: Page) => page.getByRole('dialog', { name: 'Encrypt MEMO message' });

/** Opens the transfer dialog as STUB_ACCOUNT logged in with the stubbed Keychain, and asks to send `memo`. */
const submitTransfer = async (page: Page, memo: string, encodeMessage?: string) => {
  await logInAsStubAccount(page, { loginType: 'keychain' });
  await installKeychainStub(page, { encodeMessage });
  const dialog = await openTransferDialog(page);
  await fillTransfer(dialog, memo);
  await expect(dialog).toContainText('This memo will be encrypted');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(encryptDialog(page)).toBeVisible();
  expect(broadcastMemos, 'nothing is broadcast before the memo is encrypted').toEqual([]);
};

const confirmAndBroadcast = async (page: Page) => {
  await expect(confirmDialog(page)).toBeVisible();
  await confirmDialog(page).getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => broadcastMemos.length).toBe(1);
};

test.describe('Transfer memo encryption', () => {
  test('WALLET-MEMO-ENC-01 — a # memo encrypted with the MEMO private key is broadcast as ciphertext', async ({
    page
  }) => {
    await submitTransfer(page, MEMO);

    await encryptDialog(page).getByLabel('MEMO private key').fill(SENDER_MEMO_WIF);
    await encryptDialog(page).getByRole('button', { name: 'Encrypt with private key' }).click();
    await confirmAndBroadcast(page);

    const [memo] = broadcastMemos;
    expect(memo).toMatch(ENCRYPTED_MEMO_SHAPE);
    expect(memo).not.toContain('hello');
  });

  test('WALLET-MEMO-ENC-02 — a # memo encrypted with Keychain is broadcast as the ciphertext Keychain made', async ({
    page
  }) => {
    await submitTransfer(page, MEMO, ENCRYPTED_MEMO);

    await encryptDialog(page).getByRole('button', { name: 'Encrypt with Keychain' }).click();
    await confirmAndBroadcast(page);

    expect(broadcastMemos).toEqual([ENCRYPTED_MEMO]);
    const encodeCalls = (await keychainCalls(page)).filter(({ method }) => method === 'requestEncodeMessage');
    expect(encodeCalls.map(({ args }) => args)).toEqual([[STUB_ACCOUNT, STUB_FOLLOWED, MEMO, 'Memo']]);
  });

  test('WALLET-MEMO-ENC-03 — a # memo holding a private key is blocked by the secret guard before any encryption', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'keychain' });
    await installKeychainStub(page, { encodeMessage: ENCRYPTED_MEMO });
    const dialog = await openTransferDialog(page);
    await fillTransfer(dialog, `#${WIF}`);

    const warning = dialog.getByTestId('memo-secret-warning');
    const next = dialog.getByRole('button', { name: 'Next' });
    await expect(warning).toContainText('looks like a private key');
    await expect(next).toBeDisabled();
    await expect(encryptDialog(page)).toBeHidden();

    await warning.getByText('I understand this memo is public').click();
    await next.click();
    await expect(encryptDialog(page), 'encryption is offered only once the guard passed').toBeVisible();
    await expect(confirmDialog(page)).toBeHidden();
    expect(await keychainCalls(page)).toEqual([]);
    expect(broadcastMemos).toEqual([]);
  });
});
