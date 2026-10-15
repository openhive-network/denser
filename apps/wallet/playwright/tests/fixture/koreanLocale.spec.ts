import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';

/**
 * Korean is a UI language of the wallet: a `NEXT_LOCALE=ko` cookie renders the account's wallet in
 * Korean with `<html lang="ko">` and the Korean flag. Reads come from the stub node
 * (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;
/** `navigation.wallet_nav.label` and `navigation.wallet_nav.balances` in Korean. */
const WALLET_NAV_KO = '지갑';
const BALANCES_KO = '잔액';

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

test('WALLET-KO-LOCALE-01 — NEXT_LOCALE=ko renders the transfers page in Korean', async ({
  page,
  context,
  baseURL
}) => {
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'ko', url: baseURL }]);

  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  const walletNav = page.getByRole('navigation', { name: WALLET_NAV_KO });
  await expect(walletNav.getByRole('link', { name: BALANCES_KO })).toHaveAttribute('aria-current', 'page', {
    timeout: HYDRATION_TIMEOUT
  });
  await expect(page.getByTestId('toggle-language').first()).toHaveText('🇰🇷');
});
