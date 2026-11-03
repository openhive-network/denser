import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { LoginForm } from '../support/pages/loginForm';
import { STUB_ACCOUNT, STUB_FOLLOWED, startWalletApiStub, stubAccountWith } from '../support/walletApiStub';
import enSmartSigner from '../../../../../packages/smart-signer/locales/en/smart-signer.json';

/**
 * Unlocking the safe-storage key at sign time checks it against the account on the node. When that
 * read times out the transfer fails with the translated request-timeout toast, not wax's raw
 * `Request timed out: "POST ..."` text, and without the "may still apply" note: nothing was sent.
 * The stub node (support/walletApiStub.ts) vouches for the key as sharedPostingActiveKey.spec.ts's
 * does; the broadcast is intercepted.
 */

const HYDRATION_TIMEOUT = 30_000;
/** Wax's own request timeout (5 s) for the held read, and the toast after it */
const UNLOCK_TIMEOUT = 30_000;

/** `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-shared-key')`, a key of no real account. */
const SHARED_WIF = '5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR';
const SHARED_PUBLIC_KEY = 'STM5dRfo5EMpM51eN3pS8Gn1CDGVZXjRanwfJP8oEXQ8KS36HhB2W';
const SAFE_STORAGE_PASSWORD = 'fixture-password';

const sharedAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[SHARED_PUBLIC_KEY, 1]] };

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    ...stubAccountWith({ posting: sharedAuthority, active: sharedAuthority }),
    'database_api.verify_authority': () => ({ valid: true }),
    'account_by_key_api.get_key_references': () => ({ accounts: [[STUB_ACCOUNT]] })
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    // As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
    // hb-auth then runs in a dedicated worker, which a reload ends: the stored key is locked again
    Reflect.deleteProperty(globalThis, 'SharedWorker');
  });
});

const ownTransfersPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`;

async function signInWithSafeStorage(page: Page): Promise<LoginForm> {
  const loginForm = new LoginForm(page);
  await page.goto(ownTransfersPage);
  await expect(async () => {
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await expect(loginForm.wifInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await loginForm.usernameInput.fill(STUB_ACCOUNT);
  await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
  await loginForm.wifInput.fill(SHARED_WIF);
  await loginForm.saveSignInButton.click();
  await expect(loginForm.loginDialog).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
  return loginForm;
}

/** Leaves every `database_api.find_accounts` request to the stub node unanswered */
const holdFindAccounts = (page: Page) =>
  page.route(
    (url) => url.hostname === '127.0.0.1' && url.port === String(FIXTURE_API_PORT),
    (route) => {
      const body = route.request().postDataJSON() as { method?: string } | null;
      if (body?.method === 'database_api.find_accounts') return new Promise<void>(() => undefined);
      return route.fallback();
    }
  );

test.describe('Safe-storage unlock at sign time', () => {
  test('WALLET-SAFE-STORAGE-UNLOCK-01 — an unlock whose node read times out shows the translated timeout', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const loginForm = await signInWithSafeStorage(page);
    await page.reload();

    const dialog = await openBalanceMenuDialog(
      page,
      page.getByTestId('wallet-hive-value').getByRole('button'),
      'Transfer',
      'Transfer To Account'
    );
    await dialog.locator('input[cmdk-input]').fill('stub-f');
    await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
    await dialog.getByPlaceholder('Amount').fill('0.001');
    await dialog.getByPlaceholder('Memo').fill('unlock timeout');
    await dialog.getByRole('button', { name: 'Next' }).click();
    const confirmDialog = page.getByRole('dialog', { name: 'Confirm Transfer To Account' });
    await confirmDialog.getByRole('button', { name: 'OK' }).click();

    await expect(loginForm.enterYourPasswordForm).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await holdFindAccounts(page);
    await loginForm.passwordToUnlockKeyInput.fill(SAFE_STORAGE_PASSWORD);
    await loginForm.passwordToUnlockKeySubmitButton.click();

    await expect(page.getByTestId('request-timeout-message')).toHaveText(enSmartSigner.request_error.timeout, {
      timeout: UNLOCK_TIMEOUT
    });
    await expect(page.getByText('Request timed out')).toHaveCount(0);
    await expect(page.getByTestId('transaction-not-confirmed-message')).toHaveCount(0);
    await expect(confirmDialog).toBeVisible();
    expect(broadcasts.calls).toHaveLength(0);
  });
});
