import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER, seedRememberedAccounts } from '../support/fixture-auth/seeder';
import type { User } from '@smart-signer/types/common';

/**
 * Account switching keeps accounts apart: removing one deletes the keys and
 * tokens stored for it, the server session follows every switch (also to an
 * account signed in on the client only), other tabs follow it, no data of the
 * previous account stays on screen, and a failed removal is reported.
 *
 * The session and localStorage are seeded as in accountSwitch.spec.ts. The
 * seeder's init script rewrites `localStorage['user']` on every navigation, so
 * the tests assert a switch without navigating afterwards.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright test \
 *            --config=playwright.fixture.config.ts accountSwitchSafety
 * Replay:  pnpm --filter @hive/blog test:fixture -- accountSwitchSafety
 */

const CURRENT: User = { ...DEFAULT_USER, authenticateOnBackend: true };
const OTHER: User = { ...CURRENT, username: 'gtg' };
const CLIENT_ONLY_OTHER: User = { ...OTHER, authenticateOnBackend: false };
const CSRF_HEADERS = { 'x-csrf-token': '1' };
// A page with the site header but no feed, to keep the recording small
const PAGE_WITH_HEADER = '/faq.html';
// A page with the subscriptions sidebar
const PAGE_WITH_SIDEBAR = '/trending';
// First of each account's subscribed communities (bridge.list_all_subscriptions)
const CURRENT_SUBSCRIPTION = 'hive-163772';
const OTHER_SUBSCRIPTION = 'hive-139531';

test.use({
  fixtureTestName: 'accountSwitchSafety',
  authenticatedUser: { authenticateOnBackend: true }
});

/** Credentials as the signers store them for `username`. */
function credentialsOf(username: string): Record<string, string> {
  return {
    [`wif.${username}@posting`]: JSON.stringify('posting-wif'),
    [`wif.${username}@active`]: JSON.stringify('active-wif'),
    [`hiveAuthData.${username}`]: JSON.stringify({ username, token: 'token', expire: 0, key: 'key' }),
    [`google_refresh_token.${username}`]: 'refresh-token',
    [`gdrive_encryption_key_wif.${username}`]: 'encryption-wif'
  };
}

/** Stores `credentials` before the first page script runs; entries a test removed stay removed. */
async function seedCredentials(context: BrowserContext, credentials: Record<string, string>): Promise<void> {
  await context.addInitScript((entries) => {
    if (window.localStorage.getItem('credentials-seeded') !== null) return;
    window.localStorage.setItem('credentials-seeded', '1');
    for (const [key, value] of Object.entries(entries)) window.localStorage.setItem(key, value);
  }, credentials);
}

async function readStoredKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(window.localStorage).sort());
}

async function readStoredCredentialsOf(page: Page, username: string): Promise<string[]> {
  const keys = Object.keys(credentialsOf(username));
  return (await readStoredKeys(page)).filter((key) => keys.includes(key));
}

async function readStoredUsername(page: Page): Promise<string> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}').username);
}

async function readServerUser(context: BrowserContext): Promise<User> {
  return (await context.request.get('/api/users/me')).json();
}

async function readAccountInfoCookie(context: BrowserContext): Promise<string | undefined> {
  return (await context.cookies()).find((cookie) => cookie.name === 'account_info')?.value;
}

async function openUserMenu(page: Page): Promise<ProfileUserMenu> {
  const homePage = new HomePage(page);
  const profileMenu = new ProfileUserMenu(page);
  await expect(homePage.loginBtn).toBeHidden();
  await homePage.profileAvatarButton.click();
  await profileMenu.validateUserProfileManuIsOpen();
  return profileMenu;
}

