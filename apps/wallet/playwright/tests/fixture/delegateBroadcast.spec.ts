import type { Server } from 'node:http';
import { test, expect, type Page, type Route } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectDelegateVestingSharesOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * Delegate from the HIVE POWER balance menu signs and broadcasts one
 * `delegate_vesting_shares_operation` of the VESTS the HP amount is worth at the stub's vesting
 * fund (180,000,000.000 HIVE for 330,000,000,000.000000 VESTS: 3 HP is 5,500 VESTS); an amount
 * above the account's 900.000 HP, or below the stub's 1.000 HP minimum delegation, broadcasts nothing. Reads come from the stub node
 * (support/walletApiStub.ts); the broadcast and `verify_authority` are answered by the
 * interceptor, so the key signing it belongs to no account.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

/** The dialog's title, as the wallet's English locale spells it. */
const DELEGATE_TITLE = 'Delegate To Account';

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

/** The JSON-RPC method of a request to the stub node, or null when it is not one. */
const rpcMethod = (route: Route): string | null => {
  try {
    const body = route.request().postDataJSON();
    return typeof body?.method === 'string' ? body.method : null;
  } catch {
    return null;
  }
};

/** Answers the stub node's `methods` with `answer` (a JSON-RPC body without `id`); other calls go on. */
const answerRpc = (page: Page, methods: readonly string[], answer: Record<string, unknown>) =>
  page.route(
    (url) => url.hostname === '127.0.0.1',
    (route) =>
      methods.includes(rpcMethod(route) ?? '')
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ jsonrpc: '2.0', id: route.request().postDataJSON().id ?? 1, ...answer })
          })
        : route.fallback()
  );

/** hived's answer to a delegation below the minimum: 1,833.333334 VESTS, 1.000 HP at the stub's fund. */
const BROADCAST_METHODS = [
  'network_broadcast_api.broadcast_transaction',
  'condenser_api.broadcast_transaction',
  'network_broadcast_api.broadcast_transaction_synchronous',
  'condenser_api.broadcast_transaction_synchronous'
];

const MIN_DELEGATION_REJECTION = {
  error: {
    code: -32003,
    message: 'Assert Exception:op_vesting_shares >= min_delegation: Account must delegate a minimum of ${v}',
    data: {
      code: 10,
      name: 'assert_exception',
      message: 'Assert Exception',
      stack: [
        {
          // wax only parses an exception whose context has every field hived sends.
          context: {
            level: 'error',
            file: 'hive_evaluator_transfer.cpp',
            line: 811,
            method: 'do_apply',
            hostname: '',
            thread_name: 'th_a',
            timestamp: '2026-10-13T08:29:00'
          },
          format: 'Account must delegate a minimum of ${v}',
          data: {
            subject: naiAsset('5500.000000 VESTS'),
            v: naiAsset('1833.333334 VESTS')
          }
        }
      ],
      extension: { assertion_expression: 'op_vesting_shares >= min_delegation && "Minimum not reached"' }
    }
  }
};

const openDelegateDialog = async (page: Page) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  const menuTrigger = page.getByTestId('wallet-hive-power').getByRole('button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await menuTrigger.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await menu.getByText('Delegate', { exact: true }).click();
  return page.getByRole('dialog', { name: DELEGATE_TITLE, exact: true });
};

/**
 * Opens the Delegate dialog of STUB_ACCOUNT's transfers page, logged in with its active key, and
 * fills in STUB_FOLLOWED as the delegatee and `amount` HP.
 */
const fillDelegateDialog = async (page: Page, amount: string) => {
  const dialog = await openDelegateDialog(page);
  await dialog.locator('input[cmdk-input]').fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
  await dialog.getByPlaceholder('Amount').fill(amount);
  await dialog.getByRole('button', { name: 'Next' }).click();
  return dialog;
};

test.describe('Delegate broadcast', () => {
  test('WALLET-TX-DELEGATE-01 — delegating broadcasts the delegator, delegatee and the VESTS of the HP amount', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await fillDelegateDialog(page, '3');

    const confirm = page.getByRole('dialog', { name: `Confirm ${DELEGATE_TITLE}` });
    await expect(confirm.getByRole('heading', { name: `Confirm ${DELEGATE_TITLE}` })).toBeFocused();
    await confirm.getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectDelegateVestingSharesOperation(broadcasts.calls[0], {
      delegator: STUB_ACCOUNT,
      delegatee: STUB_FOLLOWED,
      vesting_shares: naiAsset('5500.000000 VESTS')
    });
  });

  test('WALLET-TX-DELEGATE-02 — an amount above the available HP is refused and broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await fillDelegateDialog(page, '900.001');

    await expect(dialog.getByText('Insufficient funds.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: `Confirm ${DELEGATE_TITLE}` })).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });

  test('WALLET-TX-DELEGATE-03 — an amount below the minimum delegation is refused and broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await fillDelegateDialog(page, '0.5');

    await expect(dialog.getByText('Minimum delegation is 1.000 HP.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: `Confirm ${DELEGATE_TITLE}` })).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });

  test('WALLET-TX-DELEGATE-04 — an account with less HP than the minimum is told it cannot delegate', async ({
    page
  }) => {
    // A 3,000.000 HIVE fee makes the minimum 1,000.000 HP, above the account's 900.000 HP.
    await answerRpc(page, ['database_api.get_witness_schedule'], {
      result: { median_props: { account_creation_fee: naiAsset('3000.000 HIVE') } }
    });
    const dialog = await openDelegateDialog(page);

    await expect(dialog.getByRole('alert')).toHaveText(
      'You cannot delegate yet: the minimum delegation is 1000.000 HP and you have 900.000 HP available.'
    );
    await expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('WALLET-TX-DELEGATE-05 — a delegation the chain rejects for the minimum is explained in HP', async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await answerRpc(page, BROADCAST_METHODS, MIN_DELEGATION_REJECTION);
    await fillDelegateDialog(page, '3');

    const confirm = page.getByRole('dialog', { name: `Confirm ${DELEGATE_TITLE}` });
    await confirm.getByRole('button', { name: 'OK' }).click();

    await expect(
      page.getByText('Delegation rejected: the minimum is 1.000 HP (you tried 3.000 HP).', { exact: true })
    ).toBeVisible();
    await expect(confirm.getByRole('heading', { name: `Confirm ${DELEGATE_TITLE}` })).toBeFocused();
  });
});

test.describe('HIVE POWER description', () => {
  test('WALLET-HP-DESC-01 — an account that delegates nothing is not told part of its HIVE POWER is delegated', async ({
    page
  }) => {
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    const description = page.getByTestId('wallet-hive-power-description');

    await expect(description).toContainText('subject to blockchain variance. See FAQ for details.');
    await expect(description).not.toContainText('is currently delegated');
  });
});
