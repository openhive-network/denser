import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor, type BroadcastInterceptor } from '../support/broadcastInterceptor';
import { LoginForm } from '../support/pages/loginForm';
import { expectTransferOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey,
  stubAccountWith
} from '../support/walletApiStub';
import enWallet from '../../../locales/en/common_wallet.json';

/**
 * An account using one key pair as both its posting and its active key: a session signed in with
 * it holds both keys, whichever of them it signed in as. Safe storage keeps the key for both types,
 * a WIF session that stores its key stores it as both, and the header names both keys, offers no
 * key to add and signs a transfer without asking for a key. The stub node
 * (support/walletApiStub.ts) lists the key below in the account's posting and active authorities,
 * and vouches for it as safe storage's sign-in checks; the broadcast is intercepted.
 */

const HYDRATION_TIMEOUT = 30_000;
const EN_MENU = enWallet.navigation.user_menu;

/** `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-shared-key')`, a key of no real account. */
const SHARED_WIF = '5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR';
const SHARED_PUBLIC_KEY = 'STM5dRfo5EMpM51eN3pS8Gn1CDGVZXjRanwfJP8oEXQ8KS36HhB2W';
const SAFE_STORAGE_PASSWORD = 'fixture-password';

const sharedAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[SHARED_PUBLIC_KEY, 1]] };

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    ...stubAccountWith({ posting: sharedAuthority, active: sharedAuthority }),
    // What hb-auth's sign-in asks the node: the signature satisfies the account, whose key it is
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

const ownTransfersPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`;

const storedWifKeys = (page: Page) =>
  page.evaluate(() =>
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('wif.'))
      .sort()
  );

async function openLoginDialog(page: Page): Promise<LoginForm> {
  const loginForm = new LoginForm(page);
  await page.goto(ownTransfersPage);
  await expect(async () => {
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return loginForm;
}

/** The header names both keys and offers none to add */
async function expectBothKeysHeld(page: Page) {
  const avatar = page.getByTestId('profile-avatar-button');
  await expect(avatar).toHaveAccessibleName(`${STUB_ACCOUNT} account menu, posting and active keys`, {
    timeout: HYDRATION_TIMEOUT
  });
  await expect(page.getByTestId('active-key-required-notice')).toHaveCount(0);

  const menu = page.getByRole('menu');
  await expect(async () => {
    await avatar.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await expect(menu.getByTestId('login-authority-chip')).toHaveText(EN_MENU.key_type.posting_and_active);
  await expect(menu.getByTestId('login-key-action')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
}

/** Transfers 1 HIVE to STUB_FOLLOWED, expecting it to broadcast with no key asked for. */
async function transferWithoutKeyPrompt(page: Page, broadcasts: BroadcastInterceptor) {
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

  await broadcasts.waitForCount(1);
  expectTransferOperation(broadcasts.calls[0], {
    from: STUB_ACCOUNT,
    to: STUB_FOLLOWED,
    amount: naiAsset('1.000 HIVE'),
    memo: ''
  });
  await expect(new LoginForm(page).headerEnterYourWifKey).toHaveCount(0);
}

test.describe('An account whose posting and active keys are one key', () => {
  test('WALLET-SHARED-KEY-01 — the safe-storage sign-in keeps the key as both, and a transfer asks for no key', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const loginForm = await openLoginDialog(page);

    await expect(loginForm.wifInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await loginForm.usernameInput.fill(STUB_ACCOUNT);
    await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await loginForm.wifInput.fill(SHARED_WIF);
    await loginForm.saveSignInButton.click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });

    await expectBothKeysHeld(page);
    await transferWithoutKeyPrompt(page, broadcasts);
  });

  test('WALLET-SHARED-KEY-02 — the WIF sign-in stores the key as both, and a transfer asks for no key', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const loginForm = await openLoginDialog(page);

    await loginForm.otherSignInOptionsButton.click();
    await loginForm.otherSignInOptionsUsernameInput.fill(STUB_ACCOUNT);
    await loginForm.signInWithWifButton.click();
    await expect(loginForm.headerEnterYourWifKey).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await loginForm.storeKeyCheckbox.check();
    await loginForm.postingPrivateKeyInput.fill(SHARED_WIF);
    await loginForm.postingPrivateKeySubmitButton.click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });

    await expectBothKeysHeld(page);
    expect(await storedWifKeys(page)).toEqual([`wif.${STUB_ACCOUNT}@active`, `wif.${STUB_ACCOUNT}@posting`]);
    await transferWithoutKeyPrompt(page, broadcasts);
  });

  test('WALLET-SHARED-KEY-03 — the blog\'s posting WIF session whose key is stored as both opens the wallet', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await logInAsStubAccount(page, 'posting');
    await storeStubAccountKey(page, 'posting', SHARED_WIF);
    await storeStubAccountKey(page, 'active', SHARED_WIF);
    await page.goto(ownTransfersPage);

    await expectBothKeysHeld(page);
    await transferWithoutKeyPrompt(page, broadcasts);
  });
});
