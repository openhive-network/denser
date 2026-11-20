import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startWalletApiStub } from '../support/walletApiStub';
import { REAL_SIZE_PAGE_REST_RESULTS, REAL_SIZE_PAGE_RESULTS } from '../support/proposalsApiStub';

/**
 * A page the server rendered in English while the language cookie already says Polish (another app
 * of the origin switched it, or a first visit stored the browser's language): the browser shows its
 * texts in Polish as soon as it reads the cookie, and the server's Polish render comes with
 * `router.refresh()`. No frame in between may show a proposal's HP total in English digits beside
 * Polish text ("51.55M HP" for "51,55M HP"). The refresh is held back so that frame would last.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const PHONE_VIEWPORT = { width: 390, height: 844 };
const REFRESH_DELAY_MS = 4000;
const DOT_DECIMAL = /\d\.\d/;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, REAL_SIZE_PAGE_RESULTS, REAL_SIZE_PAGE_REST_RESULTS);
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

interface AmountFrame {
  amount: string;
  remaining: string;
}

test.describe('Proposals list locale on the first render', () => {
  test.use({ viewport: PHONE_VIEWPORT });

  test('WALLET-PROPOSALS-LOCALE-01-pl — no HP total beside Polish text is in English digits, off-screen rows included', async ({
    page,
    context,
    baseURL
  }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: baseURL }]);
    // The server renders the request's English; the page then finds the cookie Polish
    await context.addInitScript(() => {
      document.cookie = 'NEXT_LOCALE=pl; path=/';
      const frames: AmountFrame[] = [];
      Object.assign(window, { amountFrames: frames });
      const record = () => {
        for (const row of document.querySelectorAll('[data-testid="proposal-list-item"]')) {
          const amount = row.querySelector('[data-testid="vote-proposal-value"]')?.textContent ?? '';
          const remaining = row.querySelector('[data-testid="proposal-remaining-days"]')?.textContent ?? '';
          if (amount) frames.push({ amount, remaining });
        }
      };
      new MutationObserver(record).observe(document, { subtree: true, childList: true, characterData: true });
    });
    await page.route(
      (url) => url.pathname.startsWith(`${WALLET_BASE_PATH}/proposals`),
      async (route) => {
        if (route.request().headers()['rsc'] === '1') {
          await new Promise((resolve) => setTimeout(resolve, REFRESH_DELAY_MS));
        }
        await route.fallback();
      }
    );

    const refreshed = page.waitForResponse((response) => response.request().headers()['rsc'] === '1', {
      timeout: HYDRATION_TIMEOUT
    });
    await page.goto(`${WALLET_BASE_PATH}/proposals`);
    await expect(page.getByTestId('proposal-remaining-days').last()).toHaveText(/^Pozosta/, {
      timeout: HYDRATION_TIMEOUT
    });
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await page.getByTestId('proposal-list-item').last().scrollIntoViewIfNeeded();
    // The server's Polish render, which replaces the English one
    await refreshed;
    await expect(page.getByTestId('vote-proposal-value').filter({ hasText: /\d,\d/ }).first()).toBeVisible();

    const frames = await page.evaluate(() => (window as unknown as { amountFrames: AmountFrame[] }).amountFrames);
    const polish = frames.filter((frame) => frame.remaining.startsWith('Pozosta'));
    expect(polish.some((frame) => /,\d/.test(frame.amount))).toBe(true);
    expect(polish.filter((frame) => DOT_DECIMAL.test(frame.amount))).toEqual([]);
  });
});
