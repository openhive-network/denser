import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { startWalletApiStub } from '../support/walletApiStub';

/**
 * A wallet page of an account the chain does not have shows the not-found page, not the error
 * boundary (#1140). `find_accounts` answers it with no account, as the API nodes do. A server 404
 * keeps the not-found title after hydration.
 */

const MISSING_ACCOUNT = 'no-such-account';
const NOT_FOUND_TEXT = 'Sorry! This page does not exist.';
const NOT_FOUND_TITLE = 'Page not found - Hive Wallet';
const NO_ACCOUNTS = { 'database_api.find_accounts': () => ({ accounts: [] }) };
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': '*'
};

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

const expectNotFoundPage = async (page: Page) => {
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(page.getByTestId('profile-info')).toHaveCount(0);
  await expect(page).not.toHaveTitle(/undefined/);
};

test.describe('Account not found', () => {
  test('WALLET-NOT-FOUND-01 — the server answers a missing account with a 404 page', async ({ page }) => {
    const stub: Server = await startWalletApiStub(undefined, NO_ACCOUNTS);
    try {
      const response = await page.goto(`${WALLET_BASE_PATH}/@${MISSING_ACCOUNT}/transfers`);

      expect(response?.status()).toBe(404);
      await expectNotFoundPage(page);
      // document.title: the client must not replace the server's not-found title after hydration.
      await expect(page).toHaveTitle(NOT_FOUND_TITLE);
    } finally {
      await new Promise((resolve) => stub.close(resolve));
    }
  });

  test('WALLET-NOT-FOUND-03 — a path that is not an account is a 404 with the not-found title', async ({ page }) => {
    const response = await page.goto(`${WALLET_BASE_PATH}/this-page-does-not-exist-xyz`);

    expect(response?.status()).toBe(404);
    await expectNotFoundPage(page);
    await expect(page).toHaveTitle(NOT_FOUND_TITLE);
  });

  test('WALLET-NOT-FOUND-02 — a missing account read by the client shows the not-found page', async ({ page }) => {
    // No stub: the server's prefetch fails and leaves the read to the browser, answered here.
    await page.route(`http://127.0.0.1:${FIXTURE_API_PORT}/**`, (route) => {
      if (route.request().method() !== 'POST') return route.fulfill({ status: 204, headers: CORS_HEADERS });
      const { method, id } = route.request().postDataJSON() ?? {};
      const body =
        method === 'database_api.find_accounts'
          ? { jsonrpc: '2.0', result: { accounts: [] }, id }
          : { jsonrpc: '2.0', error: { code: -32601, message: `Not served: ${method}` }, id };
      return route.fulfill({ json: body, headers: CORS_HEADERS });
    });

    await page.goto(`${WALLET_BASE_PATH}/@${MISSING_ACCOUNT}/transfers`);

    await expectNotFoundPage(page);
  });
});
