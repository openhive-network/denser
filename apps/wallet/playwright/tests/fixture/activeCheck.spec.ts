import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor, type BroadcastInterceptor } from '../support/broadcastInterceptor';
import { restoreIndexedDb } from '../support/indexedDbDump';
import { LoginForm } from '../support/pages/loginForm';
import { expectTransferOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  stubAccountWith
} from '../support/walletApiStub';
import preSettingWallet from '../mock/safe-storage/pre-setting-wallet.json';
import enSmartSigner from '../../../../../packages/smart-signer/locales/en/smart-signer.json';

/**
 * The choice, when a safe-storage wallet is created, to be asked for the password or a passkey
 * before every operation that needs the active or owner key. Unchecked (the default) an unlocked
 * session signs a transfer without a prompt; checked, each transfer asks, in a password field the
 * browser does not fill in, and the sign-in itself asks only once. The stub node
 * (support/walletApiStub.ts) lists one key as the account's posting and active key, and vouches for
 * it as safe storage's sign-in checks; the broadcast is intercepted.
 *
 * A wallet made before the setting existed (mock/safe-storage/README.md) is not asked about it:
 * locked, its first transfer asks only for the password unlocking it, which adopts the setting as
 * off, and the next transfer signs without a prompt.
 */

const HYDRATION_TIMEOUT = 30_000;
const CHECK_TITLE = enSmartSigner.password_form.active_check_title;

/** `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-shared-key')`, a key of no real account. */
const SHARED_WIF = '5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR';
const SHARED_PUBLIC_KEY = 'STM5dRfo5EMpM51eN3pS8Gn1CDGVZXjRanwfJP8oEXQ8KS36HhB2W';
const SAFE_STORAGE_PASSWORD = 'fixture-password';

const sharedAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[SHARED_PUBLIC_KEY, 1]] };

const ownTransfersPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`;
/** A page of the wallet's origin that loads nothing, to write IndexedDB before the wallet opens it */
const SEED_PAGE = `${WALLET_BASE_PATH}/__indexeddb-seed`;

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
  await page.goto(ownTransfersPage);
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

/** Restores the recorded pre-setting wallet into IndexedDB, locked: no hb-auth worker has unlocked it */
async function restorePreSettingWallet(page: Page) {
  expect(preSettingWallet.username, "the recorded wallet is the stub account's").toBe(STUB_ACCOUNT);
  await page.route(`**${SEED_PAGE}`, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  await page.goto(SEED_PAGE);
  await restoreIndexedDb(page, preSettingWallet);
  await page.unroute(`**${SEED_PAGE}`);
}

/** Restores the recorded pre-setting wallet and has the next page load find the stub account signed in through it */
async function restorePreSettingWalletSignedIn(page: Page) {
  await restorePreSettingWallet(page);
  await logInAsStubAccount(page, { loginType: 'hbauth', keyType: 'active' });
}

/** Opens the sign-in dialog of a signed-out page and picks the stub account's safe-storage wallet */
async function openSignInOfWallet(page: Page): Promise<LoginForm> {
  const loginForm = new LoginForm(page);
  await page.goto(ownTransfersPage);
  await expect(async () => {
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await loginForm.usernameInput.fill(STUB_ACCOUNT);
  await expect(loginForm.loginFormDescription, 'the sign-in found the locked wallet').toHaveText(
    enSmartSigner.login_form.signin_safe_storage.description_unlock,
    { timeout: HYDRATION_TIMEOUT }
  );
  return loginForm;
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

  test('WALLET-ACTIVE-CHECK-03 — a locked wallet from before the setting signs two transfers after one password prompt', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await restorePreSettingWalletSignedIn(page);
    await page.goto(ownTransfersPage);
    const loginForm = new LoginForm(page);

    await startTransfer(page);
    await expect(loginForm.enterYourPasswordForm, 'the transfer asks for the password unlocking the locked wallet').toBeVisible({
      timeout: HYDRATION_TIMEOUT
    });
    await expect(page.getByText(CHECK_TITLE), 'the locked wallet asks to unlock, not for the check').toHaveCount(0);
    await loginForm.passwordToUnlockKeyInput.fill(SAFE_STORAGE_PASSWORD);
    await loginForm.passwordToUnlockKeySubmitButton.click();
    await expect(
      loginForm.enterYourPasswordForm,
      'the current hb-auth unlocks the recorded wallet with the fixture password'
    ).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
    await broadcasts.waitForCount(1);
    expectTransferBroadcast(broadcasts, 0);
    await page.getByRole('dialog', { name: 'Transfer To Account', exact: true }).getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await startTransfer(page);
    await expect(async () => {
      expect(
        await loginForm.enterYourPasswordForm.count(),
        'the unlock adopted the setting as off; a check prompt here means hb-auth read the recorded wallet as tampered'
      ).toBe(0);
      expect(broadcasts.calls).toHaveLength(2);
    }).toPass({ timeout: HYDRATION_TIMEOUT });
    expectTransferBroadcast(broadcasts, 1);

    await page.getByTestId('profile-avatar-button').click();
    await expect(
      page.getByRole('menu').getByTestId('active-check-menu-item'),
      'the account menu shows the setting of the unlocked pre-setting wallet as off'
    ).toHaveAttribute('aria-checked', 'false');
  });

  test('WALLET-ACTIVE-CHECK-04 — a wallet created with the box checked is told as asking in the account menu and, locked, in the sign-in', async ({
    page
  }) => {
    await createWalletAndSignIn(page, true);
    await page.getByTestId('profile-avatar-button').click();
    await expect(page.getByRole('menu').getByTestId('session-time-note')).toContainText(
      enSmartSigner.session_time.activity_checked,
      { timeout: HYDRATION_TIMEOUT }
    );
    await expect(page.getByRole('menu').getByTestId('active-check-menu-item')).toHaveText(
      enSmartSigner.active_check.menu_label
    );
    // Signing out locks the wallet
    await page.getByRole('menu').getByText('Logout', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    const loginForm = await openSignInOfWallet(page);
    await expect(loginForm.loginDialog.getByTestId('session-time-caption')).toContainText(
      enSmartSigner.session_time.activity_checked
    );
  });

  test('WALLET-ACTIVE-CHECK-05 — a locked wallet from before the setting is told as signing without asking in the sign-in', async ({
    page
  }) => {
    await restorePreSettingWallet(page);
    const loginForm = await openSignInOfWallet(page);
    await expect(loginForm.loginDialog.getByTestId('session-time-caption')).toContainText(
      enSmartSigner.session_time.activity_unchecked,
      { timeout: HYDRATION_TIMEOUT }
    );
  });
});
