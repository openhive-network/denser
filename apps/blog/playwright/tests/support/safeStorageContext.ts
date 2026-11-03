import { expect, type Locator, type Page, type Route } from '@playwright/test';
import { HomePage } from './pages/homePage';
import { LoginForm } from './pages/loginForm';
import { ProfileUserMenu } from './pages/profileUserMenu';
import { FIXTURE_POSTING_WIF } from './fixture-auth/constants';
import { clickUntilOpen } from './uiPrimitives';

/**
 * Shared steps of the safe-storage specs (`safeStorageLoginKeyRole.spec.ts`,
 * `safeStorageDirectAuthority.spec.ts`): ACCOUNT's recorded authorities answered with the public key
 * of FIXTURE_POSTING_WIF in a role, the add-account dialog storing ACCOUNT in safe storage, and its
 * "Add new key" step. The specs reuse the `accountSwitchLogout` recording.
 */

const FIXTURE_PROXY_PORT = 8200;
export const ACCOUNT = 'gtg';
/** An account holding FIXTURE_POSTING_WIF's key, which is none of ACCOUNT's own */
export const OTHER_ACCOUNT = 'guest4test1';
/** The public key of FIXTURE_POSTING_WIF */
const KEY_PUBLIC_KEY = 'STM8HD6C422sXmTgR7DsR8XFufQEYesNHYLGAZ2co6s1WtUSnafcM';
export const SAFE_STORAGE_PASSWORD = 'fixture-password';
const ADD_NEW_KEY = 'Add new key';
export const UPDATE_KEY_TITLE = 'Add New Key to Safe Storage';
// A page with the site header but no feed, as accountSwitchLogout.spec.ts
export const PAGE_WITH_HEADER = '/faq.html';
// The sign-in loads the signing stack (wax, the hb-auth worker) first
export const SIGN_IN_TIMEOUT_MS = 30_000;

interface AccountAuthorities {
  name: string;
  posting: unknown;
  active: unknown;
}

export type KeyRole = 'posting' | 'active';

type AuthorityOverrides = Partial<Record<KeyRole, unknown>>;

/**
 * Answers ACCOUNT's `find_accounts` with the authorities `overrides()` gives in place of the recorded
 * ones; leaves it to the routes added before while `overrides()` gives null
 */
export async function overrideAuthorities(
  page: Page,
  overrides: () => AuthorityOverrides | null
): Promise<void> {
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route: Route) => {
      const body: { method?: string; params?: { accounts?: string[] } } | null =
        route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      const authorities = overrides();
      if (
        body?.method !== 'database_api.find_accounts' ||
        !body.params?.accounts?.includes(ACCOUNT) ||
        !authorities
      ) {
        return route.fallback();
      }
      // hb-auth's own lookup, after verify_authority, leaves `delayed_votes_active` out: ask the recorded read
      const response = await route.fetch({
        postData: { ...body, params: { ...body.params, delayed_votes_active: false } }
      });
      const json: { result: { accounts: AccountAuthorities[] } } = await response.json();
      json.result.accounts = json.result.accounts.map((account) =>
        account.name === ACCOUNT ? { ...account, ...authorities } : account
      );
      return route.fulfill({ response, json });
    }
  );
}

/** Answers ACCOUNT's `find_accounts` with KEY_PUBLIC_KEY as the key of `role()` only; of none of them for null */
export async function giveKeyRole(page: Page, role: () => KeyRole | null): Promise<void> {
  const keyAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[KEY_PUBLIC_KEY, 1]] };
  await overrideAuthorities(page, () => {
    const keyRole = role();
    return keyRole ? { [keyRole]: keyAuthority } : {};
  });
}

/**
 * While `delegated()`, answers ACCOUNT's `find_accounts` with OTHER_ACCOUNT in its posting
 * authority's `account_auths`, and no key
 */
export async function delegatePostingAuthority(
  page: Page,
  delegated: () => boolean = () => true
): Promise<void> {
  const delegatedPosting = { weight_threshold: 1, account_auths: [[OTHER_ACCOUNT, 1]], key_auths: [] };
  await overrideAuthorities(page, () => (delegated() ? { posting: delegatedPosting } : null));
}

/** Answers safe storage's lookup of KEY_PUBLIC_KEY's accounts, made when it registers the key, with `owner` */
export async function answerKeyReferences(page: Page, owner = ACCOUNT): Promise<void> {
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
export async function refusePostingAuthority(page: Page, refused: () => boolean = () => true): Promise<void> {
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

export async function fillSignInForm(loginForm: LoginForm): Promise<void> {
  await expect(loginForm.wifInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
  await loginForm.usernameInput.fill(ACCOUNT);
  await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
  await loginForm.wifInput.fill(FIXTURE_POSTING_WIF);
}

export async function openAddAccountDialog(page: Page): Promise<LoginForm> {
  const profileMenu = new ProfileUserMenu(page);
  await clickUntilOpen(new HomePage(page).profileAvatarButton, profileMenu.profileMenuContent);
  await profileMenu.addAccountItem.click();
  return new LoginForm(page);
}

/**
 * Stores ACCOUNT's key in safe storage through the add-account dialog, which then closes; with
 * Direct Authority Mode off for `strict` false
 */
export async function storeAccount(page: Page, { strict = true }: { strict?: boolean } = {}): Promise<void> {
  const loginForm = await openAddAccountDialog(page);
  await fillSignInForm(loginForm);
  if (!strict) await loginForm.loginDialog.getByTestId('strict-mode-checkbox').click();
  await loginForm.saveSignInButton.click();
  await loginForm.dismissBiometricPromptIfPresent();
  await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
}

/** Opens "Add new key" of the account safe storage holds; resolves with the dialog */
export async function openAddNewKey(page: Page): Promise<Locator> {
  const loginForm = await openAddAccountDialog(page);
  await expect(loginForm.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
  await loginForm.loginDialog.getByText(ADD_NEW_KEY, { exact: true }).click();
  const updateKeyForm = loginForm.loginDialog;
  await expect(updateKeyForm.getByText(UPDATE_KEY_TITLE)).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
  return updateKeyForm;
}

/** Offers FIXTURE_POSTING_WIF, with `password`, on the open "Add new key" step */
export async function submitNewKey(updateKeyForm: Locator, password = SAFE_STORAGE_PASSWORD): Promise<void> {
  await updateKeyForm.getByTestId('login-form-password').fill(password);
  await updateKeyForm.getByTestId('login-form-wif').fill(FIXTURE_POSTING_WIF);
  await updateKeyForm.getByTestId('login-form-update-key').click();
}

/** Offers FIXTURE_POSTING_WIF on "Add new key" of the account safe storage holds; resolves with the dialog */
export async function addNewKey(page: Page): Promise<Locator> {
  const updateKeyForm = await openAddNewKey(page);
  await submitNewKey(updateKeyForm);
  return updateKeyForm;
}
