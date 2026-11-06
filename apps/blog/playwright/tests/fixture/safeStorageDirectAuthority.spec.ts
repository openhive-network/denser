import type { Page, Request, Route } from '@playwright/test';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import {
  ACCOUNT,
  answerKeyReferences,
  delegatePostingAuthority,
  giveKeyRole,
  openAddAccountDialog,
  openAddNewKey,
  OTHER_ACCOUNT,
  PAGE_WITH_HEADER,
  SIGN_IN_TIMEOUT_MS,
  storeAccount,
  submitNewKey
} from '../support/safeStorageContext';

/**
 * The Blog's safe-storage sign-in shows a stored account's Direct Authority Mode, read-only, in its
 * unlock form; "Add new key" defaults its Direct Authority Mode checkbox to the mode stored for the
 * account, and once the key is added signs the account in without asking for the password again.
 * A wrong password, though safe storage holds the account unlocked, signs nobody in and adds no key:
 * the add-key step says the password is wrong and takes the right one after it; closing the dialog
 * while the key is added signs nobody in either, and leaves the key stored. The mode default for an
 * account with no stored setting (on) is covered by `addedKeyStrictMode`'s unit tests in
 * packages/smart-signer/lib/signer/safe-storage-registration.test.ts; the sign-in after Add new key
 * while another sign-in is pending, and its cancel, by `signInWithAddedKey`'s in
 * packages/smart-signer/lib/auth/added-key-sign-in.test.ts.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose add-account dialog stores
 * ACCOUNT in safe storage, as safeStorageLoginKeyRole.spec.ts; ACCOUNT's posting authority is
 * answered with the key of FIXTURE_POSTING_WIF (Direct Authority Mode on), or with OTHER_ACCOUNT,
 * which holds that key, in its `account_auths` (off).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStorageDirectAuthority
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const MODE_ON = 'Direct Authority Mode: on';
const MODE_OFF = 'Direct Authority Mode: off';
const WRONG_PASSWORD = 'not-the-fixture-password';
const INVALID_CREDENTIALS = 'Invalid credentials';
const WRONG_SAFE_STORAGE_PASSWORD = enSmartSigner.broadcast_error.wrong_safe_storage_password;
const KEY_ADDED_TOAST = 'Key Added';
// Long past the unlock of the added key and the sign-in's first request, which follow its toast
const PAST_SIGN_IN_START_MS = 5_000;
const FIXTURE_PROXY_PORT = 8200;

/** Stores ACCOUNT with FIXTURE_POSTING_WIF as its own posting key, in Direct Authority Mode */
async function storeStrictAccount(page: Page): Promise<void> {
  // Safe storage signs its registration with a key that is not the account's: verify_authority is stubbed
  await installBroadcastInterceptor(page);
  await answerKeyReferences(page);
  await giveKeyRole(page, () => 'posting');
  await page.goto(PAGE_WITH_HEADER);
  await storeAccount(page);
}

/** Stores ACCOUNT with the key of OTHER_ACCOUNT its posting authority lists, Direct Authority Mode off */
async function storeDelegatedAccount(page: Page): Promise<void> {
  await installBroadcastInterceptor(page);
  await answerKeyReferences(page, OTHER_ACCOUNT);
  await delegatePostingAuthority(page);
  await page.goto(PAGE_WITH_HEADER);
  await storeAccount(page, { strict: false });
}

/**
 * Holds safe storage's lookup of the added key's accounts, made while it registers the key, until
 * `release` is called; `held` resolves once the lookup is held
 */
async function holdKeyRegistration(page: Page): Promise<{ held: Promise<void>; release: () => void }> {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markHeld = () => {};
  const held = new Promise<void>((resolve) => {
    markHeld = resolve;
  });
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route: Route) => {
      const body: { method?: string } | null =
        route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      if (body?.method === 'account_by_key_api.get_key_references') {
        markHeld();
        await released;
      }
      return route.fallback();
    }
  );
  return { held, release };
}

/** The app sign-in's first request, whether or not the deployment authenticates on its backend */
function isLoginChallengeRequest(request: Request): boolean {
  return new URL(request.url()).pathname.endsWith('/api/auth/challenge');
}

