import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { expectTransferOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';
import enSmartSigner from '../../../../../packages/smart-signer/locales/en/smart-signer.json';

/**
 * A transfer from a balance menu signs and broadcasts one `transfer_operation` with what the
 * dialog was given, in the currency of the balance it was opened from. Reads come from the stub
 * node (support/walletApiStub.ts: 1,234.567 HIVE and $2.500 HBD); the broadcast and
 * `verify_authority` are answered by the interceptor, so the key signing it belongs to no account.
 */

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const MEMO = 'thanks for the coffee';
const HBD_MEMO = 'rent for October';

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

/** Logs in with an active key and opens the transfer dialog of the balance at `balanceTestId`. */
const openTransferDialog = async (page: Page, balanceTestId: string): Promise<Locator> => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  return openBalanceMenuDialog(
    page,
    page.getByTestId(balanceTestId).getByRole('button'),
    'Transfer',
    'Transfer To Account'
  );
};

const fillTransfer = async (dialog: Locator, amount: string, memo: string) => {
  const recipient = dialog.locator('input[cmdk-input]');
  await recipient.fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
  await dialog.getByPlaceholder('Amount').fill(amount);
  await dialog.getByPlaceholder('Memo').fill(memo);
  await dialog.getByRole('button', { name: 'Next' }).click();
};

const confirmDialog = (page: Page) => page.getByRole('dialog', { name: 'Confirm Transfer To Account' });

/** The confirmation's read-only amount, after its From and To rows. */
const confirmAmount = (page: Page) => confirmDialog(page).locator('input').nth(2);

/** Answers every block read with no block, as a lagging node does, so WorkerBee's listener expires. */
const withholdBlocks = (page: Page) =>
  page.route(
    (url) => url.hostname === '127.0.0.1' && url.port === String(FIXTURE_API_PORT),
    (route) => {
      const body = route.request().postDataJSON() as { method?: string; id?: number } | null;
      if (body?.method === 'block_api.get_block') {
        return route.fulfill({ json: { jsonrpc: '2.0', id: body.id ?? 1, result: {} } });
      }
      if (body?.method === 'block_api.get_block_range') {
        return route.fulfill({ json: { jsonrpc: '2.0', id: body.id ?? 1, result: { blocks: [] } } });
      }
      return route.fallback();
    }
  );

/** Fails every request for the JSON-RPC `method` on the network, as a dropped connection does: nothing reaches the node. */
const abortMethod = (page: Page, method: string) =>
  page.route(
    (url) => url.hostname === '127.0.0.1' && url.port === String(FIXTURE_API_PORT),
    (route) => {
      const body = route.request().postDataJSON() as { method?: string } | null;
      return body?.method === method ? route.abort('connectionreset') : route.fallback();
    }
  );

/** Holds every script chunk and wasm module requested from now on, as a slow connection does: the chain loads late. */
const delayCodeLoads = (page: Page, delayMs: number) =>
  page.route(
    (url) => url.pathname.includes('/_next/static/') || url.pathname.endsWith('.wasm'),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return route.fallback();
    }
  );

const RAW_NETWORK_ERROR = 'Unknown request error caught';

