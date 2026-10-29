import type { Page, Route } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';
import { clickUntilOpen } from '../support/uiPrimitives';

/**
 * The Blog's safe-storage sign-in stores the posting key: a key of the account's active authority
 * but not of its posting one is refused in place, the key field cleared, before anything is stored,
 * with a message naming the posting key instead of hb-auth's "Invalid credentials". The Wallet's
 * mirror case is apps/wallet/playwright/tests/fixture/safeStorageLoginKeyRole.spec.ts.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose add-account dialog it opens;
 * the account's recorded active authority is answered with the public key of FIXTURE_POSTING_WIF.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStorageLoginKeyRole
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const FIXTURE_PROXY_PORT = 8200;
const ACCOUNT = 'gtg';
/** The public key of FIXTURE_POSTING_WIF */
const ACTIVE_PUBLIC_KEY = 'STM8HD6C422sXmTgR7DsR8XFufQEYesNHYLGAZ2co6s1WtUSnafcM';
const SAFE_STORAGE_PASSWORD = 'fixture-password';
const ACTIVE_KEY_ERROR = "This key doesn't have posting authority. Blog sign-in requires the posting key";
const INVALID_CREDENTIALS = 'Invalid credentials';
// A page with the site header but no feed, as accountSwitchLogout.spec.ts
const PAGE_WITH_HEADER = '/faq.html';
// The sign-in loads the signing stack (wax, the hb-auth worker) first
const SIGN_IN_TIMEOUT_MS = 30_000;

interface AccountAuthorities {
  name: string;
  active: unknown;
}

/** Answers ACCOUNT's `find_accounts` with ACTIVE_PUBLIC_KEY as its active key only. */
async function makeActiveKey(page: Page): Promise<void> {
  const activeAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[ACTIVE_PUBLIC_KEY, 1]] };
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route: Route) => {
      const body: { method?: string; params?: { accounts?: string[] } } | null =
        route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      if (body?.method !== 'database_api.find_accounts' || !body.params?.accounts?.includes(ACCOUNT)) {
        return route.fallback();
      }
      const response = await route.fetch();
      const json: { result: { accounts: AccountAuthorities[] } } = await response.json();
      json.result.accounts = json.result.accounts.map((account) =>
        account.name === ACCOUNT ? { ...account, active: activeAuthority } : account
      );
      return route.fulfill({ response, json });
    }
  );
}

test.describe('Safe-storage sign-in with a key of the wrong role', () => {
  test('BLOG-SAFE-STORAGE-LOGIN-01 — an active key keeps the form open, naming the posting key', async ({
    page
  }) => {
    await makeActiveKey(page);
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);
    await clickUntilOpen(new HomePage(page).profileAvatarButton, profileMenu.profileMenuContent);
    await profileMenu.addAccountItem.click();
    await expect(loginForm.wifInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await loginForm.usernameInput.fill(ACCOUNT);
    await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await loginForm.wifInput.fill(FIXTURE_POSTING_WIF);
    await loginForm.saveSignInButton.click();

    await expect(loginForm.wifInputErrorMessage).toHaveText(ACTIVE_KEY_ERROR, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(loginForm.loginFormHeader).toBeVisible();
    await expect(loginForm.wifInput).toHaveValue('');
    await expect(loginForm.loginDialog).not.toContainText(INVALID_CREDENTIALS);
  });
});
