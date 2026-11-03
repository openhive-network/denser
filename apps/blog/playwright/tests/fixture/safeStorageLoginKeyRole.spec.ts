import type { Locator } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import type { LoginForm } from '../support/pages/loginForm';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';
import {
  ACCOUNT,
  addNewKey,
  answerKeyReferences,
  delegatePostingAuthority,
  fillSignInForm,
  giveKeyRole,
  openAddAccountDialog,
  openAddNewKey,
  OTHER_ACCOUNT,
  PAGE_WITH_HEADER,
  refusePostingAuthority,
  SIGN_IN_TIMEOUT_MS,
  storeAccount,
  submitNewKey,
  type KeyRole
} from '../support/safeStorageContext';

/**
 * The Blog's safe-storage sign-in stores the posting key: a key of the account's active authority
 * but not of its posting one is refused in place, the key kept in its field, before anything is
 * stored, with a message naming the posting key instead of hb-auth's "Invalid credentials". So is a
 * key added to an account safe storage already holds ("Add new key"), and a key of no authority of
 * the account at all whose holder is not known, which the chain's `verify_authority` refuses. A key
 * `get_key_references` gives another account for is refused naming that account: one the account's
 * posting authority does not list as not the account's, one it lists in `account_auths` as taken with
 * Direct Authority Mode off, which then stores it. The Wallet's mirror case is
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

const ACTIVE_KEY_ERROR = "This key doesn't have posting authority. Blog sign-in requires the posting key";
const INVALID_CREDENTIALS = 'Invalid credentials';
const UNRELATED_ACCOUNT_KEY_ERROR = `This key belongs to @${OTHER_ACCOUNT}, not @${ACCOUNT}. Enter the posting key of @${ACCOUNT}`;
const AUTHORISED_ACCOUNT_KEY_ERROR =
  `This key belongs to @${OTHER_ACCOUNT}, which has posting authority over @${ACCOUNT}. ` +
  'It will be accepted with "Direct Authority Mode" turned off';

async function expectSignInKeyRefused(loginForm: LoginForm, error = ACTIVE_KEY_ERROR): Promise<void> {
  await expect(loginForm.wifInputErrorMessage).toHaveText(error, { timeout: SIGN_IN_TIMEOUT_MS });
  await expect(loginForm.loginFormHeader).toBeVisible();
  await expect(loginForm.wifInput).toHaveValue(FIXTURE_POSTING_WIF);
  await expect(loginForm.loginDialog).not.toContainText(INVALID_CREDENTIALS);
}

async function expectAddedKeyRefused(updateKeyForm: Locator, error = ACTIVE_KEY_ERROR): Promise<void> {
  await expect(updateKeyForm).toContainText(error, { timeout: SIGN_IN_TIMEOUT_MS });
  await expect(updateKeyForm.getByTestId('login-form-wif')).toHaveValue(FIXTURE_POSTING_WIF);
  await expect(updateKeyForm).not.toContainText(INVALID_CREDENTIALS);
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

  test('BLOG-SAFE-STORAGE-LOGIN-03 — a key of no known holder keeps the form open, naming the posting key', async ({
    page
  }) => {
    await answerKeyReferences(page);
    await refusePostingAuthority(page);
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await fillSignInForm(loginForm);
    await loginForm.saveSignInButton.click();

    await expectSignInKeyRefused(loginForm);
  });

  test('BLOG-SAFE-STORAGE-LOGIN-04 — a key of no known holder added to a stored account names the posting key', async ({
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
    await delegatePostingAuthority(page);
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await fillSignInForm(loginForm);
    await loginForm.loginDialog.getByTestId('strict-mode-checkbox').click();
    await loginForm.saveSignInButton.click();
    await loginForm.dismissBiometricPromptIfPresent();

    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
  });

  test("BLOG-SAFE-STORAGE-LOGIN-06 — an unrelated account's key keeps the form open, naming that account", async ({
    page
  }) => {
    await answerKeyReferences(page, OTHER_ACCOUNT);
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await fillSignInForm(loginForm);
    await loginForm.saveSignInButton.click();

    await expectSignInKeyRefused(loginForm, UNRELATED_ACCOUNT_KEY_ERROR);
  });

  test("BLOG-SAFE-STORAGE-LOGIN-07 — an authorised account's key added in Direct Authority Mode names the mode, and is stored with it off", async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    await giveKeyRole(page, () => 'posting');
    let delegated = false;
    await delegatePostingAuthority(page, () => delegated);
    await page.goto(PAGE_WITH_HEADER);

    await storeAccount(page);

    // The stored key is now OTHER_ACCOUNT's, whom the account's posting authority lists
    delegated = true;
    await answerKeyReferences(page, OTHER_ACCOUNT);
    const updateKeyForm = await openAddNewKey(page);
    await submitNewKey(updateKeyForm);
    await expectAddedKeyRefused(updateKeyForm, AUTHORISED_ACCOUNT_KEY_ERROR);

    await updateKeyForm.getByTestId('strict-mode-checkbox').click();
    await updateKeyForm.getByTestId('login-form-update-key').click();

    // Signed in: the dialog closes
    await expect(updateKeyForm).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
  });
});
