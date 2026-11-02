import type { Page, Request } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { LoginForm } from '../support/pages/loginForm';
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
 * A wrong password signs nobody in: it returns to the unlock step with the error. The mode default for an account with no stored
 * setting (on) is covered by `addedKeyStrictMode`'s unit tests in
 * packages/smart-signer/lib/signer/safe-storage-registration.test.ts.
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
    // Safe storage holds the stored account unlocked, so the password is checked only when signing in
    await storeStrictAccount(page);

    const updateKeyForm = await openAddNewKey(page);
    const loginRequests: Request[] = [];
    page.on('request', (request) => {
      if (isLoginChallengeRequest(request)) loginRequests.push(request);
    });
    await submitNewKey(updateKeyForm, WRONG_PASSWORD);

    // Back on the unlock step, with the error
    const loginForm = new LoginForm(page);
    await expect(loginForm.loginDialog).toContainText(INVALID_CREDENTIALS, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(loginForm.passwordInput).toBeVisible();
    expect(loginRequests).toHaveLength(0);
  });
});
