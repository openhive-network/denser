import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { confirmBroadcastsInBlocks } from '../support/blockConfirmation';
import { expectLimitOrderCancelOperation } from '../support/walletOperations';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub, storeStubAccountKey } from '../support/walletApiStub';

/**
 * Cancelling one of the signed-in account's open orders on the market page signs and broadcasts
 * one `limit_order_cancel_operation` naming that order. Reads come from the stub node
 * (support/walletApiStub.ts), which lists OPEN_ORDER for STUB_ACCOUNT; the broadcast and
 * `verify_authority` are answered by the interceptor.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const ORDER_ID = 1_759_226_400;

/** A sell order of 5.000 HIVE for 1.250 HBD, unfilled. */
const OPEN_ORDER = {
  id: 1,
  created: '2026-09-30T10:00:00',
  expiration: '2026-10-27T10:00:00',
  seller: STUB_ACCOUNT,
  orderid: ORDER_ID,
  for_sale: 5000,
  sell_price: {
    base: { amount: '5000', precision: 3, nai: '@@000000021' },
    quote: { amount: '1250', precision: 3, nai: '@@000000013' }
  }
};

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    'database_api.list_limit_orders': () => ({ orders: [OPEN_ORDER] })
  });
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

/** The page's toasts with `title`: the notification list's items, not the announcement Radix reads out. */
const toastsTitled = (page: Page, title: string) => page.getByRole('listitem').filter({ hasText: title });

/** The cancel confirmation's labels and the success toast, in each locale checked. */
const ORDER_CANCELLED_LOCALES = [
  {
    locale: 'en',
    cancel: 'Cancel',
    confirmation: `Cancel order ${ORDER_ID} from ${STUB_ACCOUNT}?`,
    cancelOrder: 'Cancel Order',
    title: 'Order cancelled',
    description: `Order ${ORDER_ID} was cancelled`
  },
  {
    locale: 'pl',
    cancel: 'Anuluj',
    confirmation: `Anulować zlecenie ${ORDER_ID} użytkownika ${STUB_ACCOUNT}?`,
    cancelOrder: 'Anuluj zlecenie',
    title: 'Zlecenie anulowane',
    description: `Zlecenie ${ORDER_ID} zostało anulowane`
  }
];

/** Opens /market signed in and the cancel confirmation of OPEN_ORDER; resolves with that dialog. */
const openCancelConfirmation = async (page: Page, labels = ORDER_CANCELLED_LOCALES[0]) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/market`);

  const confirmation = page.getByRole('dialog').filter({ hasText: labels.confirmation });
  // The open orders list renders only once the client knows the signed-in user, i.e. after hydration.
  await page.getByRole('button', { name: labels.cancel, exact: true }).click({ timeout: HYDRATION_TIMEOUT });
  await expect(confirmation).toBeVisible();
  return confirmation;
};

test.describe('Market limit order cancel broadcast', () => {
  test('WALLET-TX-ORDER-CANCEL-01 — confirming a cancel broadcasts the owner and the order id', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const confirmation = await openCancelConfirmation(page);
    await confirmation.getByRole('button', { name: 'Cancel Order' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectLimitOrderCancelOperation(broadcasts.calls[0], {
      owner: STUB_ACCOUNT,
      orderid: ORDER_ID
    });
  });

  test('WALLET-TX-ORDER-CANCEL-02 — dismissing the confirmation broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const confirmation = await openCancelConfirmation(page);
    await page.keyboard.press('Escape');

    await expect(confirmation).toBeHidden();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    expect(broadcasts.calls).toHaveLength(0);
  });

  for (const labels of ORDER_CANCELLED_LOCALES) {
    test(`WALLET-TX-ORDER-CANCEL-03-${labels.locale} — a cancelled order shows one success toast`, async ({
      page,
      context,
      baseURL
    }) => {
      await context.addCookies([{ name: 'NEXT_LOCALE', value: labels.locale, url: baseURL }]);
      const broadcasts = await installBroadcastInterceptor(page);
      await confirmBroadcastsInBlocks(page);
      const confirmation = await openCancelConfirmation(page, labels);
      await confirmation.getByRole('button', { name: labels.cancelOrder }).click();

      await broadcasts.waitForCount(1);
      const toast = toastsTitled(page, labels.title);
      await expect(toast).toHaveCount(1);
      await expect(toast).toContainText(labels.description);
      await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
    });
  }
});
