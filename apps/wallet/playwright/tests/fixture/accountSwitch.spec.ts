import type { Server } from 'node:http';
import { test, expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { installKeychainStub } from '../support/keychainStub';
import { LoginForm } from '../support/pages/loginForm';
import { STUB_ACCOUNT, startWalletApiStub, stubAccountWith } from '../support/walletApiStub';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';

/**
 * The account menu switches between the accounts signed in during the session and adds one, as the
 * blog's does. The reader is seeded as signed in, client-only, to STUB_ACCOUNT and then OTHER, and
 * acting as STUB_ACCOUNT; blog and wallet share the stored user, so what the wallet stores is what
 * the blog follows. Reads come from the stub node (support/walletApiStub.ts), which knows any account.
 */

const HYDRATION_TIMEOUT = 30_000;
const OTHER = 'stub-sender';
const ADDED = 'stub-followed';
const WITHDRAW_MESSAGE = `Withdraw 1.250 HBD to ${STUB_ACCOUNT}`;
const EN_EXTENSION_SIGN_IN = enSmartSigner.login_form.extension_sign_in;

/** `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-shared-key')`, a key of no real account. */
const SHARED_WIF = '5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR';
const SHARED_PUBLIC_KEY = 'STM5dRfo5EMpM51eN3pS8Gn1CDGVZXjRanwfJP8oEXQ8KS36HhB2W';
const SAFE_STORAGE_PASSWORD = 'fixture-password';
const sharedAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[SHARED_PUBLIC_KEY, 1]] };

const clientOnlyUser = (username: string) => ({
  isLoggedIn: true,
  username,
  avatarUrl: '',
  loginType: 'keychain',
  keyType: 'active',
  authenticateOnBackend: false,
  chatAuthToken: '',
  oauthConsent: {},
  strict: false
});

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, {
    ...stubAccountWith({ posting: sharedAuthority, active: sharedAuthority }),
    'database_api.verify_authority': () => ({ valid: true }),
    'account_by_key_api.get_key_references': () => ({ accounts: [[STUB_ACCOUNT]] }),
    'database_api.find_savings_withdrawals': () => ({
      withdrawals: [
        {
          id: 11,
          from: STUB_ACCOUNT,
          to: STUB_ACCOUNT,
          memo: '',
          request_id: 1,
          amount: { amount: '1250', precision: 3, nai: '@@000000013' },
          complete: '2026-10-04T12:00:00'
        }
      ]
    })
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
// The accounts are seeded once per context, so the specs' switches and other tabs keep what they store.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(
    ({ current, accounts }) => {
      Object.defineProperty(Navigator.prototype, 'onLine', {
        configurable: true,
        get: () => true
      });
      if (window.localStorage.getItem('accounts') !== null) return;
      window.localStorage.setItem('user', JSON.stringify(current));
      window.localStorage.setItem('accounts', JSON.stringify(accounts));
    },
    {
      current: clientOnlyUser(STUB_ACCOUNT),
      accounts: [clientOnlyUser(STUB_ACCOUNT), clientOnlyUser(OTHER)]
    }
  );
});

const readStoredUsername = (page: Page): Promise<string> =>
  page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}').username);

const readStoredAccounts = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('accounts') || '[]').map((a: { username: string }) => a.username)
  );

