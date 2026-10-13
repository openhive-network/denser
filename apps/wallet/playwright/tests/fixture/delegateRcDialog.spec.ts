import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, STUB_FOLLOWED, logInAsStubAccount, startWalletApiStub, stubAccountWith } from '../support/walletApiStub';

/**
 * The Delegate RC dialog of the Resource Credits row: its slider moves in percent of the available
 * RC, the recipient autocompletes from the transfer suggestions and is looked up on chain, and
 * closing the dialog forgets what was entered.
 * STUB_ACCOUNT's RC manabar has fully regenerated to its max_rc of 1,000,000,000,000 RC
 * (1000 billion) at the stub's head block time. Nothing is broadcast.
 */

const HYDRATION_TIMEOUT = 30_000;
const DIALOG_NAME = 'Delegate RC';
/** A name the stub node has no account for. */
const MISSING_ACCOUNT = 'quest4test1zz';

let stub: Server;

test.beforeAll(async () => {
  const findAccounts = stubAccountWith({})['database_api.find_accounts'];
  stub = await startWalletApiStub(undefined, {
    'database_api.find_accounts': ({ accounts = [] }) =>
      findAccounts({ accounts: accounts.filter((name) => name !== MISSING_ACCOUNT) })
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

const openDelegateRcDialog = async (page: Page): Promise<{ trigger: Locator; dialog: Locator }> => {
  const trigger = page.getByRole('button', { name: DIALOG_NAME, exact: true });
  const dialog = page.getByRole('dialog', { name: DIALOG_NAME, exact: true });
  await expect(async () => {
    await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return { trigger, dialog };
};

const gotoTransfers = async (page: Page) => {
  await logInAsStubAccount(page);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
};

test.describe('Delegate RC dialog', () => {
  test('WALLET-RC-01 — the slider is a named modal control that steps by 1 % and 10 % of the available RC', async ({
    page
  }) => {
    await gotoTransfers(page);
    const { dialog } = await openDelegateRcDialog(page);
    const slider = dialog.getByRole('slider', { name: 'RC amount' });
    const amount = dialog.getByLabel('RC amount (billions)');

    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByText('0.00 bil / 1000.00 bil RC')).toBeVisible();

    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '1');
    await expect(slider).toHaveAttribute('aria-valuetext', '10.00 billion RC, 1%');
    await expect(amount).toHaveValue('10');

    await page.keyboard.press('PageUp');
    await expect(slider).toHaveAttribute('aria-valuenow', '11');
    await expect(amount).toHaveValue('110');
    await expect(dialog.getByText('110.00 bil / 1000.00 bil RC')).toBeVisible();

    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
    await expect(amount).toHaveValue('1000');

    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await expect(amount).toHaveValue('0');
  });

  test('WALLET-RC-02 — a recipient without an account is refused inline, an existing one enables Delegate RC', async ({
    page
  }) => {
    await gotoTransfers(page);
    const { dialog } = await openDelegateRcDialog(page);
    const recipient = dialog.getByLabel('To Account');
    const submit = dialog.getByRole('button', { name: DIALOG_NAME, exact: true });

    await dialog.getByRole('button', { name: '25%' }).click();
    await recipient.fill(MISSING_ACCOUNT);
    await expect(dialog.getByText('Account not found.')).toBeVisible();
    await expect(recipient).toHaveAttribute('aria-invalid', 'true');
    await expect(submit).toBeDisabled();

    await recipient.fill(STUB_FOLLOWED);
    await expect(dialog.getByText('Account not found.')).toBeHidden();
    await expect(submit).toBeEnabled();
  });

  test('WALLET-RC-03 — delegating almost all RC warns, and closing the dialog clears the form', async ({
    page
  }) => {
    await gotoTransfers(page);
    const { trigger, dialog } = await openDelegateRcDialog(page);
    const recipient = dialog.getByLabel('To Account');
    const amount = dialog.getByLabel('RC amount (billions)');
    const warning = dialog.getByRole('alert').filter({ hasText: 'of your available RC' });

    await dialog.getByRole('button', { name: '75%' }).click();
    await expect(warning).toHaveCount(0);
    await recipient.fill(MISSING_ACCOUNT);
    await dialog.getByRole('button', { name: '100%' }).click();
    await expect(warning).toContainText('100%');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await trigger.click();
    await expect(recipient).toHaveValue('');
    await expect(amount).toHaveValue('0');
    await expect(warning).toHaveCount(0);

    await recipient.fill(STUB_FOLLOWED);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await trigger.click();
    await expect(recipient).toHaveValue('');
  });

  test('WALLET-RC-04 — the recipient is a combobox whose suggestions the keyboard picks, and Esc closes only the suggestions', async ({
    page
  }) => {
    await gotoTransfers(page);
    const { dialog } = await openDelegateRcDialog(page);
    const recipient = dialog.getByRole('combobox', { name: 'To Account' });
    const suggestion = dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` });
    const submit = dialog.getByRole('button', { name: DIALOG_NAME, exact: true });

    await dialog.getByRole('button', { name: '25%' }).click();
    await recipient.fill('stub-f');
    await expect(suggestion).toBeVisible();
    await recipient.press('Escape');
    await expect(suggestion).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(recipient).toHaveValue('stub-f');

    await recipient.fill('stub-fo');
    await recipient.press('ArrowDown');
    await recipient.press('ArrowUp');
    await expect(suggestion).toHaveAttribute('aria-selected', 'true');
    await recipient.press('Enter');
    await expect(recipient).toHaveValue(STUB_FOLLOWED);
    await expect(suggestion).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(submit).toBeEnabled();
    await expect(dialog.getByText('Account not found.')).toBeHidden();

    await recipient.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
