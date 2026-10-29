import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER, seedRememberedAccounts } from '../support/fixture-auth/seeder';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';

/**
 * The login challenge is issued on demand by GET /api/auth/challenge, as an HttpOnly cookie and
 * in the response, and pages set no challenge cookie. A sign-in started on a page that never set
 * one gets its challenge when signing starts.
 *
 * Reuses the accountSwitchLogout recording and its WIF "add account" sign-in
 * (accountSwitchLogout.spec.ts).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- loginChallenge
 */

const SERVER_COOKIE = 'blog_login_challenge_server';
const READABLE_COOKIE = 'blog_login_challenge';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CLIENT_ONLY_USERNAME = 'gtg';
// A page with the site header but no feed, as accountSwitchLogout.spec.ts
const PAGE_WITH_HEADER = '/faq.html';
// The sign-in loads the signing stack (wax, the hb-auth worker) first
const SIGN_IN_TIMEOUT_MS = 30_000;

test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const challengeCookies = async (context: BrowserContext) =>
  (await context.cookies()).filter(({ name }) => name === SERVER_COOKIE || name === READABLE_COOKIE);

async function readStoredUsername(page: Page): Promise<string> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}').username);
}

test.describe('On-demand login challenge', () => {
  test('LOGIN-CHALLENGE-01 — the challenge route sets the HttpOnly cookie, answers no-store and keeps the challenge', async ({
    playwright,
    baseURL
  }) => {
    const context = await playwright.request.newContext({ baseURL });
    try {
      const first = await context.get('/api/auth/challenge');
      expect(first.status()).toBe(200);
      expect(first.headers()['cache-control']).toBe('no-store');
      const { loginChallenge } = await first.json();
      expect(loginChallenge).toMatch(UUID);
      const setCookie = first.headersArray().filter(({ name }) => name.toLowerCase() === 'set-cookie');
      expect(setCookie).toHaveLength(1);
      expect(setCookie[0].value).toContain(`${SERVER_COOKIE}=${loginChallenge};`);
      expect(setCookie[0].value).toContain('HttpOnly');

      const second = await context.get('/api/auth/challenge');
      expect(await second.json()).toEqual({ loginChallenge });
      expect(second.headersArray().filter(({ name }) => name.toLowerCase() === 'set-cookie')).toEqual([]);
    } finally {
      await context.dispose();
    }
  });

  test('LOGIN-CHALLENGE-02 — a WIF sign-in on a page that set no challenge cookie gets one and succeeds', async ({
    page,
    context
  }) => {
    // The sign-in signs with a key that is not the account's: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    await seedRememberedAccounts(context, [{ ...DEFAULT_USER, authenticateOnBackend: true }]);
    await page.goto(PAGE_WITH_HEADER);
    expect(await challengeCookies(context)).toEqual([]);

    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    const loginForm = new LoginForm(page);
    await expect(homePage.loginBtn).toBeHidden();
    await homePage.profileAvatarButton.click();
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.addAccountItem.click();
    await loginForm.otherSignInOptionsButton.click();
    await loginForm.otherSignInOptionsUsernameInput.fill(CLIENT_ONLY_USERNAME);
    // Signing starts here; the key is asked for by the signer, once it has the challenge
    const challenged = page.waitForResponse('**/api/auth/challenge', { timeout: SIGN_IN_TIMEOUT_MS });
    await loginForm.signInWithWifButton.click();
    const challenge = await challenged;
    expect(challenge.ok()).toBe(true);
    await loginForm.postingPrivateKeyInput.fill(FIXTURE_POSTING_WIF);
    await loginForm.postingPrivateKeySubmitButton.click();

    await expect.poll(() => readStoredUsername(page), { timeout: SIGN_IN_TIMEOUT_MS }).toBe(CLIENT_ONLY_USERNAME);
    const { loginChallenge } = await challenge.json();
    const cookies = await challengeCookies(context);
    expect(cookies.map(({ name, value, httpOnly }) => ({ name, value, httpOnly }))).toEqual([
      { name: SERVER_COOKIE, value: loginChallenge, httpOnly: true }
    ]);
  });
});
