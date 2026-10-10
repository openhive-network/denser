import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER, seedRememberedAccounts } from '../support/fixture-auth/seeder';
import type { User } from '@smart-signer/types/common';

/**
 * Account switching: a reader signed in to several accounts in one session
 * switches between them from the user menu without signing in again.
 *
 * The session (iron-session cookie) and localStorage are seeded as if the reader
 * had signed in to CURRENT and then OTHER, and is now acting as CURRENT. The
 * accounts authenticate on the backend, so a switch goes through
 * `/api/auth/switch`, which accepts only accounts the session holds.
 *
 * The seeder's init script rewrites `localStorage['user']` on every navigation,
 * so the tests assert a switch without navigating afterwards.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright test \
 *            --config=playwright.fixture.config.ts accountSwitch
 * Replay:  pnpm --filter @hive/blog test:fixture -- accountSwitch
 */

const CURRENT: User = { ...DEFAULT_USER, authenticateOnBackend: true };
const OTHER: User = { ...CURRENT, username: 'gtg' };
const NOT_SIGNED_IN = 'blocktrades';
const CSRF_HEADERS = { 'x-csrf-token': '1' };
// A page with the site header but no feed, to keep the recording small
const PAGE_WITH_HEADER = '/faq.html';

test.use({
  fixtureTestName: 'accountSwitch',
  authenticatedUser: { authenticateOnBackend: true }
});

async function readStoredUsername(page: Page): Promise<string> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}').username);
}

async function readStoredAccounts(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('accounts') || '[]').map((a: { username: string }) => a.username)
  );
}

test.describe('Account switching', () => {
  let homePage: HomePage;
  let profileMenu: ProfileUserMenu;

  test.beforeEach(async ({ page, context }) => {
    homePage = new HomePage(page);
    profileMenu = new ProfileUserMenu(page);
    await seedRememberedAccounts(context, [CURRENT, OTHER]);
    await page.goto(PAGE_WITH_HEADER);
    await expect(homePage.loginBtn).toBeHidden();
    await homePage.profileAvatarButton.click();
    await profileMenu.validateUserProfileManuIsOpen();
  });

  test('ACCOUNT-SWITCH-01: the menu switches to another signed-in account', async ({ page, context }) => {
    await profileMenu.validateUserNameInProfileMenu(CURRENT.username);
    await expect(profileMenu.accountSwitcherItems).toHaveCount(1);
    await expect(profileMenu.accountSwitcherItems).toContainText(OTHER.username);

    await profileMenu.accountSwitcherItems.click();

    await expect.poll(() => readStoredUsername(page)).toBe(OTHER.username);
    const me = await (await context.request.get('/api/users/me')).json();
    expect(me.username).toBe(OTHER.username);
    const observer = (await context.cookies()).find((cookie) => cookie.name === 'observer');
    expect(observer?.value).toBe(OTHER.username);

    await homePage.profileAvatarButton.click();
    await profileMenu.validateUserNameInProfileMenu(OTHER.username);
    await expect(profileMenu.accountSwitcherItems).toContainText(CURRENT.username);
  });

  test('ACCOUNT-SWITCH-02: the server refuses to switch to an account the session does not hold', async ({
    context
  }) => {
    const res = await context.request.post('/api/auth/switch', {
      headers: CSRF_HEADERS,
      data: { username: NOT_SIGNED_IN }
    });
    expect(res.status()).toBe(401);
    const me = await (await context.request.get('/api/users/me')).json();
    expect(me.username).toBe(CURRENT.username);
  });

  test('ACCOUNT-SWITCH-03: a removed account can no longer be switched to', async ({ page, context }) => {
    await profileMenu.accountSwitcherRemoveButtons.click();

    await expect(profileMenu.accountSwitcherItems).toHaveCount(0);
    await expect.poll(() => readStoredAccounts(page)).toEqual([CURRENT.username]);
    await profileMenu.validateUserNameInProfileMenu(CURRENT.username);
    const res = await context.request.post('/api/auth/switch', {
      headers: CSRF_HEADERS,
      data: { username: OTHER.username }
    });
    expect(res.status()).toBe(401);
  });

  test('ACCOUNT-SWITCH-04: logging out forgets every signed-in account', async ({ page, context }) => {
    // The UI logs out optimistically: wait for the server to end the session too
    const loggedOut = page.waitForResponse('**/api/auth/logout');
    await profileMenu.logoutLink.click();
    await loggedOut;

    await expect(homePage.loginBtn).toBeVisible();
    await expect.poll(() => readStoredAccounts(page)).toEqual([]);
    const res = await context.request.post('/api/auth/switch', {
      headers: CSRF_HEADERS,
      data: { username: OTHER.username }
    });
    expect(res.status()).toBe(401);
  });

  test('ACCOUNT-SWITCH-05: "Add account" opens the login dialog while logged in', async ({ page }) => {
    await profileMenu.addAccountItem.click();

    await expect(page.getByTestId('login-dialog')).toBeVisible();
    await expect(homePage.loginBtn).toBeHidden();
  });
});
