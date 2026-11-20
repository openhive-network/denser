import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import {
  ACCOUNT,
  answerKeyReferences,
  giveKeyRole,
  openAddNewKey,
  PAGE_WITH_HEADER,
  storeAccount
} from '../support/safeStorageContext';

/**
 * "Add new key" of an account safe storage holds looks the account up in safe storage when it opens;
 * until the lookup answers it must not say the account is not there.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose add-account dialog stores
 * ACCOUNT in safe storage, as safeStorageDirectAuthority.spec.ts.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStorageAddKeyLookup
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const USER_NOT_FOUND = enSmartSigner.login_form.signin_safe_storage.user_not_found;
const SEEN_FLAG = '__userNotFoundSeen';

test.describe('Safe-storage Add new key of a stored account', () => {
  test('BLOG-SAFE-STORAGE-ADD-KEY-LOOKUP-01 — never says the stored account is not found', async ({ page }) => {
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    await giveKeyRole(page, () => 'posting');
    await page.goto(PAGE_WITH_HEADER);
    await storeAccount(page);

    // Records the text if any DOM change, however short-lived, shows it
    await page.evaluate(
      ({ text, flag }) => {
        const record = window as unknown as Record<string, boolean>;
        record[flag] = false;
        new MutationObserver(() => {
          if (document.body.textContent?.includes(text)) record[flag] = true;
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
      },
      { text: USER_NOT_FOUND, flag: SEEN_FLAG }
    );

    const updateKeyForm = await openAddNewKey(page);
    await expect(updateKeyForm.getByTestId('login-form-description')).toContainText(ACCOUNT);
    expect(await page.evaluate((flag) => (window as unknown as Record<string, boolean>)[flag], SEEN_FLAG)).toBe(
      false
    );
  });
});