test.describe('Transfer broadcast', () => {
  test('WALLET-TX-TRANSFER-01 — confirming a transfer broadcasts its from, to, amount and memo', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '1.5', MEMO);
    await expect(confirmAmount(page)).toHaveValue('1.500 HIVE');
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('1.500 HIVE'),
      memo: MEMO
    });
  });

  test('WALLET-TX-TRANSFER-02 — a transfer from the HBD balance broadcasts an HBD amount', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-dallars-value');
    await fillTransfer(dialog, '2.125', HBD_MEMO);
    await expect(confirmAmount(page)).toHaveValue('2.125 HBD');
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('2.125 HBD'),
      memo: HBD_MEMO
    });
  });

  test('WALLET-TX-TRANSFER-03 — an amount below 1 is broadcast in its canonical NAI form', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '0.25', MEMO);
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('0.250 HIVE'),
      memo: MEMO
    });
  });

  test('WALLET-TX-TRANSFER-04 — an amount above the balance is refused and broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-dallars-value');
    await fillTransfer(dialog, '2.501', HBD_MEMO);

    await expect(dialog.getByText('Insufficient funds.')).toBeVisible();
    await expect(confirmDialog(page)).toBeHidden();
    expect(broadcasts.calls).toHaveLength(0);
  });

  test('WALLET-TX-TRANSFER-05 — a transfer no block confirms in time closes the dialog and names its transaction', async ({
    page
  }) => {
    // The node takes the broadcast but no block is seen to include it: OK must not be there to send it twice
    const broadcasts = await installBroadcastInterceptor(page);
    await withholdBlocks(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '1.5', MEMO);
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();
    await broadcasts.waitForCount(1);

    await expect(page.getByTestId('transaction-not-confirmed-message')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('transaction-not-confirmed-id')).toHaveText(/^[0-9a-f]{40}$/);
    await expect(confirmDialog(page)).toBeHidden();
    await expect(dialog).toBeHidden();
    expect(broadcasts.calls).toHaveLength(1);
  });

  test('WALLET-TX-TRANSFER-06 — a broadcast request failed on the network says the transfer may still apply', async ({
    page
  }) => {
    // The connection may have dropped after the node took the transaction: a retry could send it twice
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '1.5', MEMO);
    await abortMethod(page, 'network_broadcast_api.broadcast_transaction');
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await expect(page.getByTestId('transaction-not-confirmed-message')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('transaction-not-confirmed-id')).toHaveText(/^[0-9a-f]{40}$/);
    await expect(page.getByText(RAW_NETWORK_ERROR)).toHaveCount(0);
    await expect(confirmDialog(page)).toBeHidden();
    await expect(dialog).toBeHidden();
    expect(broadcasts.calls).toHaveLength(0);
  });

  test('WALLET-TX-TRANSFER-07 — a signing check failed on the network is a translated failure', async ({ page }) => {
    // The signer checks the key's authority before anything is sent
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '1.5', MEMO);
    await abortMethod(page, 'database_api.verify_authority');
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await expect(page.getByTestId('request-network-error-message')).toHaveText(enSmartSigner.request_error.network, {
      timeout: 20_000
    });
    await expect(page.getByText(RAW_NETWORK_ERROR)).toHaveCount(0);
    await expect(page.getByTestId('transaction-not-confirmed-message')).toHaveCount(0);
    await expect(confirmDialog(page)).toBeVisible();
    await expect(confirmDialog(page).getByRole('button', { name: 'OK' })).toBeEnabled();
    expect(broadcasts.calls).toHaveLength(0);
  });

  test('WALLET-TX-TRANSFER-08 — a double click on OK while the chain loads broadcasts one transfer', async ({
    page
  }) => {
    // Before the mutation starts the submission waits for the chain: OK must already be disabled then
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '1.5', MEMO);
    const ok = confirmDialog(page).getByRole('button', { name: 'OK' });
    await expect(ok).toBeEnabled();
    await delayCodeLoads(page, 2_000);
    await ok.dblclick();

    // While it spins OK has no name: it is the dialog's only disabled button
    await expect(confirmDialog(page).locator('button[disabled]')).toHaveCount(1);
    await broadcasts.waitForCount(1);
    // Once the submission has ended, a second one would have broadcast too
    await expect(ok).toBeEnabled({ timeout: 20_000 });
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('1.500 HIVE'),
      memo: MEMO
    });
  });

  test('WALLET-TX-TRANSFER-09 — an amount the chain refuses to build is a toast, nothing is broadcast and OK works again', async ({
    page
  }) => {
    // The form reads "1.5000" as 1.5, but the chain's asset allows at most 3 decimal places
    const broadcasts = await installBroadcastInterceptor(page);
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '1.5000', MEMO);
    const ok = confirmDialog(page).getByRole('button', { name: 'OK' });
    await ok.click();

    await expect(page.getByTestId('error-toast-content')).toContainText('maximum of 3 decimal places in HIVE amount');
    await expect(confirmDialog(page)).toBeVisible();
    await expect(ok).toBeEnabled();
    expect(broadcasts.calls).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});
