import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { LoginForm } from '../support/pages/loginForm';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * Where the blog and the wallet share one origin they share the session, so the wallet can find a
 * posting-key session the blog signed in. The wallet signs with the active key: it treats that
 * session as logged out, asks for the active key, and works once given it. A broadcast the node
 * rejects for a missing authority reads as a message naming the key, not as the node's answer.
 * Reads come from the stub node (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const ACTIVE_KEY_PROMPT = "The wallet needs your active key; a posting key can't sign transfers";
/** The transfer dialog's labels and the expected message, in each locale checked. */
const LOCALES = [
  {
    locale: 'en',
    transfer: 'Transfer',
    dialog: 'Transfer To Account',
    following: 'Following',
    amount: 'Amount',
    next: 'Next',
    confirm: 'Confirm Transfer To Account',
    message: 'This operation needs your active key. Sign in with your active key and try again.'
  },
  {
    locale: 'pl',
    transfer: 'Przelew',
    dialog: 'Przelew na konto',
    following: 'obserwujesz',
    amount: 'Kwota',
    next: 'Dalej',
    confirm: 'Potwierdź Przelew na konto',
    message: 'Ta operacja wymaga klucza aktywnego (active). Zaloguj się kluczem aktywnym i spróbuj ponownie.'
  }
];
type LocaleLabels = (typeof LOCALES)[number];

const OWNER_TAB_TEST_IDS = [
  'wallet-permissions-link',
  'wallet-password-link',
  'wallet-communities-link',
  'wallet-authorities-link'
];

/** hived's answer to a transfer signed with a posting key, trimmed of its stack. */
const MISSING_ACTIVE_AUTH_ERROR = {
  code: -32003,
  message: `missing required active authority:Missing Active Authority ${STUB_ACCOUNT}`,
  data: {
    code: 3010000,
    name: 'tx_missing_active_auth',
    message: 'missing required active authority',
    stack: [{ context: { level: 'error', file: 'transaction_util.hpp', line: 109 }, format: 'Missing Active Authority ${id}' }]
  }
};

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

const ownTransfersPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`;

const storedUser = (page: Page) =>
  page.evaluate((): unknown => JSON.parse(window.localStorage.getItem('user') ?? 'null'));

/** Answers `verify_authority` as valid and every broadcast with `error`; returns the broadcast count. */
const rejectBroadcasts = async (page: Page, error: unknown): Promise<{ count: number }> => {
  const broadcasts = { count: 0 };
  await page.route(
    (url) => url.hostname === '127.0.0.1' && url.port === String(FIXTURE_API_PORT),
    async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      const body: { method?: string; id?: number } | null = request.postDataJSON();
      const method = body?.method ?? '';
      if (method === 'database_api.verify_authority') {
        return route.fulfill({ json: { jsonrpc: '2.0', id: body?.id ?? 1, result: { valid: true } } });
      }
      if (method.endsWith('broadcast_transaction') || method.endsWith('broadcast_transaction_synchronous')) {
        broadcasts.count++;
        return route.fulfill({ json: { jsonrpc: '2.0', id: body?.id ?? 1, error } });
      }
      return route.continue();
    }
  );
  return broadcasts;
};

/** Submits a 1 HIVE transfer from the HIVE balance menu of the active-key session's own page. */
const submitTransfer = async (page: Page, labels: LocaleLabels) => {
  const dialog = await openBalanceMenuDialog(
    page,
    page.getByTestId('wallet-hive-value').getByRole('button'),
    labels.transfer,
    labels.dialog
  );
  await dialog.locator('input[cmdk-input]').fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (${labels.following})` }).click();
  await dialog.getByPlaceholder(labels.amount).fill('1');
  await dialog.getByRole('button', { name: labels.next }).click();
  await page.getByRole('dialog', { name: labels.confirm }).getByRole('button', { name: 'OK' }).click();
};

test.describe('A posting-key session on the wallet', () => {
  test('WALLET-POSTING-SESSION-01 — counts as logged out and asks for the active key', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await logInAsStubAccount(page, 'posting');
    await page.goto(ownTransfersPage);

    const notice = page.getByTestId('active-key-required-notice');
    await expect(notice).toContainText(ACTIVE_KEY_PROMPT, { timeout: HYDRATION_TIMEOUT });
    // A WIF session holds one key: it can sign in with the active key, not add it
    await expect(page.getByTestId('active-key-required-add-key')).toHaveCount(0);
    await expect(page.getByTestId('wallet-balances-link')).toBeVisible();
    for (const testId of OWNER_TAB_TEST_IDS) await expect(page.getByTestId(testId)).toHaveCount(0);
    // No balance menu: a transfer cannot be started, let alone reach signing
    await expect(page.getByTestId('wallet-hive-value').getByRole('button')).toHaveCount(0);

    await page.getByTestId('active-key-required-login').click();
    await expect(new LoginForm(page).loginDialog).toBeVisible();
    // The blog's session is left as it was
    expect(await storedUser(page)).toMatchObject({ isLoggedIn: true, username: STUB_ACCOUNT, keyType: 'posting' });
    expect(broadcasts.calls).toEqual([]);
  });

  test('WALLET-POSTING-SESSION-02 — signing in with the active key opens the wallet', async ({ page }) => {
    await installBroadcastInterceptor(page);
    await logInAsStubAccount(page, 'posting');
    await page.goto(ownTransfersPage);
    const loginForm = new LoginForm(page);

    await page.getByTestId('active-key-required-login').click({ timeout: HYDRATION_TIMEOUT });
    await loginForm.otherSignInOptionsButton.click();
    await loginForm.otherSignInOptionsUsernameInput.fill(STUB_ACCOUNT);
    await loginForm.signInWithWifButton.click();
    await expect(loginForm.headerEnterYourWifKey).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await loginForm.postingPrivateKeyInput.fill(ACTIVE_WIF);
    await loginForm.postingPrivateKeySubmitButton.click();

    await expect(page.getByTestId('active-key-required-notice')).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
    for (const testId of OWNER_TAB_TEST_IDS) await expect(page.getByTestId(testId)).toBeVisible();
    await expect(page.getByTestId('wallet-hive-value').getByRole('button')).toBeVisible();
    expect(await storedUser(page)).toMatchObject({ isLoggedIn: true, username: STUB_ACCOUNT, keyType: 'active' });
  });
});

test.describe('A broadcast rejected for missing authority', () => {
  for (const labels of LOCALES) {
    test(`WALLET-MISSING-AUTH-01-${labels.locale} — names the key it needs, without the node's answer`, async ({
      page,
      context,
      baseURL
    }) => {
      await context.addCookies([{ name: 'NEXT_LOCALE', value: labels.locale, url: baseURL }]);
      const broadcasts = await rejectBroadcasts(page, MISSING_ACTIVE_AUTH_ERROR);
      await logInAsStubAccount(page, 'active');
      await storeStubAccountKey(page, 'active', ACTIVE_WIF);
      await page.goto(ownTransfersPage);
      await submitTransfer(page, labels);

      await expect(page.getByTestId('missing-authority-message')).toHaveText(labels.message, {
        timeout: HYDRATION_TIMEOUT
      });
      expect(broadcasts.count).toBeGreaterThan(0);
      await expect(page.getByText('tx_missing_active_auth')).toHaveCount(0);
      await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
    });
  }
});
