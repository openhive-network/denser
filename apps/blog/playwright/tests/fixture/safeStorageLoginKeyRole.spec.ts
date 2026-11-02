import type { Locator, Page, Route } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { clickUntilOpen } from '../support/uiPrimitives';

/**
 * The Blog's safe-storage sign-in stores the posting key: a key of the account's active authority
 * but not of its posting one is refused in place, the key field cleared, before anything is stored,
 * with a message naming the posting key instead of hb-auth's "Invalid credentials". So is a key
 * added to an account safe storage already holds ("Add new key"), and a key of no authority of the
 * account at all (another account's), which the chain's `verify_authority` refuses. A key of an
 * account the account's posting authority lists in `account_auths` is still stored with Direct
 * Authority Mode off. The Wallet's mirror case is
 * apps/wallet/playwright/tests/fixture/safeStorageLoginKeyRole.spec.ts.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose add-account dialog it opens;
 * the account's recorded posting or active authority is answered with the public key of
 * FIXTURE_POSTING_WIF, or with OTHER_ACCOUNT in its `account_auths`.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStorageLoginKeyRole
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const FIXTURE_PROXY_PORT = 8200;
const ACCOUNT = 'gtg';
/** An account holding FIXTURE_POSTING_WIF's key, which is none of ACCOUNT's own */
const OTHER_ACCOUNT = 'guest4test1';
/** The public key of FIXTURE_POSTING_WIF */
const KEY_PUBLIC_KEY = 'STM8HD6C422sXmTgR7DsR8XFufQEYesNHYLGAZ2co6s1WtUSnafcM';
const SAFE_STORAGE_PASSWORD = 'fixture-password';
const ACTIVE_KEY_ERROR = "This key doesn't have posting authority. Blog sign-in requires the posting key";
const INVALID_CREDENTIALS = 'Invalid credentials';
const ADD_NEW_KEY = 'Add new key';
const UPDATE_KEY_TITLE = 'Add New Key to Safe Storage';
// A page with the site header but no feed, as accountSwitchLogout.spec.ts
const PAGE_WITH_HEADER = '/faq.html';
// The sign-in loads the signing stack (wax, the hb-auth worker) first
const SIGN_IN_TIMEOUT_MS = 30_000;

interface AccountAuthorities {
  name: string;
  posting: unknown;
  active: unknown;
}

type KeyRole = 'posting' | 'active';

type AuthorityOverrides = Partial<Record<KeyRole, unknown>>;

/** Answers ACCOUNT's `find_accounts` with the authorities `overrides()` gives in place of the recorded ones */
async function overrideAuthorities(page: Page, overrides: () => AuthorityOverrides): Promise<void> {
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route: Route) => {
      const body: { method?: string; params?: { accounts?: string[] } } | null =
        route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      if (body?.method !== 'database_api.find_accounts' || !body.params?.accounts?.includes(ACCOUNT)) {
        return route.fallback();
      }
      // hb-auth's own lookup, after verify_authority, leaves `delayed_votes_active` out: ask the recorded read
      const response = await route.fetch({
        postData: { ...body, params: { ...body.params, delayed_votes_active: false } }
      });
      const json: { result: { accounts: AccountAuthorities[] } } = await response.json();
      json.result.accounts = json.result.accounts.map((account) =>
        account.name === ACCOUNT ? { ...account, ...overrides() } : account
      );
      return route.fulfill({ response, json });
    }
  );
}

/** Answers ACCOUNT's `find_accounts` with KEY_PUBLIC_KEY as the key of `role()` only; of none of them for null */
async function giveKeyRole(page: Page, role: () => KeyRole | null): Promise<void> {
  const keyAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[KEY_PUBLIC_KEY, 1]] };
  await overrideAuthorities(page, () => {
    const keyRole = role();
    return keyRole ? { [keyRole]: keyAuthority } : {};
  });
}

/** Answers safe storage's lookup of KEY_PUBLIC_KEY's accounts, made when it registers the key, with `owner` */
async function answerKeyReferences(page: Page, owner = ACCOUNT): Promise<void> {
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route: Route) => {
      const body: { id?: unknown; method?: string } | null =
        route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      if (body?.method !== 'account_by_key_api.get_key_references') return route.fallback();
      return route.fulfill({ json: { jsonrpc: '2.0', id: body.id, result: { accounts: [[owner]] } } });
    }
  );
}

/** While `refused()`, answers `verify_authority` as hived does a signature without ACCOUNT's posting authority */
async function refusePostingAuthority(page: Page, refused: () => boolean = () => true): Promise<void> {
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route: Route) => {
      const body: { id?: unknown; method?: string } | null =
        route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      if (!body?.method?.endsWith('.verify_authority') || !refused()) return route.fallback();
      const message = `missing required posting authority:Missing Posting Authority ${ACCOUNT}`;
      return route.fulfill({ json: { jsonrpc: '2.0', id: body.id, error: { code: -32003, message } } });
    }
  );
}