test.describe('Account switching safety', () => {
  test('ACCOUNT-SWITCH-06: removing an account deletes the keys and tokens stored for it', async ({
    page,
    context
  }) => {
    await seedRememberedAccounts(context, [CURRENT, OTHER]);
    await seedCredentials(context, credentialsOf(OTHER.username));
    await page.goto(PAGE_WITH_HEADER);
    const profileMenu = await openUserMenu(page);
    await expect(profileMenu.accountSwitcherItems).toContainText(OTHER.username);
    await expect(page.getByTestId('account-switcher-login-method')).toContainText('WIF Key');

    await profileMenu.accountSwitcherRemoveButtons.click();

    await expect(profileMenu.accountSwitcherItems).toHaveCount(0);
    await expect.poll(() => readStoredCredentialsOf(page, OTHER.username)).toEqual([]);
    expect(await readStoredKeys(page)).toContain(`wif.${CURRENT.username}@posting`);
  });

  test('ACCOUNT-SWITCH-07: logging out deletes the keys and tokens of every account', async ({ page, context }) => {
    await seedRememberedAccounts(context, [CURRENT, OTHER]);
    await seedCredentials(context, { ...credentialsOf(CURRENT.username), ...credentialsOf(OTHER.username) });
    await page.goto(PAGE_WITH_HEADER);
    const profileMenu = await openUserMenu(page);

    const loggedOut = page.waitForResponse('**/api/auth/logout');
    await profileMenu.logoutLink.click();
    await loggedOut;

    await expect.poll(() => readStoredCredentialsOf(page, CURRENT.username)).toEqual([]);
    expect(await readStoredCredentialsOf(page, OTHER.username)).toEqual([]);
  });

  test('ACCOUNT-SWITCH-08: a consent change survives switching away and back', async ({ context }) => {
    const chatClient = 'openhive_chat';
    const consenting = { ...CURRENT, oauthConsent: { [chatClient]: true } };
    await seedRememberedAccounts(context, [consenting, OTHER]);

    const revoked = await context.request.post('/api/auth/consent', {
      headers: CSRF_HEADERS,
      data: { oauthClientId: chatClient, consent: false }
    });
    expect(revoked.ok()).toBe(true);
    for (const username of [OTHER.username, CURRENT.username]) {
      const switched = await context.request.post('/api/auth/switch', { headers: CSRF_HEADERS, data: { username } });
      expect(switched.ok()).toBe(true);
    }

    const me = await readServerUser(context);
    expect(me.username).toBe(CURRENT.username);
    expect(me.oauthConsent[chatClient]).toBe(false);
  });

  test('ACCOUNT-SWITCH-09: the server session and a second tab follow a switch to a client-only account', async ({
    page,
    context
  }) => {
    await seedRememberedAccounts(context, [CURRENT, CLIENT_ONLY_OTHER]);
    await page.goto(PAGE_WITH_HEADER);
    const secondTab = await context.newPage();
    await secondTab.goto(PAGE_WITH_HEADER);
    const profileMenu = await openUserMenu(page);

    await profileMenu.accountSwitcherItems.click();

    await expect.poll(() => readStoredUsername(page)).toBe(CLIENT_ONLY_OTHER.username);
    // The server holds no unverified account: it stops acting as the previous one
    expect((await readServerUser(context)).isLoggedIn).toBe(false);
    expect(await readAccountInfoCookie(context)).toBeUndefined();
    const secondTabMenu = await openUserMenu(secondTab);
    await secondTabMenu.validateUserNameInProfileMenu(CLIENT_ONLY_OTHER.username);
    await secondTab.keyboard.press('Escape');

    await (await openUserMenu(page)).accountSwitcherItems.click();

    await expect.poll(async () => (await readServerUser(context)).username).toBe(CURRENT.username);
    expect(await readAccountInfoCookie(context)).toBe(`${CURRENT.username}:${CURRENT.loginType}`);
    await expect.poll(() => readStoredUsername(secondTab)).toBe(CURRENT.username);
  });

  test('ACCOUNT-SWITCH-10: after a switch the sidebar shows none of the previous account\'s subscriptions', async ({
    page,
    context,
    fixtureProxy
  }) => {
    await seedRememberedAccounts(context, [CURRENT, OTHER]);
    await page.goto(PAGE_WITH_SIDEBAR);
    const subscriptions = page.getByTestId('card-trending-comunities').filter({ hasText: 'My subscriptions' });
    await expect(subscriptions.locator(`a[href$="/trending/${CURRENT_SUBSCRIPTION}"]`)).toBeVisible();

    // While the new account's subscriptions load, nothing of the previous account's may stand in for them
    const release = fixtureProxy.holdResponses(
      (call) => call.method === 'bridge.list_all_subscriptions' && call.params.account === OTHER.username
    );
    try {
      const profileMenu = await openUserMenu(page);
      await profileMenu.accountSwitcherItems.click();
      await expect.poll(() => readStoredUsername(page)).toBe(OTHER.username);
      await expect(subscriptions.locator(`a[href$="/trending/${CURRENT_SUBSCRIPTION}"]`)).toHaveCount(0);
    } finally {
      release();
    }

    await expect(subscriptions.locator(`a[href$="/trending/${OTHER_SUBSCRIPTION}"]`)).toBeVisible();
    await expect(subscriptions.locator(`a[href$="/trending/${CURRENT_SUBSCRIPTION}"]`)).toHaveCount(0);
  });

  test('ACCOUNT-SWITCH-11: a failed removal shows an error and keeps the account', async ({ page, context }) => {
    await seedRememberedAccounts(context, [CURRENT, OTHER]);
    await page.route('**/api/auth/remove-account', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    );
    await page.goto(PAGE_WITH_HEADER);
    const profileMenu = await openUserMenu(page);

    await profileMenu.accountSwitcherRemoveButtons.click();

    await expect(page.getByText(`Could not remove ${OTHER.username}.`, { exact: true })).toBeVisible();
    await expect(profileMenu.accountSwitcherItems).toContainText(OTHER.username);
  });
});
