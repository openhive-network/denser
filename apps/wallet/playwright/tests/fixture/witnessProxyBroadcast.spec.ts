import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectAccountWitnessProxyOperation } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey,
  stubAccountProxy
} from '../support/walletApiStub';

/**
 * Setting a witness proxy, and clearing it, from the witness page signs and broadcasts one
 * `account_witness_proxy_operation`. Reads come from the stub node (support/walletApiStub.ts),
 * where STUB_ACCOUNT has no proxy, or PROXY for the clearing cases; the broadcast and
 * `verify_authority` are answered by the interceptor, so the key signing it belongs to no account.
 */

const HYDRATION_TIMEOUT = 30_000;
const ATTEMPT_TIMEOUT = 2000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const PROXY = 'stub-beta';

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

/** Runs the stub node for the specs of the enclosing describe, with STUB_ACCOUNT's proxy `proxy`. */
const useStubWithProxy = (proxy: string) => {
  let stub: Server;
  test.beforeAll(async () => {
    stub = await startWalletApiStub(undefined, stubAccountProxy(proxy));
  });
  test.afterAll(async () => {
    await new Promise((resolve) => stub.close(resolve));
  });
};

/**
 * Opens the witness page logged in as STUB_ACCOUNT, with its active key stored unless `storeKey`
 * is false (then signing asks for it).
 */
const openWitnessesPage = async (page: Page, { storeKey }: { storeKey: boolean }) => {
  const broadcasts = await installBroadcastInterceptor(page);
  await logInAsStubAccount(page, 'active');
  if (storeKey) await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/~witnesses`);
  // Until then the proxy buttons are the logged-out ones, which open the login dialog.
  await expect(page.getByTestId('profile-avatar-button')).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  return broadcasts;
};

const proxyDialog = (page: Page) =>
  page.getByRole('dialog').filter({ hasText: 'Confirm Account Witness Proxy' });

/**
 * Opens the confirmation of the button named `buttonName`, retrying until the button is there
 * (`Clear proxy` once the page has read the account's proxy), and confirms it.
 */
const confirmProxy = async (page: Page, buttonName: string) => {
  const dialog = proxyDialog(page);
  await expect(async () => {
    await page.getByRole('button', { name: buttonName, exact: true }).click({ timeout: ATTEMPT_TIMEOUT });
    await expect(dialog).toBeVisible({ timeout: ATTEMPT_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(dialog).toBeHidden();
};

test.describe('Witness proxy broadcast: setting', () => {
  useStubWithProxy('');

  const setProxy = async (page: Page, proxy: string) => {
    await page.getByTestId('witnesses-set-proxy-box').getByRole('textbox').fill(proxy);
    await confirmProxy(page, 'Set proxy');
  };

  test('WALLET-TX-WITNESS-PROXY-01 — setting a proxy broadcasts the account and the proxy', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: true });

    await setProxy(page, PROXY);

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectAccountWitnessProxyOperation(broadcasts.calls[0], { account: STUB_ACCOUNT, proxy: PROXY });
  });

  test('WALLET-TX-WITNESS-PROXY-02 — a proxy to the account itself fails validation and broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: true });

    await setProxy(page, STUB_ACCOUNT);

    await expect(page.getByTestId('error-toast-content')).toContainText('Cannot proxy to self');
    await expect(page.getByRole('button', { name: 'Set proxy', exact: true })).toBeEnabled();
    expect(broadcasts.calls).toHaveLength(0);
  });
});

test.describe('Witness proxy broadcast: clearing', () => {
  useStubWithProxy(PROXY);

  const clearProxy = (page: Page) => confirmProxy(page, 'Clear proxy');

  test('WALLET-TX-WITNESS-PROXY-CLEAR-01 — clearing the proxy broadcasts the account and an empty proxy', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: true });

    await clearProxy(page);

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectAccountWitnessProxyOperation(broadcasts.calls[0], { account: STUB_ACCOUNT, proxy: '' });
  });

  test('WALLET-TX-WITNESS-PROXY-CLEAR-02 — declining to give the active key for clearing the proxy broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: false });

    await clearProxy(page);
    const keyInput = page.getByPlaceholder('Your active private key');
    await expect(keyInput).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(keyInput).toBeHidden();
    await expect(page.getByRole('button', { name: 'Clear proxy', exact: true })).toBeEnabled();
    expect(broadcasts.calls).toHaveLength(0);
  });
});
