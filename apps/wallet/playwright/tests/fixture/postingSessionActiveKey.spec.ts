import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { installBroadcastInterceptor, type InterceptedBroadcast } from '../support/broadcastInterceptor';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey,
  stubRcAccountsWith
} from '../support/walletApiStub';
import { expectTransferOperation, naiAsset } from '../support/walletOperations';

/**
 * Where the blog and the wallet share one origin they share the session, so the wallet can find a
 * posting-key session the blog signed in. The wallet opens it as the user's own: balances, owner
 * views and the account menu, and signs posting-authority operations (Delegate RC) with the posting
 * key. An operation needing the active key asks for it when it is signed: cancelling sends nothing,
 * entering it signs and sends the operation once. A broadcast the node rejects for a missing
 * authority reads as a message naming the key, not as the node's answer. Reads come from the stub
 * node (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';
/** Randomly generated, of no account. */
const POSTING_WIF = '5JSTSDF5nUcChE6SeyWG28ktUevv1Bg6rUnmueRQw2cxyGqE4oT';

const ACTIVE_KEY_PROMPT = 'This operation requires your active key for one time signing.';
const DELEGATE_RC = 'Delegate RC';
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
    confirm: 'Potwierdź przelew na konto',
    message: 'Ta operacja wymaga klucza Active. Zaloguj się kluczem Active i spróbuj ponownie.'
  }
];
type LocaleLabels = (typeof LOCALES)[number];
const EN_LABELS = LOCALES[0];

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
  stub = await startWalletApiStub(undefined, stubRcAccountsWith({}));
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

/** Submits a 1 HIVE transfer to STUB_FOLLOWED from the HIVE balance menu of the session's own page. */
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

/** The account's own wallet, as an owner sees it: the header names the account, owner tabs and menus show */
const expectOwnWallet = async (page: Page) => {
  await expect(page.getByTestId('profile-avatar-button')).toHaveAccessibleName(
    `${STUB_ACCOUNT} account menu, posting key`,
    { timeout: HYDRATION_TIMEOUT }
  );
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toHaveCount(0);
  for (const testId of OWNER_TAB_TEST_IDS) await expect(page.getByTestId(testId)).toBeVisible();
  await expect(page.getByTestId('wallet-hive-value').getByRole('button')).toBeVisible();
};

/** The single operation of `call`'s transaction, as wax's API JSON carries it */
const broadcastOperation = (call: InterceptedBroadcast) => {
  const trx = (call.params as { trx?: { operations?: { type?: string; value?: Record<string, unknown> }[] } })
    .trx;
  expect(trx?.operations).toHaveLength(1);
  return trx?.operations?.[0];
};

const activeKeyPrompt = (page: Page) => page.getByRole('dialog').filter({ hasText: ACTIVE_KEY_PROMPT });

test.describe('A posting-key session on the wallet', () => {
  test('WALLET-POSTING-SESSION-01 — opens the own wallet from the wallet home, without asking for the active key', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await logInAsStubAccount(page, 'posting');
    await page.goto(WALLET_BASE_PATH);

    await expect(page).toHaveURL(new RegExp(`${ownTransfersPage}$`), { timeout: HYDRATION_TIMEOUT });
    await expectOwnWallet(page);
    await expect(page.getByTestId('login-key-badge')).toHaveCount(0);
    // The blog's session is left as it was
    expect(await storedUser(page)).toMatchObject({ isLoggedIn: true, username: STUB_ACCOUNT, keyType: 'posting' });
    expect(broadcasts.calls).toEqual([]);
  });

  test('WALLET-POSTING-SESSION-02 — a safe-storage posting session opens the own wallet too', async ({ page }) => {
    await logInAsStubAccount(page, { loginType: 'hbauth', keyType: 'posting' });
    await page.goto(ownTransfersPage);

    await expectOwnWallet(page);
  });

  test('WALLET-POSTING-SESSION-03 — Delegate RC signs with the posting key, without asking for the active key', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await logInAsStubAccount(page, 'posting');
    await storeStubAccountKey(page, 'posting', POSTING_WIF);
    await page.goto(ownTransfersPage);

    const trigger = page.getByRole('button', { name: DELEGATE_RC, exact: true });
    const dialog = page.getByRole('dialog', { name: DELEGATE_RC, exact: true });
    await expect(async () => {
      await trigger.click();
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });
    await dialog.getByRole('button', { name: '25%' }).click();
    await dialog.getByLabel('To Account').fill(STUB_FOLLOWED);
    await dialog.getByRole('button', { name: DELEGATE_RC, exact: true }).click();

    await broadcasts.waitForCount(1);
    const operation = broadcastOperation(broadcasts.calls[0]);
    expect(operation?.type).toBe('custom_json_operation');
    expect(operation?.value).toMatchObject({ id: 'rc', required_auths: [], required_posting_auths: [STUB_ACCOUNT] });
    await expect(activeKeyPrompt(page)).toHaveCount(0);
  });

  test('WALLET-POSTING-SESSION-04 — a transfer asks for the active key; cancelling sends nothing and shows no error', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await logInAsStubAccount(page, 'posting');
    await storeStubAccountKey(page, 'posting', POSTING_WIF);
    await page.goto(ownTransfersPage);
    await submitTransfer(page, EN_LABELS);

    const prompt = activeKeyPrompt(page);
    await expect(prompt).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await page.keyboard.press('Escape');
    await expect(prompt).toHaveCount(0);

    await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
    await expect(page.getByTestId('missing-authority-message')).toHaveCount(0);
    expect(broadcasts.calls).toEqual([]);
  });

  test('WALLET-POSTING-SESSION-05 — the active key entered for a transfer signs it, sent once and not kept', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await logInAsStubAccount(page, 'posting');
    await storeStubAccountKey(page, 'posting', POSTING_WIF);
    await page.goto(ownTransfersPage);
    await submitTransfer(page, EN_LABELS);

    const prompt = activeKeyPrompt(page);
    await expect(prompt).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await prompt.getByTestId('posting-private-key-input').fill(ACTIVE_WIF);
    await prompt.getByTestId('password-submit-button').click();

    await broadcasts.waitForCount(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('1.000 HIVE'),
      memo: ''
    });
    await expect(prompt).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(1);
    const storedActiveKey = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      `wif.${STUB_ACCOUNT}@active`
    );
    expect(storedActiveKey).toBeNull();
    expect(await storedUser(page)).toMatchObject({ isLoggedIn: true, username: STUB_ACCOUNT, keyType: 'posting' });
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