async function fillSignInForm(loginForm: LoginForm): Promise<void> {
  await expect(loginForm.wifInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
  await loginForm.usernameInput.fill(ACCOUNT);
  await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
  await loginForm.wifInput.fill(FIXTURE_POSTING_WIF);
}

/** Stores ACCOUNT's key in safe storage through the add-account dialog, which then closes */
async function storeAccount(page: Page): Promise<void> {
  const loginForm = await openAddAccountDialog(page);
  await fillSignInForm(loginForm);
  await loginForm.saveSignInButton.click();
  await loginForm.dismissBiometricPromptIfPresent();
  await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
}

/** Offers FIXTURE_POSTING_WIF on "Add new key" of the account safe storage holds; resolves with the dialog */
async function addNewKey(page: Page): Promise<Locator> {
  const loginForm = await openAddAccountDialog(page);
  await expect(loginForm.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
  await loginForm.loginDialog.getByText(ADD_NEW_KEY, { exact: true }).click();
  const updateKeyForm = loginForm.loginDialog;
  await expect(updateKeyForm.getByText(UPDATE_KEY_TITLE)).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
  await updateKeyForm.getByTestId('login-form-password').fill(SAFE_STORAGE_PASSWORD);
  await updateKeyForm.getByTestId('login-form-wif').fill(FIXTURE_POSTING_WIF);
  await updateKeyForm.getByTestId('login-form-update-key').click();
  return updateKeyForm;
}

async function expectSignInKeyRefused(loginForm: LoginForm): Promise<void> {
  await expect(loginForm.wifInputErrorMessage).toHaveText(ACTIVE_KEY_ERROR, { timeout: SIGN_IN_TIMEOUT_MS });
  await expect(loginForm.loginFormHeader).toBeVisible();
  await expect(loginForm.wifInput).toHaveValue('');
  await expect(loginForm.loginDialog).not.toContainText(INVALID_CREDENTIALS);
}

async function expectAddedKeyRefused(updateKeyForm: Locator): Promise<void> {
  await expect(updateKeyForm).toContainText(ACTIVE_KEY_ERROR, { timeout: SIGN_IN_TIMEOUT_MS });
  await expect(updateKeyForm.getByTestId('login-form-wif')).toHaveValue('');
  await expect(updateKeyForm).not.toContainText(INVALID_CREDENTIALS);
}

async function openAddAccountDialog(page: Page): Promise<LoginForm> {
  const profileMenu = new ProfileUserMenu(page);
  await clickUntilOpen(new HomePage(page).profileAvatarButton, profileMenu.profileMenuContent);
  await profileMenu.addAccountItem.click();
  return new LoginForm(page);
}

test.describe('Safe-storage sign-in with a key of the wrong role', () => {
  test('BLOG-SAFE-STORAGE-LOGIN-01 — an active key keeps the form open, naming the posting key', async ({
    page
  }) => {
    await giveKeyRole(page, () => 'active');
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await fillSignInForm(loginForm);
    await loginForm.saveSignInButton.click();

    await expectSignInKeyRefused(loginForm);
  });

  test('BLOG-SAFE-STORAGE-LOGIN-02 — an active key added to a stored account names the posting key', async ({
    page
  }) => {
    // Safe storage signs its registration with a key that is not the account's: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    let keyRole: KeyRole = 'posting';
    await giveKeyRole(page, () => keyRole);
    await page.goto(PAGE_WITH_HEADER);

    await storeAccount(page);

    // The dialog opens on the account safe storage now holds
    keyRole = 'active';
    await expectAddedKeyRefused(await addNewKey(page));
  });

  test("BLOG-SAFE-STORAGE-LOGIN-03 — another account's key keeps the form open, naming the posting key", async ({
    page
  }) => {
    await refusePostingAuthority(page);
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await fillSignInForm(loginForm);
    await loginForm.saveSignInButton.click();

    await expectSignInKeyRefused(loginForm);
  });

  test("BLOG-SAFE-STORAGE-LOGIN-04 — another account's key added to a stored account names the posting key", async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    let keyRole: KeyRole | null = 'posting';
    await giveKeyRole(page, () => keyRole);
    await refusePostingAuthority(page, () => keyRole === null);
    await page.goto(PAGE_WITH_HEADER);

    await storeAccount(page);

    keyRole = null;
    await expectAddedKeyRefused(await addNewKey(page));
  });

  test("BLOG-SAFE-STORAGE-LOGIN-05 — a key of an account in the posting authority's account_auths is stored with Direct Authority Mode off", async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page, OTHER_ACCOUNT);
    const delegatedPosting = { weight_threshold: 1, account_auths: [[OTHER_ACCOUNT, 1]], key_auths: [] };
    await overrideAuthorities(page, () => ({ posting: delegatedPosting }));
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await fillSignInForm(loginForm);
    await loginForm.loginDialog.getByTestId('strict-mode-checkbox').click();
    await loginForm.saveSignInButton.click();
    await loginForm.dismissBiometricPromptIfPresent();

    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
  });
});