test.describe('Safe-storage Direct Authority Mode of a stored account', () => {
  test('BLOG-SAFE-STORAGE-DIRECT-AUTHORITY-01 — the unlock form shows the mode on, and Add new key defaults to it', async ({
    page
  }) => {
    await storeStrictAccount(page);

    const loginForm = await openAddAccountDialog(page);
    await expect(loginForm.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(loginForm.loginDialog.getByTestId('strict-mode-status-value')).toContainText(MODE_ON, {
      timeout: SIGN_IN_TIMEOUT_MS
    });
    await page.keyboard.press('Escape');
    await expect(loginForm.loginDialog).toHaveCount(0);

    const updateKeyForm = await openAddNewKey(page);
    await expect(updateKeyForm.getByTestId('strict-mode-checkbox')).toBeChecked();
  });

  test('BLOG-SAFE-STORAGE-DIRECT-AUTHORITY-02 — the unlock form shows the mode off, and Add new key defaults to it', async ({
    page
  }) => {
    await storeDelegatedAccount(page);

    const loginForm = await openAddAccountDialog(page);
    await expect(loginForm.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(loginForm.loginDialog.getByTestId('strict-mode-status-value')).toContainText(MODE_OFF, {
      timeout: SIGN_IN_TIMEOUT_MS
    });
    await page.keyboard.press('Escape');
    await expect(loginForm.loginDialog).toHaveCount(0);

    const updateKeyForm = await openAddNewKey(page);
    await expect(updateKeyForm.getByTestId('strict-mode-checkbox')).not.toBeChecked();
  });

  test('BLOG-SAFE-STORAGE-DIRECT-AUTHORITY-03 — Add new key signs the account in without a second password', async ({
    page
  }) => {
    await storeStrictAccount(page);

    const updateKeyForm = await openAddNewKey(page);
    const loginChallenge = page.waitForResponse((response) => isLoginChallengeRequest(response.request()), {
      timeout: SIGN_IN_TIMEOUT_MS
    });
    await submitNewKey(updateKeyForm);

    expect((await loginChallenge).ok()).toBe(true);
    // Signed in: the dialog closes instead of returning to the unlock step's password
    await expect(updateKeyForm).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
  });

  test('BLOG-SAFE-STORAGE-DIRECT-AUTHORITY-04 — Add new key with a wrong password fails and signs nobody in', async ({
    page
  }) => {
    // Safe storage holds the stored account unlocked: hb-auth's unlock alone would not check the password
    await storeStrictAccount(page);

    const updateKeyForm = await openAddNewKey(page);
    const loginRequests: Request[] = [];
    page.on('request', (request) => {
      if (isLoginChallengeRequest(request)) loginRequests.push(request);
    });
    await submitNewKey(updateKeyForm, WRONG_PASSWORD);

    // Still on the add-key step, with the error, before the stored key was touched
    await expect(updateKeyForm).toContainText(WRONG_SAFE_STORAGE_PASSWORD, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(updateKeyForm).not.toContainText(INVALID_CREDENTIALS);
    await expect(page.getByText(KEY_ADDED_TOAST, { exact: true })).toHaveCount(0);
    expect(loginRequests).toHaveLength(0);

    // The right password then adds the key and signs in
    await submitNewKey(updateKeyForm);
    await expect(updateKeyForm).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
  });

  test('BLOG-SAFE-STORAGE-DIRECT-AUTHORITY-05 — closing the dialog while the key is added signs nobody in', async ({
    page
  }) => {
    await storeStrictAccount(page);

    const updateKeyForm = await openAddNewKey(page);
    const keyRegistration = await holdKeyRegistration(page);
    const loginRequests: Request[] = [];
    page.on('request', (request) => {
      if (isLoginChallengeRequest(request)) loginRequests.push(request);
    });
    await submitNewKey(updateKeyForm);
    await keyRegistration.held;
    await page.keyboard.press('Escape');
    await expect(updateKeyForm).toHaveCount(0);
    keyRegistration.release();

    // The key is still stored, and its sign-in is not sent
    await expect(page.getByText(KEY_ADDED_TOAST, { exact: true })).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await page.waitForTimeout(PAST_SIGN_IN_START_MS);
    expect(loginRequests).toHaveLength(0);
    await expect(updateKeyForm).toHaveCount(0);
  });
});
