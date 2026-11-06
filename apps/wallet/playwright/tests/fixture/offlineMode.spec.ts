import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import {
  STUB_ACCOUNT,
  STUB_POWER_DOWN_FIELDS,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey,
  stubAccountWith
} from '../support/walletApiStub';

/**
 * While the browser is offline the wallet stops asking the API nodes (React Query pauses, a read
 * asks one node instead of every one), shows one offline notice instead of an error toast per
 * failed read, and refuses an operation at once instead of spinning on code it cannot load.
 * Back online the page reads its data once and the notice goes.
 */

const HYDRATION_TIMEOUT = 30_000;
/** How long the page is watched offline: React Query's retries of a failed read take ~7 s. */
const OFFLINE_WATCH_MS = 15_000;
/** "A handful": a read in flight when the browser went offline, not one per node and retry. */
const MAX_OFFLINE_NODE_REQUESTS = 3;
const NODE_ORIGIN = `http://127.0.0.1:${FIXTURE_API_PORT}`;
const OFFLINE_NOTICE = "You're offline. The wallet will refresh once your connection is back.";

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, stubAccountWith(STUB_POWER_DOWN_FIELDS));
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline from the start, so
// context.setOffline() changes no state it would fire the offline and online events for.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

/** Takes the browser off the network (or back) and fires the event a browser would. */
const setOffline = async (page: Page, offline: boolean) => {
  await page.context().setOffline(offline);
  await page.evaluate((type) => window.dispatchEvent(new Event(type)), offline ? 'offline' : 'online');
};

/** Counts the requests the page sends to the API node (sent or failed in the browser). */
const countNodeRequests = (page: Page) => {
  const requests = { count: 0 };
  page.on('request', (request) => {
    if (request.url().startsWith(NODE_ORIGIN)) requests.count++;
  });
  return requests;
};

const openTransfers = async (page: Page) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  await expect(page.getByTestId('wallet-hive-power')).toBeVisible({ timeout: HYDRATION_TIMEOUT });
};

test.describe('Offline wallet', () => {
  test('WALLET-OFFLINE-01 — offline the page asks no node and shows one notice; online it reads once more', async ({
    page
  }) => {
    await openTransfers(page);
    const requests = countNodeRequests(page);
    const notice = page.getByTestId('offline-notice');

    await setOffline(page, true);
    await expect(notice).toHaveText(OFFLINE_NOTICE);
    await page.waitForTimeout(OFFLINE_WATCH_MS);

    expect(requests.count).toBeLessThanOrEqual(MAX_OFFLINE_NODE_REQUESTS);
    await expect(notice).toHaveCount(1);
    await expect(page.getByTestId('error-toast-content')).toHaveCount(0);

    const offlineCount = requests.count;
    await setOffline(page, false);

    await expect(notice).toHaveCount(0);
    await expect.poll(() => requests.count).toBeGreaterThan(offlineCount);
  });

  test('WALLET-OFFLINE-02 — Cancel Power Down offline fails within seconds and broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await openTransfers(page);
    const menuTrigger = page.getByTestId('wallet-hive-power').getByRole('button');
    const menu = page.getByRole('menu');
    await expect(async () => {
      await menuTrigger.click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });
    await menu.getByText('Cancel Power Down', { exact: true }).click();
    const prompt = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to cancel Power Down?' });
    await expect(prompt).toBeVisible();

    await setOffline(page, true);
    await prompt.getByRole('button', { name: 'Cancel Power Down' }).click();

    await expect(page.getByTestId('request-network-error-message')).toBeVisible({ timeout: 5_000 });
    await expect(prompt).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });
});
