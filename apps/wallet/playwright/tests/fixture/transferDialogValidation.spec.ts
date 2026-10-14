import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub, stubAccountWith } from '../support/walletApiStub';

/**
 * The Transfer To Account dialog checks the recipient and the amount before its confirmation:
 * each error is shown under its own field, which is marked invalid and described by it, and a
 * name that is not a well-formed account name is never looked up (find_accounts throws on one
 * longer than 16 characters). The stub balance is 1,234.567 HIVE. Nothing is broadcast.
 */

/** 20 characters: past the chain's 16-character limit. */
const TOO_LONG_ACCOUNT = 'nieistniejacekonto99';
/** Well formed, but the stub node has no account for it. */
const MISSING_ACCOUNT = 'brakkonta9x';
/** Well formed; the node answers its lookup with an error. */
const FAILING_LOOKUP_ACCOUNT = 'lookupfails1';
const ABOVE_BALANCE = '5000';

let stub: Server;
const lookedUpNames: string[] = [];

test.beforeAll(async () => {
  const findAccounts = stubAccountWith({})['database_api.find_accounts'];
  stub = await startWalletApiStub(undefined, {
    'database_api.find_accounts': ({ accounts = [] }) => {
      lookedUpNames.push(...accounts);
      return findAccounts({ accounts: accounts.filter((name) => name !== MISSING_ACCOUNT) });
    }
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

const openTransferDialog = async (page: Page): Promise<Locator> => {
  await logInAsStubAccount(page, 'active');
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  return openBalanceMenuDialog(
    page,
    page.getByTestId('wallet-hive-value').getByRole('button'),
    'Transfer',
    'Transfer To Account'
  );
};

const recipientInput = (dialog: Locator) => dialog.locator('input[cmdk-input]');

const submit = async (dialog: Locator, recipient: string, amount: string) => {
  await recipientInput(dialog).fill(recipient);
  await dialog.getByLabel('Amount', { exact: true }).fill(amount);
  await dialog.getByRole('button', { name: 'Next' }).click();
};

/** The field is invalid and its description is `message`. */
const expectFieldError = async (field: Locator, message: string) => {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAccessibleDescription(message);
};

const confirmDialog = (page: Page) => page.getByRole('dialog', { name: 'Confirm Transfer To Account' });

test.describe('Transfer dialog validation', () => {
  test('WALLET-TX-VALIDATE-01 — a recipient over 16 characters is refused under To without a lookup, next to the amount error', async ({
    page
  }) => {
    const dialog = await openTransferDialog(page);
    await submit(dialog, TOO_LONG_ACCOUNT, ABOVE_BALANCE);

    await expectFieldError(recipientInput(dialog), 'Account name is too long. Use max 16 characters.');
    await expectFieldError(dialog.getByLabel('Amount', { exact: true }), 'Insufficient funds.');
    await expect(confirmDialog(page)).toBeHidden();
    expect(lookedUpNames).not.toContain(TOO_LONG_ACCOUNT);
  });

  test('WALLET-TX-VALIDATE-02 — an account the node does not know is reported under To, not under Amount', async ({
    page
  }) => {
    const dialog = await openTransferDialog(page);
    await submit(dialog, MISSING_ACCOUNT, '1');

    await expectFieldError(recipientInput(dialog), 'Account not found.');
    const amount = dialog.getByLabel('Amount', { exact: true });
    await expect(amount).toHaveAttribute('aria-invalid', 'false');
    await expect(amount).not.toHaveAttribute('aria-describedby');
    await expect(confirmDialog(page)).toBeHidden();
  });

  test('WALLET-TX-VALIDATE-03 — a failed recipient lookup is reported under To instead of leaving Next inert', async ({
    page
  }) => {
    await page.route('**/*', async (route) => {
      const body = route.request().postData() ?? '';
      if (!body.includes('find_accounts') || !body.includes(FAILING_LOOKUP_ACCOUNT)) return route.fallback();
      const { id } = JSON.parse(body);
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Assert Exception' }, id })
      });
    });
    const dialog = await openTransferDialog(page);
    await submit(dialog, FAILING_LOOKUP_ACCOUNT, '1');

    await expectFieldError(recipientInput(dialog), 'Could not check the account. Try again later.');
    await expect(confirmDialog(page)).toBeHidden();
  });

  test('WALLET-TX-VALIDATE-04 — From, Amount and Memo are labelled, and Tab moves from Amount to its currency', async ({
    page
  }) => {
    const dialog = await openTransferDialog(page);

    await expect(dialog.getByLabel('From', { exact: true })).toHaveValue(STUB_ACCOUNT);
    await expect(dialog.getByLabel('Memo', { exact: true })).toBeEditable();
    const amount = dialog.getByLabel('Amount', { exact: true });

    await recipientInput(dialog).focus();
    await page.keyboard.press('Tab');
    await expect(amount).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('combobox', { name: 'Currency' })).toBeFocused();
  });
});
