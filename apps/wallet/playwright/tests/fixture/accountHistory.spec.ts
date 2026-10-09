import type { Server } from 'node:http';
import { test, expect, type Page, type Route } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub, stubTransfer } from '../support/walletApiStub';

/**
 * The account history of /@account/transfers is read a small page at a time, older pages on
 * demand, and a failed read leaves an error with Retry in the section while the balances stay.
 * The other reads come from the stub node (support/walletApiStub.ts); the operations requests are
 * answered by each test through `page.route`.
 */

const OPERATIONS_URL = new RegExp(`/hivemind-api/accounts/${STUB_ACCOUNT}/operations\\?`);
const FIRST_PAGE_SIZE = '100';
const NEWER_SENDER = 'newer-sender';
const OLDER_SENDER = 'older-sender';
const RECURRING_SENDER = 'recurring-sender';
const INTEREST = { amount: '1539', precision: 3, nai: '@@000000013' };
const CANCELLED_REQUEST_ID = 1773083171;

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

const operationsPage = (sender: string, page: number) => ({
  total_operations: 4,
  total_pages: 2,
  block_range: { from: 1, to: 100_000_000 },
  operations_result: [1, 2].map((index) => stubTransfer({ from: sender, operationId: `${page}0${index}` }))
});

const recurrentTransfer = (from: string, operationId: string) => {
  const transfer = stubTransfer({ from, operationId });
  return {
    ...transfer,
    op: {
      type: 'recurrent_transfer_operation',
      value: { ...transfer.op.value, recurrence: 24, executions: 5, extensions: [] }
    },
    op_type_id: 49
  };
};

// A cancelled savings withdrawal and the interest virtual op its transaction paid: the same trx_id,
// and operation ids beyond Number.MAX_SAFE_INTEGER that differ only in the last digit, as the API sends them.
const cancelWithInterest = () => {
  const transfer = stubTransfer({ from: STUB_ACCOUNT, operationId: '448768239267217408' });
  return [
    {
      ...transfer,
      op: {
        type: 'interest_operation',
        value: { owner: STUB_ACCOUNT, interest: INTEREST, is_saved_into_hbd_balance: false }
      },
      op_pos: 1,
      op_type_id: 55,
      virtual_op: true,
      operation_id: '448768239267217409'
    },
    {
      ...transfer,
      op: {
        type: 'cancel_transfer_from_savings_operation',
        value: { from: STUB_ACCOUNT, request_id: CANCELLED_REQUEST_ID }
      },
      op_type_id: 34
    }
  ];
};

// The browser reads the operations from the API origin, so the answer needs the CORS header the API sends.
const fulfillJson = (route: Route, json: unknown, status = 200) =>
  route.fulfill({ status, json, headers: { 'access-control-allow-origin': '*' } });

/** Answers the operations requests with `answer`, recording each request's query. */
const routeOperations = async (
  page: Page,
  answer: (query: URLSearchParams, route: Route) => Promise<void>
) => {
  const queries: URLSearchParams[] = [];
  await page.route(OPERATIONS_URL, async (route) => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(query);
    await answer(query, route);
  });
  return queries;
};

const historyRows = (page: Page) => page.getByTestId('wallet-account-history-row');

test.describe('Wallet account history', () => {
  test('WALLET-HISTORY-01 — the first request asks for a small page, and Older loads the next one', async ({
    page
  }) => {
    const queries = await routeOperations(page, (query, route) =>
      fulfillJson(
        route,
        query.get('page') === '1' ? operationsPage(OLDER_SENDER, 1) : operationsPage(NEWER_SENDER, 2)
      )
    );

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    await expect(historyRows(page)).toHaveCount(2);
    await expect(historyRows(page).first()).toContainText(`from ${NEWER_SENDER}`);
    expect(queries).toHaveLength(1);
    expect(queries[0].get('page-size')).toBe(FIRST_PAGE_SIZE);
    expect(queries[0].has('page')).toBe(false);

    await page.getByTestId('wallet-account-history-older').click();

    await expect(historyRows(page)).toHaveCount(4);
    await expect(historyRows(page).last()).toContainText(`from ${OLDER_SENDER}`);
    expect(queries.map((query) => query.get('page'))).toEqual([null, '1']);
    expect(queries[1].get('page-size')).toBe(FIRST_PAGE_SIZE);
    // Page 1 is the oldest: there is nothing older to load
    await expect(page.getByTestId('wallet-account-history-older')).toHaveCount(0);
  });

  test('WALLET-HISTORY-02 — a failing history shows an error with Retry next to the balances, and Retry loads the rows', async ({
    page
  }) => {
    let failing = true;
    const queries = await routeOperations(page, (_query, route) =>
      failing
        ? fulfillJson(route, { message: 'canceling statement due to statement timeout' }, 500)
        : fulfillJson(route, operationsPage(NEWER_SENDER, 2))
    );

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    await expect(page.getByTestId('wallet-account-history-error')).toContainText(
      'Could not load account history.'
    );
    await expect(page.getByTestId('wallet-hive-value')).toContainText('1,234.567 HIVE');
    await expect(historyRows(page)).toHaveCount(0);
    // The failed read was repeated once before the error was shown
    expect(queries).toHaveLength(2);

    failing = false;
    await page.getByTestId('wallet-account-history-retry').click();

    await expect(historyRows(page)).toHaveCount(2);
    await expect(page.getByTestId('wallet-account-history-error')).toHaveCount(0);
    expect(queries).toHaveLength(3);
  });

  test('WALLET-HISTORY-03 — the search hides every operation that does not involve the searched account', async ({
    page
  }) => {
    await routeOperations(page, (_query, route) =>
      fulfillJson(route, {
        total_operations: 2,
        total_pages: 1,
        block_range: { from: 1, to: 100_000_000 },
        operations_result: [
          stubTransfer({ from: NEWER_SENDER, operationId: '101' }),
          recurrentTransfer(RECURRING_SENDER, '102')
        ]
      })
    );

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    await expect(historyRows(page)).toHaveCount(2);

    await page.getByTestId('wallet-search-input').fill('unknownuser');
    await expect(page.getByTestId('wallet-account-history-no-transacions-found')).toHaveText(
      'No transactions found'
    );
    await expect(historyRows(page)).toHaveCount(0);

    await page.getByTestId('wallet-search-input').fill(RECURRING_SENDER);
    await expect(historyRows(page)).toHaveCount(1);
    await expect(historyRows(page)).toContainText(RECURRING_SENDER);
  });

  test('WALLET-HISTORY-04 — a cancelled savings withdrawal and the interest it paid render as two rows', async ({
    page
  }) => {
    await routeOperations(page, (_query, route) =>
      fulfillJson(route, {
        total_operations: 2,
        total_pages: 1,
        block_range: { from: 1, to: 100_000_000 },
        operations_result: cancelWithInterest()
      })
    );

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    await expect(historyRows(page)).toHaveCount(2);
    await expect(historyRows(page).first()).toContainText('Received interest of 1.539 HBD');
    await expect(historyRows(page).last()).toContainText(
      `Cancel transfer from savings (request ${CANCELLED_REQUEST_ID})`
    );
  });
});
