import type { Server } from 'node:http';
import { test, expect, type Page, type Route } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { STUB_ACCOUNT, STUB_DELEGATEE, startWalletApiStub } from '../support/walletApiStub';

/**
 * /@account/delegations lists the HP delegations the account receives (balance-api), with their HP
 * and start date, largest first and paged; leaves the section out when there are none; and on a
 * node without balance-api shows an inline notice while the outgoing and returning sections still
 * render. The other reads come from the stub node (support/walletApiStub.ts); the delegations REST
 * call and the expirations call are answered by each test through `page.route`.
 */

const DELEGATIONS_PATH = `/balance-api/accounts/${STUB_ACCOUNT}/delegations`;
const EXPIRATIONS_METHOD = 'database_api.find_vesting_delegation_expirations';
const CORS = { 'access-control-allow-origin': '*' };
/** The stub node's head block (support/witnessApiStub.ts), produced at its `time`, 2026-10-01T12:00:00 */
const HEAD_BLOCK = 100_000_000;
const BLOCKS_PER_DAY = 28_800;

const vests = (amount: string) => ({ amount, precision: 6, nai: '@@000000037' });
const incoming = (delegator: string, amount: string, blockNum = HEAD_BLOCK) => ({
  delegator,
  amount,
  operation_id: '1',
  block_num: blockNum
});

type DelegationsAnswer = { status: 200; incoming: unknown[] } | { status: 404 };

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.use({ timezoneId: 'UTC', locale: 'en-US' });

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

const fulfillDelegations = (route: Route, answer: DelegationsAnswer) =>
  answer.status === 404
    ? route.fulfill({ status: 404, json: { code: 'P0001', message: 'Not found' }, headers: CORS })
    : route.fulfill({ json: { outgoing_delegations: [], incoming_delegations: answer.incoming }, headers: CORS });

/**
 * Answers the browser's balance-api delegations call with `answer()` and its expirations call with
 * `expirations`; every other call reaches the stub node. Resolves with the count of delegations calls.
 */
const routeDelegations = async (page: Page, answer: () => DelegationsAnswer, expirations: unknown[] = []) => {
  const calls = { delegations: 0 };
  await page.route(
    (url) => url.port === String(FIXTURE_API_PORT),
    async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && new URL(request.url()).pathname === DELEGATIONS_PATH) {
        calls.delegations += 1;
        return fulfillDelegations(route, answer());
      }
      const body = request.method() === 'POST' ? request.postDataJSON() : undefined;
      if (body?.method !== EXPIRATIONS_METHOD) return route.fallback();
      await route.fulfill({
        json: { jsonrpc: '2.0', result: { delegations: expirations }, id: body.id },
        headers: CORS
      });
    }
  );
  return calls;
};

const incomingRows = (page: Page) => page.getByTestId('wallet-incoming-delegation-item');
const delegationsPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/delegations`;

test.describe('Wallet incoming delegations', () => {
  test('WALLET-INCOMING-01 — received delegations are listed largest first with their HP and start date', async ({
    page
  }) => {
    await routeDelegations(page, () => ({
      status: 200,
      incoming: [
        incoming('stub-small', '3300000000', HEAD_BLOCK - BLOCKS_PER_DAY),
        incoming('stub-large', '1650000000000')
      ]
    }));

    await page.goto(delegationsPage);

    await expect(page.getByTestId('wallet-incoming-delegations')).toContainText('Incoming delegations');
    await expect(incomingRows(page)).toHaveCount(2);
    await expect(incomingRows(page).nth(0)).toContainText('900.000 HP');
    await expect(incomingRows(page).nth(0)).toContainText('stub-large');
    await expect(incomingRows(page).nth(0)).toContainText('Since Oct 1, 2026');
    await expect(incomingRows(page).nth(1)).toContainText('1.800 HP');
    await expect(incomingRows(page).nth(1)).toContainText('stub-small');
    await expect(incomingRows(page).nth(1)).toContainText('Since Sep 30, 2026');
    await expect(page.getByTestId('wallet-incoming-delegations-pagination')).toHaveCount(0);
  });

  test('WALLET-INCOMING-02 — with no received delegations the section is absent', async ({ page }) => {
    const calls = await routeDelegations(page, () => ({ status: 200, incoming: [] }));

    await page.goto(delegationsPage);

    await expect(page.getByTestId('wallet-delegation-item')).toContainText(STUB_DELEGATEE);
    await expect.poll(() => calls.delegations).toBeGreaterThan(0);
    await expect(page.getByTestId('wallet-incoming-delegations')).toHaveCount(0);
    await expect(page.getByTestId('wallet-incoming-delegations-unavailable')).toHaveCount(0);
  });

  test('WALLET-INCOMING-03 — a node without balance-api shows an inline notice, the other sections still render, and retry recovers', async ({
    page
  }) => {
    let answer: DelegationsAnswer = { status: 404 };
    await routeDelegations(
      page,
      () => answer,
      [{ id: 11, delegator: STUB_ACCOUNT, vesting_shares: vests('3300000000'), expiration: '2026-10-03T08:15:00' }]
    );

    await page.goto(delegationsPage);

    const unavailable = page.getByTestId('wallet-incoming-delegations-unavailable');
    await expect(unavailable).toContainText('Incoming delegations are unavailable on this API node.');
    await expect(page.getByTestId('wallet-delegation-item')).toContainText(STUB_DELEGATEE);
    await expect(page.getByTestId('wallet-returning-delegation-item')).toContainText('1.800 HP');
    await expect(incomingRows(page)).toHaveCount(0);

    answer = { status: 200, incoming: [incoming('stub-large', '1650000000000')] };
    await unavailable.getByRole('button', { name: 'Retry' }).click();

    await expect(incomingRows(page)).toHaveCount(1);
    await expect(incomingRows(page).nth(0)).toContainText('900.000 HP');
    await expect(unavailable).toHaveCount(0);
  });

  test('WALLET-INCOMING-04 — hundreds of delegators are paged 25 at a time', async ({ page }) => {
    const delegators = Array.from({ length: 30 }, (_, index) =>
      incoming(`stub-delegator-${String(index).padStart(2, '0')}`, String(1_000_000_000 * (30 - index)))
    );
    await routeDelegations(page, () => ({ status: 200, incoming: delegators }));

    await page.goto(delegationsPage);

    const pagination = page.getByTestId('wallet-incoming-delegations-pagination');
    await expect(incomingRows(page)).toHaveCount(25);
    await expect(incomingRows(page).nth(0)).toContainText('stub-delegator-00');
    await expect(pagination).toContainText('Page 1 of 2');
    await expect(pagination.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await pagination.getByRole('button', { name: 'Next' }).click();

    await expect(incomingRows(page)).toHaveCount(5);
    await expect(incomingRows(page).nth(0)).toContainText('stub-delegator-25');
    await expect(pagination).toContainText('Page 2 of 2');
    await expect(pagination.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
