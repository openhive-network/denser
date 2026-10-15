import type { Server } from 'node:http';
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_PROPOSAL_SUBJECT, startWalletApiStub } from '../support/walletApiStub';

/**
 * The wallet keeps the UI language in the one origin-wide `NEXT_LOCALE` cookie (`path=/`), the
 * cookie the blog reads on the shared origin too: a switch under `/wallet` replaces it rather than
 * adding a second cookie scoped to the wallet's path (#1205).
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const LOCALE_COOKIE = 'NEXT_LOCALE';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  await page.clock.setFixedTime(NOW);
});

const localeCookies = async (context: BrowserContext) =>
  (await context.cookies()).filter(({ name }) => name === LOCALE_COOKIE).map(({ value, path }) => ({ value, path }));

const openProposals = async (page: Page) => {
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  await expect(page.getByTestId('proposal-title')).toContainText(STUB_PROPOSAL_SUBJECT, {
    timeout: HYDRATION_TIMEOUT
  });
};

test.describe('Language cookie', () => {
  test('WALLET-LANG-COOKIE-01 — the root cookie wins over a wallet-scoped copy and a stored language', async ({
    page,
    context,
    baseURL
  }) => {
    const { hostname } = new URL(baseURL ?? '');
    await context.addCookies([
      { name: LOCALE_COOKIE, value: 'pl', domain: hostname, path: '/' },
      { name: LOCALE_COOKIE, value: 'en', domain: hostname, path: WALLET_BASE_PATH }
    ]);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LOCALE_COOKIE);

    await openProposals(page);

    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page.getByTestId('toggle-language').first()).toHaveText('🇵🇱');
    await expect(page.getByTestId('proposal-status-badge')).toHaveText('rozpoczęta');
    await expect.poll(() => localeCookies(context)).toEqual([{ value: 'pl', path: '/' }]);
  });

  test('WALLET-LANG-COOKIE-02 — switching under the base path leaves one origin-wide cookie', async ({
    page,
    context,
    baseURL
  }) => {
    await context.addCookies([{ name: LOCALE_COOKIE, value: 'pl', url: baseURL }]);
    await openProposals(page);
    await expect(page.getByTestId('proposal-status-badge')).toHaveText('rozpoczęta');

    await page.getByTestId('toggle-language').first().click();
    await page.getByTestId('en').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: HYDRATION_TIMEOUT });
    await expect(page.getByTestId('proposal-status-badge')).toHaveText('started', { timeout: HYDRATION_TIMEOUT });
    await expect(page.getByTestId('toggle-language').first()).toHaveText('🇬🇧');
    expect(await localeCookies(context)).toEqual([{ value: 'en', path: '/' }]);
  });
});
