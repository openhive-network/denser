import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';

/**
 * The market order form, before anything is signed: the balance check, the Total = Price × Amount
 * invariant, the accessible names and the keyboard path from the order book to the price. Reads
 * come from the stub node (support/walletApiStub.ts: 2.500 HBD and 1234.567 HIVE available,
 * lowest ask 0.251), with one sell order at ASK_PRICE in the order book.
 */

const HYDRATION_TIMEOUT = 30_000;
const ASK_PRICE = '0.252000';

const ask = {
  created: '2026-10-01T11:00:00',
  order_price: {
    base: { amount: '10000', precision: 3, nai: '@@000000021' },
    quote: { amount: '2520', precision: 3, nai: '@@000000013' }
  },
  real_price: ASK_PRICE,
  hive: 10000,
  hbd: 2520
};

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    'market_history_api.get_order_book': () => ({ bids: [], asks: [ask] })
  });
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
  await logInAsStubAccount(page, 'active');
  await page.goto(`${WALLET_BASE_PATH}/market`);
});

/** Types `amount` into the form's amount until the hydrated form computes `expectedTotal`. */
const fillAmount = async (page: Page, form: 'buy-form' | 'sell-form', amount: string, expectedTotal: string) => {
  const amountInput = page.getByTestId(`${form}-amount-input`);
  await expect(async () => {
    await amountInput.fill(amount);
    await expect(page.getByTestId(`${form}-total-input`)).toHaveValue(expectedTotal, { timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
};

test.describe('Market order form', () => {
  test('WALLET-MARKET-FORM-01 — a buy whose total exceeds the HBD balance is disabled with the reason', async ({
    page
  }) => {
    await expect(page.getByTestId('buy-form-available-value')).toHaveText('2.500 HBD', {
      timeout: HYDRATION_TIMEOUT
    });
    await fillAmount(page, 'buy-form', '20', '5.020');

    const error = page.getByTestId('buy-form-balance-error');
    await expect(error).toHaveRole('alert');
    await expect(error).toContainText('2.500 HBD');
    await expect(page.getByTestId('buy-form-submit-button')).toBeDisabled();
    await expect(page.getByTestId('buy-form-total-input')).toHaveAttribute('aria-invalid', 'true');

    await fillAmount(page, 'buy-form', '5', '1.255');
    await expect(error).toBeHidden();
    await expect(page.getByTestId('buy-form-submit-button')).toBeEnabled();
  });

  test('WALLET-MARKET-FORM-02 — a sell whose amount exceeds the HIVE balance is disabled', async ({ page }) => {
    await expect(page.getByTestId('sell-form-available-value')).toHaveText('1234.567 HIVE', {
      timeout: HYDRATION_TIMEOUT
    });
    await fillAmount(page, 'sell-form', '2000', '498.000');

    await expect(page.getByTestId('sell-form-balance-error')).toBeVisible();
    await expect(page.getByTestId('sell-form-submit-button')).toBeDisabled();
    await expect(page.getByTestId('sell-form-amount-input')).toHaveAttribute('aria-invalid', 'true');
  });

  test('WALLET-MARKET-FORM-03 — the total follows the amount and a price picked from the order book by keyboard', async ({
    page
  }) => {
    await fillAmount(page, 'buy-form', '1000', '251.000');
    await page.getByTestId('buy-form-amount-input').fill('');
    await expect(page.getByTestId('buy-form-total-input')).toHaveValue('');

    await page.getByTestId('buy-form-amount-input').fill('1000');
    await page.getByRole('button', { name: `Use price ${ASK_PRICE}` }).focus();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('buy-form-price-input')).toHaveValue(ASK_PRICE);
    await expect(page.getByTestId('buy-form-total-input')).toHaveValue('252.000');
    await expect(page.getByTestId('sell-form-price-input')).toHaveValue(ASK_PRICE);
  });

  test('WALLET-MARKET-FORM-04 — inputs are named by side and unit, sections are headings', async ({ page }) => {
    await expect(page.getByRole('spinbutton', { name: 'Buy HIVE Price HBD/HIVE' })).toBeVisible({
      timeout: HYDRATION_TIMEOUT
    });
    await expect(page.getByRole('spinbutton', { name: 'Buy HIVE Amount HIVE' })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Sell HIVE Total HBD ($)' })).toBeVisible();

    for (const name of ['Buy HIVE', 'Sell HIVE', 'Buy Orders', 'Sell Orders', 'Trade History', 'Open Orders']) {
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Market');

    await expect(page.getByTestId('trade-history-pagination-prev')).toHaveText('Newer');
    await expect(page.getByTestId('trade-history-pagination-next')).toHaveText('Older');
  });
});
