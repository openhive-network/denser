import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER, seedRememberedAccounts } from '../support/fixture-auth/seeder';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { FIXTURE_COOKIE_NAME, FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';
import type { User } from '@smart-signer/types/common';

/**
 * A server-held account stays signed in on the server only while it is the
 * active one: adding an account signed in on the client only (WIF, which the
 * fixture app signs in without the backend) makes the session stop acting as
 * it, and logging out then ends the session whatever the current account.
 *
 * The session and localStorage are seeded as in accountSwitch.spec.ts, with
 * SERVER_HELD the current user; the client-only account is added through the
 * login dialog.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright test \
 *            --config=playwright.fixture.config.ts accountSwitchLogout
 * Replay:  pnpm --filter @hive/blog test:fixture -- accountSwitchLogout
 */

const SERVER_HELD: User = { ...DEFAULT_USER, authenticateOnBackend: true };
const CLIENT_ONLY_USERNAME = 'gtg';
// A page with the site header but no feed, to keep the recording small
const PAGE_WITH_HEADER = '/faq.html';
// The sign-in loads the signing stack (wax, the hb-auth worker) first
const SIGN_IN_TIMEOUT_MS = 30_000;

test.use({
  fixtureTestName: 'accountSwitchLogout',
  authenticatedUser: { authenticateOnBackend: true }
});

async function readServerUser(context: BrowserContext): Promise<User> {
  return (await context.request.get('/api/users/me')).json();
}

async function readCookie(context: BrowserContext, name: string): Promise<string | undefined> {
  return (await context.cookies()).find((cookie) => cookie.name === name)?.value;
}

async function readStoredUsername(page: Page): Promise<string> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}').username);
}

/** Adds the client-only account through "Add account" and resolves once it is the active one. */
async function addClientOnlyAccount(page: Page): Promise<void> {
  const homePage = new HomePage(page);
  const profileMenu = new ProfileUserMenu(page);
  const loginForm = new LoginForm(page);
  await expect(homePage.loginBtn).toBeHidden();
  await homePage.profileAvatarButton.click();
  await profileMenu.validateUserProfileManuIsOpen();
  await profileMenu.addAccountItem.click();

  await loginForm.otherSignInOptionsButton.click();
  await loginForm.otherSignInOptionsUsernameInput.fill(CLIENT_ONLY_USERNAME);
  await loginForm.signInWithWifButton.click();
  await loginForm.postingPrivateKeyInput.fill(FIXTURE_POSTING_WIF);
  await loginForm.postingPrivateKeySubmitButton.click();

  await expect.poll(() => readStoredUsername(page), { timeout: SIGN_IN_TIMEOUT_MS }).toBe(CLIENT_ONLY_USERNAME);
}

test.describe('Account switching and the server session', () => {
  test.beforeEach(async ({ page, context }) => {
    // The sign-in signs with a key that is not the account's: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    await seedRememberedAccounts(context, [SERVER_HELD]);
    await page.goto(PAGE_WITH_HEADER);
    expect((await readServerUser(context)).username).toBe(SERVER_HELD.username);
  });

  test('ACCOUNT-SWITCH-12: adding a client-only account stops the server acting as the server-held one', async ({
    page,
    context
  }) => {
    await addClientOnlyAccount(page);

    const me = await readServerUser(context);
    expect(me.isLoggedIn).toBe(false);
    expect(me.username).not.toBe(SERVER_HELD.username);
    expect(await readCookie(context, 'account_info')).toBeUndefined();
  });

  test('ACCOUNT-SWITCH-13: logging out as a client-only account ends the server session', async ({
    page,
    context
  }) => {
    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    await addClientOnlyAccount(page);
    await homePage.profileAvatarButton.click();
    await profileMenu.validateUserNameInProfileMenu(CLIENT_ONLY_USERNAME);

    const loggedOut = page.waitForResponse('**/api/auth/logout');
    await profileMenu.logoutLink.click();
    expect((await loggedOut).ok()).toBe(true);

    expect((await readServerUser(context)).isLoggedIn).toBe(false);
    expect(await readCookie(context, FIXTURE_COOKIE_NAME)).toBeFalsy();
    expect(await readCookie(context, 'account_info')).toBeUndefined();
    // The session no longer holds the server-held account to switch back to either
    const switched = await context.request.post('/api/auth/switch', {
      headers: { 'x-csrf-token': '1' },
      data: { username: SERVER_HELD.username }
    });
    expect(switched.status()).toBe(401);

    // The seeder's init script stores its user again on navigation: only the server side is checked
    await page.reload();
    expect((await readServerUser(context)).isLoggedIn).toBe(false);
    expect(await readCookie(context, FIXTURE_COOKIE_NAME)).toBeFalsy();
  });
});
