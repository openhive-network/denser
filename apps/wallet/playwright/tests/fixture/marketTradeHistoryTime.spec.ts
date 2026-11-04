import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startWalletApiStub } from '../support/walletApiStub';

/**
 * The market's trade history shows how long ago each trade was and keeps that current while the page
 * is open, as every other relative time does (the shared minute clock of @hive/ui's TimeAgo). The
 * page's clock starts at NOW and runs; the stub node answers one trade made TRADE_AGE_SECONDS before.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-11-04T12:00:00Z');
const TRADE_AGE_SECONDS = 61;
const MINUTE_MS = 60_000;
/** Zoneless, as the node returns it. */
const TRADE_DATE = new Date(NOW.getTime() - TRADE_AGE_SECONDS * 1000).toISOString().slice(0, 19);

const trade = {
  date: TRADE_DATE,
  current_pays: { amount: '2520', precision: 3, nai: '@@000000013' },
  open_pays: { amount: '10000', precision: 3, nai: '@@000000021' },
  maker: 'stub-maker',
  taker: 'stub-taker'
};

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    'market_history_api.get_recent_trades': () => ({ trades: [trade] })
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.use({ locale: 'en-US' });

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

test.describe('Market trade history time', () => {
  test('WALLET-MARKET-TRADE-TIME-01 — a trade shown "1 minute ago" reads "2 minutes ago" a minute later without a reload', async ({
    page
  }) => {
    await page.clock.install({ time: NOW });
    await page.goto(`${WALLET_BASE_PATH}/market`);

    const tradeTime = page.getByTestId('trade-history-row-0-date');
    await expect(tradeTime).toHaveText('1 minute ago', { timeout: HYDRATION_TIMEOUT });

    await page.clock.runFor(MINUTE_MS);

    await expect(tradeTime).toHaveText('2 minutes ago');
  });
});