/** Opens the account menu, retried until hydration attached the handlers. */
const openAccountMenu = async (page: Page): Promise<Locator> => {
  const avatar = page.getByTestId('profile-avatar-button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await avatar.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return menu;
};

/** Opens the dialog cancelling the savings withdrawal, retried until hydration attached the handlers. */
const openCancelWithdrawDialog = async (page: Page): Promise<Locator> => {
  const cancel = page.getByRole('row').filter({ hasText: WITHDRAW_MESSAGE }).getByRole('button', { name: 'Cancel' });
  const dialog = page.getByRole('dialog').filter({ hasText: 'Cancel this withdraw request?' });
  await expect(async () => {
    await cancel.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return dialog;
};

/** Switches to OTHER in a new tab of `context` and waits for `page` to see the switch. */
const switchInOtherTab = async (page: Page, context: BrowserContext): Promise<void> => {
  const otherTab = await context.newPage();
  await otherTab.goto(`${WALLET_BASE_PATH}/market`);
  const menu = await openAccountMenu(otherTab);
  await menu.getByTestId('account-switcher-item').click();
  await otherTab.waitForURL(`**${WALLET_BASE_PATH}/@${OTHER}/transfers`);
  await expect.poll(() => readStoredUsername(page)).toBe(OTHER);
};

test.describe('Account menu switcher', () => {
  test('WALLET-ACCOUNT-SWITCH-01 — the menu lists the other account and switching shows its wallet', async ({
    page
  }) => {
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    const menu = await openAccountMenu(page);
    await expect(menu).toContainText(STUB_ACCOUNT);
    const items = menu.getByTestId('account-switcher-item');
    await expect(items).toHaveCount(1);
    await expect(items).toContainText(OTHER);

    await items.click();

    await page.waitForURL(`**${WALLET_BASE_PATH}/@${OTHER}/transfers`);
    await expect.poll(() => readStoredUsername(page)).toBe(OTHER);
    const switchedMenu = await openAccountMenu(page);
    await expect(switchedMenu.getByTestId('account-switcher-item')).toContainText(STUB_ACCOUNT);
  });

  test('WALLET-ACCOUNT-SWITCH-02 — "Add account" signs in a third account and makes it current', async ({ page }) => {
    await installKeychainStub(page, {});
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    const menu = await openAccountMenu(page);

    await menu.getByTestId('account-switcher-add').click();
    const loginForm = new LoginForm(page);
    await expect(loginForm.loginDialog).toBeVisible();
    await loginForm.usernameInput.fill(ADDED);
    await page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.keychain }).click();
    await expect(loginForm.loginDialog).toBeHidden({ timeout: HYDRATION_TIMEOUT });

    await expect.poll(() => readStoredUsername(page), { timeout: HYDRATION_TIMEOUT }).toBe(ADDED);
    expect((await readStoredAccounts(page)).sort()).toEqual([ADDED, OTHER, STUB_ACCOUNT].sort());
    const switchedMenu = await openAccountMenu(page);
    await expect(switchedMenu.getByTestId('account-switcher-item')).toHaveCount(2);
  });

  test('WALLET-ACCOUNT-SWITCH-03 — a switch in another tab closes the signing dialog open in this one', async ({
    page,
    context
  }) => {
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    const dialog = await openCancelWithdrawDialog(page);

    await switchInOtherTab(page, context);

    await expect(dialog).toBeHidden();
  });

  test('WALLET-ACCOUNT-SWITCH-04 — a switch in another tab closes the safe-storage password prompt, unlocking nothing', async ({
    page,
    context
  }) => {
    // hb-auth then runs in a dedicated worker, which a reload ends: the stored key is locked again
    await context.addInitScript(() => Reflect.deleteProperty(globalThis, 'SharedWorker'));
    const broadcasts = await installBroadcastInterceptor(page);
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    const menu = await openAccountMenu(page);
    await menu.getByTestId('account-switcher-add').click();
    const loginForm = new LoginForm(page);
    await expect(loginForm.wifInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await loginForm.usernameInput.fill(STUB_ACCOUNT);
    await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await loginForm.wifInput.fill(SHARED_WIF);
    await loginForm.saveSignInButton.click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
    await page.reload();

    const dialog = await openCancelWithdrawDialog(page);
    await dialog.getByRole('button', { name: 'Cancel withdraw from savings' }).click();
    await expect(loginForm.enterYourPasswordForm).toBeVisible({ timeout: HYDRATION_TIMEOUT });

    await switchInOtherTab(page, context);

    await expect(loginForm.enterYourPasswordForm).toBeHidden();
    expect(broadcasts.calls).toHaveLength(0);
  });
});
