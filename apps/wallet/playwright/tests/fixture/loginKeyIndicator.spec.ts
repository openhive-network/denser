import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { LoginForm } from '../support/pages/loginForm';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';
import enWallet from '../../../locales/en/common_wallet.json';

/**
 * The wallet header tells how powerful the login is: a key badge on the avatar while a safe-storage
 * or WIF session holds the active key, the key (or, for a signer that picks the key per operation,
 * the signer's name) in the account menu and in the avatar button's accessible name, and a menu item
 * that gives the active key up by signing the same account in with its posting key. A posting
 * session counts as logged out here (postingSessionActiveKey.spec.ts), so it has no avatar at all.
 * Reads come from the stub node (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;
const EN_MENU = enWallet.navigation.user_menu;
const VIEWPORTS = [
  { width: 375, height: 800 },
  { width: 1280, height: 800 }
];
/** Randomly generated, of no account. */
const POSTING_WIF = '5JSTSDF5nUcChE6SeyWG28ktUevv1Bg6rUnmueRQw2cxyGqE4oT';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
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

const storedUser = (page: Page) =>
  page.evaluate((): unknown => JSON.parse(window.localStorage.getItem('user') ?? 'null'));

async function openAccountMenu(page: Page) {
  const menu = page.getByRole('menu');
  await expect(async () => {
    await page.getByTestId('profile-avatar-button').click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return menu;
}

test.describe('A safe storage session with the active key', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsStubAccount(page, { loginType: 'hbauth', keyType: 'active' });
  });

  test('WALLET-LOGIN-KEY-01 — the avatar carries the key badge and names the active key, and the menu switches to the posting key', async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await page.goto(ownTransfersPage);
    const avatar = page.getByTestId('profile-avatar-button');
    const badge = avatar.getByTestId('login-key-badge');

    await expect(avatar).toHaveAccessibleName(`${STUB_ACCOUNT} account menu, active key`, {
      timeout: HYDRATION_TIMEOUT
    });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('title', EN_MENU.active_key_badge);

    const menu = await openAccountMenu(page);
    await expect(menu.getByTestId('login-authority-chip')).toHaveText(EN_MENU.key_type.active);
    const action = menu.getByTestId('login-key-action');
    await expect(action).toHaveText(EN_MENU.switch_to_posting_key);
    await action.click();

    const loginForm = new LoginForm(page);
    await expect(loginForm.loginDialog).toBeVisible();
    await expect(loginForm.usernameInput).toHaveValue(STUB_ACCOUNT);
    await expect(loginForm.wifInput).toHaveAttribute('placeholder', 'WIF posting private key');

    await loginForm.otherSignInOptionsButton.click();
    await expect(loginForm.otherSignInOptionsUsernameInput).toHaveValue(STUB_ACCOUNT);
    await loginForm.signInWithWifButton.click();
    await expect(loginForm.headerEnterYourWifKey).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await loginForm.postingPrivateKeyInput.fill(POSTING_WIF);
    await loginForm.postingPrivateKeySubmitButton.click();

    // The posting session the wallet cannot sign with
    await expect(page.getByTestId('active-key-required-notice')).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await expect(avatar).toHaveCount(0);
    expect(await storedUser(page)).toMatchObject({ isLoggedIn: true, username: STUB_ACCOUNT, keyType: 'posting' });
  });

  test('WALLET-LOGIN-KEY-02 — the badge does not move the avatar at mobile or desktop width', async ({ page }) => {
    await page.goto(ownTransfersPage);
    const avatar = page.getByTestId('profile-avatar-button');
    const badge = avatar.getByTestId('login-key-badge');

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await expect(badge).toBeVisible({ timeout: HYDRATION_TIMEOUT });
      await expect(badge).toHaveCSS('position', 'absolute');
      const withBadge = await avatar.boundingBox();
      await badge.evaluate((element) => {
        element.style.display = 'none';
      });
      expect(await avatar.boundingBox(), `${viewport.width}px`).toEqual(withBadge);
      await badge.evaluate((element) => {
        element.style.display = '';
      });
    }
  });
});

test.describe('A safe storage session with the posting key', () => {
  test('WALLET-LOGIN-KEY-03 — has no avatar or badge; the wallet asks for the active key instead', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'hbauth', keyType: 'posting' });
    await page.goto(ownTransfersPage);

    await expect(page.getByTestId('active-key-required-notice')).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await expect(page.getByTestId('profile-avatar-button')).toHaveCount(0);
    await expect(page.getByTestId('login-key-badge')).toHaveCount(0);
  });
});

test.describe('A Keychain session', () => {
  test('WALLET-LOGIN-KEY-04 — the signer is named, with no badge and no key action', async ({ page }) => {
    await logInAsStubAccount(page, { loginType: 'keychain', keyType: 'active' });
    await page.goto(ownTransfersPage);
    const avatar = page.getByTestId('profile-avatar-button');

    await expect(avatar).toHaveAccessibleName(`${STUB_ACCOUNT} account menu, ${EN_MENU.login_method.keychain}`, {
      timeout: HYDRATION_TIMEOUT
    });
    await expect(avatar.getByTestId('login-key-badge')).toHaveCount(0);

    const menu = await openAccountMenu(page);
    await expect(menu.getByTestId('login-authority-chip')).toHaveText(EN_MENU.login_method.keychain);
    await expect(menu.getByTestId('login-key-action')).toHaveCount(0);
  });
});
