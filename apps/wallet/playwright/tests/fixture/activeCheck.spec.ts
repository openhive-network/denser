import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor, type BroadcastInterceptor } from '../support/broadcastInterceptor';
import { LoginForm } from '../support/pages/loginForm';
import { expectTransferOperation, naiAsset } from '../support/walletOperations';
import { STUB_ACCOUNT, STUB_FOLLOWED, startWalletApiStub, stubAccountWith } from '../support/walletApiStub';
import enSmartSigner from '../../../../../packages/smart-signer/locales/en/smart-signer.json';

/**
 * The choice, when a safe-storage wallet is created, to be asked for the password or a passkey
 * before every operation that needs the active or owner key. Unchecked (the default) an unlocked
 * session signs a transfer without a prompt; checked, each transfer asks, in a password field the
 * browser does not fill in, and the sign-in itself asks only once. The stub node
 * (support/walletApiStub.ts) lists one key as the account's posting and active key, and vouches for
 * it as safe storage's sign-in checks; the broadcast is intercepted.
 */

const HYDRATION_TIMEOUT = 30_000;
const CHECK_TITLE = enSmartSigner.password_form.active_check_title;

/** `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-shared-key')`, a key of no real account. */
const SHARED_WIF = '5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR';
const SHARED_PUBLIC_KEY = 'STM5dRfo5EMpM51eN3pS8Gn1CDGVZXjRanwfJP8oEXQ8KS36HhB2W';
const SAFE_STORAGE_PASSWORD = 'fixture-password';

const sharedAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[SHARED_PUBLIC_KEY, 1]] };

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    ...stubAccountWith({ posting: sharedAuthority, active: sharedAuthority }),
    'database_api.verify_authority': () => ({ valid: true }),
    'account_by_key_api.get_key_references': () => ({ accounts: [[STUB_ACCOUNT]] })
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

/** Creates the safe-storage wallet with the shared key, the check box as `checked`, and signs in */
async function createWalletAndSignIn(page: Page, checked: boolean) {
  const loginForm = new LoginForm(page);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  await expect(async () => {
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await expect(loginForm.wifInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await loginForm.usernameInput.fill(STUB_ACCOUNT);
  await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
  await loginForm.wifInput.fill(SHARED_WIF);
  const checkbox = page.getByTestId('active-check-checkbox');
  await expect(checkbox).not.toBeChecked();
  if (checked) await checkbox.click();
  await expect(page.getByTestId('session-time-caption')).toContainText(
    checked ? enSmartSigner.session_time.activity_checked : enSmartSigner.session_time.activity_unchecked
  );
  await loginForm.saveSignInButton.click();
  await expect(loginForm.loginDialog).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
  // One prompt for signing in: the login transaction asked for no check of its own
  await expect(page.getByText(CHECK_TITLE)).toHaveCount(0);
}

/** Fills in a transfer of 1 HIVE to STUB_FOLLOWED and confirms it */
async function startTransfer(page: Page) {
  const dialog = await openBalanceMenuDialog(
    page,
    page.getByTestId('wallet-hive-value').getByRole('button'),
    'Transfer',
    'Transfer To Account'
  );
  await dialog.locator('input[cmdk-input]').fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
  await dialog.getByPlaceholder('Amount').fill('1');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('dialog', { name: 'Confirm Transfer To Account' }).getByRole('button', { name: 'OK' }).click();
}

function expectTransferBroadcast(broadcasts: BroadcastInterceptor, index: number) {
  expectTransferOperation(broadcasts.calls[index], {
    from: STUB_ACCOUNT,
    to: STUB_FOLLOWED,
    amount: naiAsset('1.000 HIVE'),
    memo: ''
  });
}

/** Answers the check prompt a transfer opened with the safe storage password */
async function confirmCheck(page: Page) {
  const loginForm = new LoginForm(page);
  await expect(page.getByText(CHECK_TITLE)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await expect(loginForm.passwordToUnlockKeyInput).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(loginForm.passwordToUnlockKeyInput).toHaveValue('');
  await loginForm.passwordToUnlockKeyInput.fill(SAFE_STORAGE_PASSWORD);
  await loginForm.passwordToUnlockKeySubmitButton.click();
  await expect(page.getByText(CHECK_TITLE)).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
}

test.describe('The check before active-key operations of a safe-storage wallet', () => {
  test('WALLET-ACTIVE-CHECK-01 — a wallet created with the box unchecked signs a transfer without a prompt', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await createWalletAndSignIn(page, false);

    await startTransfer(page);

    await broadcasts.waitForCount(1);
    expectTransferBroadcast(broadcasts, 0);
    await expect(new LoginForm(page).enterYourPasswordForm).toHaveCount(0);
  });

  test('WALLET-ACTIVE-CHECK-02 — a wallet created with the box checked asks before each transfer', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await createWalletAndSignIn(page, true);

    await startTransfer(page);
    await confirmCheck(page);
    await broadcasts.waitForCount(1);
    expectTransferBroadcast(broadcasts, 0);
    // The transfer dialog stays open after sending
    await page.getByRole('dialog', { name: 'Transfer To Account', exact: true }).getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await startTransfer(page);
    await confirmCheck(page);
    await broadcasts.waitForCount(2);
    expectTransferBroadcast(broadcasts, 1);
  });
});
