import type { Page } from '@playwright/test';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { gotoPostLoggedIn } from '../support/reblogShareContext';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';
import { clickUntilOpen } from '../support/uiPrimitives';
import enBlog from '../../../locales/en/common_blog.json';
import plBlog from '../../../locales/pl/common_blog.json';

/**
 * The header tells how powerful the login is: a key badge on the avatar while a safe-storage or WIF
 * session holds the active key, the key (or, for a signer that picks the key per operation, the
 * signer's name) in the account menu and in the avatar button's accessible name, and a menu item that
 * moves a one-key session to the other key by opening the login dialog for the same account.
 *
 * Fixtures: reuses `reblogShare` (read-only on replay); the header is the same on every page.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- loginKeyIndicator
 */

test.skip(isRecordMode, 'replay-only: shares the reblogShare recording');
test.use({ fixtureTestName: 'reblogShare' });

const USERNAME = DEFAULT_USER.username;
const EN_MENU = enBlog.navigation.user_menu;
const VIEWPORTS = [
  { width: 375, height: 800 },
  { width: 1280, height: 800 }
];

async function openAccountMenu(page: Page) {
  const menu = new ProfileUserMenu(page).profileMenuContent;
  await clickUntilOpen(new HomePage(page).profileAvatarButton, menu);
  return menu;
}

async function expectKeyLoginDialog(page: Page, keyType: KeyType) {
  const loginForm = new LoginForm(page);
  await expect(loginForm.loginDialog).toBeVisible();
  await expect(loginForm.usernameInput).toHaveValue(USERNAME);
  await expect(loginForm.wifInput).toHaveAttribute('placeholder', `WIF ${keyType} private key`);
}

test.describe('Safe storage session with the active key', () => {
  test.use({ authenticatedUser: { loginType: LoginType.hbauth, keyType: KeyType.active } });

  test('LOGIN-KEY-01 — the avatar carries the key badge and names the active key, and the menu switches to the posting key', async ({
    page
  }) => {
    await gotoPostLoggedIn(page);
    const avatar = new HomePage(page).profileAvatarButton;
    const badge = avatar.getByTestId('login-key-badge');

    await expect(avatar).toHaveAccessibleName(`${USERNAME} account menu, active key`);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('title', EN_MENU.active_key_badge);

    const menu = await openAccountMenu(page);
    await expect(menu.getByTestId('login-authority-chip')).toHaveText(EN_MENU.key_type.active);
    const action = menu.getByTestId('login-key-action');
    await expect(action).toHaveText(EN_MENU.switch_to_posting_key);
    await action.click();
    await expectKeyLoginDialog(page, KeyType.posting);
  });

  test('LOGIN-KEY-02 — the badge does not move the avatar at mobile or desktop width', async ({ page }) => {
    await gotoPostLoggedIn(page);
    const avatar = new HomePage(page).profileAvatarButton;
    const badge = avatar.getByTestId('login-key-badge');

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await expect(badge).toBeVisible();
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

  test('LOGIN-KEY-03 — the key and the badge are translated', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL ?? '' }]);
    const plMenu = plBlog.navigation.user_menu;
    await gotoPostLoggedIn(page);
    const avatar = new HomePage(page).profileAvatarButton;

    await expect(avatar).toHaveAccessibleName(plMenu.account_menu_key.active.replace('{{username}}', USERNAME));
    await expect(avatar.getByTestId('login-key-badge')).toHaveAttribute('title', plMenu.active_key_badge);
    const menu = await openAccountMenu(page);
    await expect(menu.getByTestId('login-authority-chip')).toHaveText(plMenu.key_type.active);
    await expect(menu.getByTestId('login-key-action')).toHaveText(plMenu.switch_to_posting_key);
  });
});

test.describe('Safe storage session with the posting key', () => {
  test.use({ authenticatedUser: { loginType: LoginType.hbauth, keyType: KeyType.posting } });

  test('LOGIN-KEY-04 — no badge, the posting key named, and the menu leads to an active-key login of the account', async ({
    page
  }) => {
    await gotoPostLoggedIn(page);
    const avatar = new HomePage(page).profileAvatarButton;

    await expect(avatar).toHaveAccessibleName(`${USERNAME} account menu, posting key`);
    await expect(avatar.getByTestId('login-key-badge')).toHaveCount(0);

    const menu = await openAccountMenu(page);
    await expect(menu.getByTestId('login-authority-chip')).toHaveText(EN_MENU.key_type.posting);
    const action = menu.getByTestId('login-key-action');
    await expect(action).toHaveText(EN_MENU.log_in_with_active_key);
    await action.click();
    await expectKeyLoginDialog(page, KeyType.active);
  });
});

test.describe('Keychain session', () => {
  // Signed in with the active key: a signer is shown by name whatever key signed its login
  test.use({ authenticatedUser: { loginType: LoginType.keychain, keyType: KeyType.active } });

  test('LOGIN-KEY-05 — the signer is named, with no badge and no key action', async ({ page }) => {
    await gotoPostLoggedIn(page);
    const avatar = new HomePage(page).profileAvatarButton;

    await expect(avatar).toHaveAccessibleName(`${USERNAME} account menu, ${EN_MENU.login_method.keychain}`);
    await expect(avatar.getByTestId('login-key-badge')).toHaveCount(0);

    const menu = await openAccountMenu(page);
    await expect(menu.getByTestId('login-authority-chip')).toHaveText(EN_MENU.login_method.keychain);
    await expect(menu.getByTestId('login-key-action')).toHaveCount(0);
  });
});
