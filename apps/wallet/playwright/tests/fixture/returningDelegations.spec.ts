import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { STUB_ACCOUNT, STUB_DELEGATEE, startWalletApiStub } from '../support/walletApiStub';

/**
 * /@account/delegations lists the removed HP delegations that have not returned yet, with their
 * amount and return time, and leaves the section out when there are none. The other reads come
 * from the stub node (support/walletApiStub.ts); the expirations call is answered by each test
 * through `page.route`.
 */

const EXPIRATIONS_METHOD = 'database_api.find_vesting_delegation_expirations';

const vests = (amount: string) => ({ amount, precision: 6, nai: '@@000000037' });

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

/** Answers the browser's expirations call with `delegations`; every other call reaches the stub node. */
const routeExpirations = async (page: Page, delegations: unknown[]) => {
  const accounts: unknown[] = [];
  await page.route(
    (url) => url.port === String(FIXTURE_API_PORT),
    async (route) => {
      const request = route.request();
      const body = request.method() === 'POST' ? request.postDataJSON() : undefined;
      if (body?.method !== EXPIRATIONS_METHOD) return route.fallback();
      accounts.push(body.params?.account);
      await route.fulfill({
        json: { jsonrpc: '2.0', result: { delegations }, id: body.id },
        headers: { 'access-control-allow-origin': '*' }
      });
    }
  );
  return accounts;
};

const returningRows = (page: Page) => page.getByTestId('wallet-returning-delegation-item');

test.describe('Wallet returning delegations', () => {
  test('WALLET-RETURNING-01 — each expiring delegation is listed with its HP and return time', async ({ page }) => {
    const accounts = await routeExpirations(page, [
      { id: 11, delegator: STUB_ACCOUNT, vesting_shares: vests('3300000000'), expiration: '2026-10-03T08:15:00' },
      { id: 12, delegator: STUB_ACCOUNT, vesting_shares: vests('1650000000000'), expiration: '2026-10-05T18:30:00' }
    ]);

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/delegations`);

    await expect(page.getByTestId('wallet-returning-delegations')).toContainText('Returning delegations');
    await expect(returningRows(page)).toHaveCount(2);
    await expect(returningRows(page).nth(0)).toContainText('1.800 HP');
    await expect(returningRows(page).nth(0)).toContainText('Returns Oct 3, 2026 8:15 AM');
    await expect(returningRows(page).nth(1)).toContainText('900.000 HP');
    await expect(returningRows(page).nth(1)).toContainText('Returns Oct 5, 2026 6:30 PM');
    expect(accounts).toContain(STUB_ACCOUNT);
  });

  test('WALLET-RETURNING-02 — with no expiring delegations the section is absent', async ({ page }) => {
    const accounts = await routeExpirations(page, []);

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/delegations`);

    await expect(page.getByTestId('wallet-delegation-item')).toContainText(STUB_DELEGATEE);
    await expect.poll(() => accounts.length).toBeGreaterThan(0);
    await expect(page.getByTestId('wallet-returning-delegations')).toHaveCount(0);
  });
});
