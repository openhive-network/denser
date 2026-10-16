import type { Page, Route } from '@playwright/test';
import { KeyType } from '@smart-signer/types/common';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';
import { clickUntilOpen } from '../support/uiPrimitives';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * An account using one key pair as both its posting and its active key: a WIF session signed in
 * with it holds both keys. The WIF sign-in that stores its key stores it as both, and the header
 * names both keys and offers no other key, whichever of them the session signed in as.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose WIF sign-in of SHARED_KEY_ACCOUNT
 * it repeats; the account's recorded posting and active authorities are answered with the public
 * key of FIXTURE_POSTING_WIF.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- sharedPostingActiveKey
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const FIXTURE_PROXY_PORT = 8200;
const SHARED_KEY_ACCOUNT = 'gtg';
/** The public key of FIXTURE_POSTING_WIF */
const SHARED_PUBLIC_KEY = 'STM8HD6C422sXmTgR7DsR8XFufQEYesNHYLGAZ2co6s1WtUSnafcM';
const EN_MENU = enBlog.navigation.user_menu;
// A page with the site header but no feed, as accountSwitchLogout.spec.ts
const PAGE_WITH_HEADER = '/faq.html';
// The sign-in loads the signing stack (wax, the hb-auth worker) first
const SIGN_IN_TIMEOUT_MS = 30_000;

interface AccountAuthorities {
  name: string;
  posting: unknown;
  active: unknown;
}

/** Answers SHARED_KEY_ACCOUNT's `find_accounts` with SHARED_PUBLIC_KEY as its posting and active key. */
async function shareAccountKey(page: Page): Promise<void> {
  const sharedAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[SHARED_PUBLIC_KEY, 1]] };
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route: Route) => {
      const body: { method?: string; params?: { accounts?: string[] } } | null =
        route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      if (body?.method !== 'database_api.find_accounts' || !body.params?.accounts?.includes(SHARED_KEY_ACCOUNT)) {
        return route.fallback();
      }
      const response = await route.fetch();
      const json: { result: { accounts: AccountAuthorities[] } } = await response.json();
      json.result.accounts = json.result.accounts.map((account) =>
        account.name === SHARED_KEY_ACCOUNT ? { ...account, posting: sharedAuthority, active: sharedAuthority } : account
      );
      return route.fulfill({ response, json });
    }
  );
}

async function storedWifKeys(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('wif.'))
      .sort()
  );
}

/** The avatar and the account menu name both keys, and the menu offers no other key. */
async function expectBothKeysHeld(page: Page, username: string) {
  const avatar = new HomePage(page).profileAvatarButton;
  await expect(avatar).toHaveAccessibleName(`${username} account menu, posting and active keys`, {
    timeout: SIGN_IN_TIMEOUT_MS
  });
  const menu = new ProfileUserMenu(page).profileMenuContent;
  await clickUntilOpen(avatar, menu);
  await expect(menu.getByTestId('login-authority-chip')).toHaveText(EN_MENU.key_type.posting_and_active);
  await expect(menu.getByTestId('login-key-action')).toHaveCount(0);
}

test.describe('A WIF sign-in with a key that is both the posting and the active key', () => {
  test('SHARED-KEY-01 — stores the key as both, and the header names both keys', async ({ page }) => {
    // The sign-in signs with a key that is not the account's: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    await shareAccountKey(page);
    await page.goto(PAGE_WITH_HEADER);

    const homePage = new HomePage(page);
    const loginForm = new LoginForm(page);
    await clickUntilOpen(homePage.profileAvatarButton, new ProfileUserMenu(page).profileMenuContent);
    await new ProfileUserMenu(page).addAccountItem.click();
    await loginForm.otherSignInOptionsButton.click();
    await loginForm.otherSignInOptionsUsernameInput.fill(SHARED_KEY_ACCOUNT);
    await loginForm.signInWithWifButton.click();
    await expect(loginForm.headerEnterYourWifKey).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await loginForm.storeKeyCheckbox.check();
    await loginForm.postingPrivateKeyInput.fill(FIXTURE_POSTING_WIF);
    await loginForm.postingPrivateKeySubmitButton.click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });

    await expectBothKeysHeld(page, SHARED_KEY_ACCOUNT);
    expect(await storedWifKeys(page)).toEqual(
      expect.arrayContaining([`wif.${SHARED_KEY_ACCOUNT}@active`, `wif.${SHARED_KEY_ACCOUNT}@posting`])
    );
  });
});

test.describe('An active-key WIF session whose key is stored as the posting key too', () => {
  test.use({ authenticatedUser: { authenticateOnBackend: true, keyType: KeyType.active } });

  test('SHARED-KEY-02 — the header names both keys instead of offering the posting key', async ({ page }) => {
    // The seeder stores FIXTURE_POSTING_WIF as the posting key
    await page
      .context()
      .addInitScript(
        ({ key, wif }) => window.localStorage.setItem(key, JSON.stringify(wif)),
        { key: `wif.${DEFAULT_USER.username}@active`, wif: FIXTURE_POSTING_WIF }
      );
    await page.goto(PAGE_WITH_HEADER);

    await expectBothKeysHeld(page, DEFAULT_USER.username);
  });
});
