import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { LoginForm } from '../support/pages/loginForm';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { STUB_ACCOUNT, startWalletApiStub, stubAccountWith } from '../support/walletApiStub';
import { STUB_KEYS } from '../support/accountKeys';
import enWallet from '../../../locales/en/common_wallet.json';

/**
 * A WIF session that keeps no key in the tab still signs with the key it signed in with: the
 * permissions and authorities pages mark that key, known from the sign-in, and removing it asks in
 * the lockout dialog before any key prompt. STUB_ACCOUNT's active role holds two keys, so the role
 * alone tells none of them. Nothing is broadcast, and no private key is stored.
 */

const HYDRATION_TIMEOUT = 30_000;
const PAGE = enWallet.authorities_page;

const authority = (...publicKeys: string[]) => ({
  weight_threshold: 1,
  account_auths: [],
  key_auths: publicKeys.map((publicKey) => [publicKey, 1])
});

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, {
    ...stubAccountWith({
      owner: authority(STUB_KEYS.owner.publicKey),
      active: authority(STUB_KEYS.active.publicKey, STUB_KEYS.memo.publicKey),
      posting: authority(STUB_KEYS.posting.publicKey),
      memo_key: STUB_KEYS.memo.publicKey
    }),
    // The sign-in checks the signed login transaction; nothing is broadcast
    'database_api.verify_authority': () => ({ valid: true }),
    'account_by_key_api.get_key_references': () => ({ accounts: [[STUB_ACCOUNT]] })
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

let broadcasts: string[];

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  broadcasts = [];
  page.on('request', (request) => {
    if (request.postData()?.includes('broadcast_transaction')) broadcasts.push(request.url());
  });
});

/** Signs in with STUB_ACCOUNT's active WIF, "Remember for this tab" left unticked */
async function signInWithWif(page: Page) {
  const loginForm = new LoginForm(page);
  await page.goto(`${WALLET_BASE_PATH}/market`);
  await expect(async () => {
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

  await loginForm.otherSignInOptionsButton.click();
  await loginForm.otherSignInOptionsUsernameInput.fill(STUB_ACCOUNT);
  await loginForm.signInWithWifButton.click();
  await expect(loginForm.headerEnterYourKey).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await expect(loginForm.rememberKeyForTabCheckbox).not.toBeChecked();
  await loginForm.postingPrivateKeyInput.fill(STUB_KEYS.active.wif);
  await loginForm.postingPrivateKeySubmitButton.click();
  await expect(loginForm.loginDialog).toBeHidden({ timeout: HYDRATION_TIMEOUT });
}

/** The localStorage entries holding `wif` */
function storedEntriesWith(page: Page, wif: string): Promise<string[]> {
  return page.evaluate(
    (secret) => Object.keys(window.localStorage).filter((key) => window.localStorage.getItem(key)?.includes(secret)),
    wif
  );
}

test.describe('The key a WIF session signed in with', () => {
  test('WALLET-SIGN-IN-KEY-01 — is marked on permissions and authorities with no key kept in the tab', async ({
    page
  }) => {
    await signInWithWif(page);
    expect(await storedEntriesWith(page, STUB_KEYS.active.wif)).toEqual([]);

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/permissions`);
    const activeRole = page.getByTestId('permissions-summary').getByTestId('permissions-role-active');
    await expect(activeRole.getByTestId('key-mark-session')).toHaveCount(1, { timeout: HYDRATION_TIMEOUT });
    await expect(page.getByTestId('key-mark-session')).toHaveCount(1);

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/authorities`);
    await page.getByTestId('authority-toggle-active').click({ timeout: HYDRATION_TIMEOUT });
    await expect(page.getByTestId('key-mark-session')).toHaveCount(1, { timeout: HYDRATION_TIMEOUT });
    expect(broadcasts).toEqual([]);
  });

  test('WALLET-SIGN-IN-KEY-02 — deleting it shows the lockout dialog before any key prompt', async ({ page }) => {
    await signInWithWif(page);
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/authorities`);
    await page.getByTestId('authority-toggle-active').click({ timeout: HYDRATION_TIMEOUT });
    // Marked once the session's keys are read; the editor shows no marks
    await expect(page.getByTestId('key-mark-session')).toHaveCount(1, { timeout: HYDRATION_TIMEOUT });
    await page.getByRole('button', { name: PAGE.edit_item.replace('{{name}}', PAGE.active_authority) }).click();

    const sessionKeyRow = page
      .locator('div')
      .filter({ has: page.locator(`input[value="${STUB_KEYS.active.publicKey}"]`) })
      .filter({ has: page.getByRole('button', { name: PAGE.delete }) })
      .last();
    await sessionKeyRow.getByRole('button', { name: PAGE.delete }).click();
    await expect(page.locator(`input[value="${STUB_KEYS.active.publicKey}"]`)).toHaveCount(0);
    await page.getByRole('button', { name: PAGE.update_authority }).click();

    const dialog = page.getByTestId('authority-lockout-dialog');
    await expect(dialog).toContainText(PAGE.lockout.session_key);
    await expect(new LoginForm(page).headerEnterYourKey).toHaveCount(0);
    await dialog.getByRole('button', { name: PAGE.cancel }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(broadcasts).toEqual([]);
  });
});
