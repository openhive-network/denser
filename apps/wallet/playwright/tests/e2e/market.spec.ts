import { expect, test } from '@playwright/test';
import { MarketPage } from '../support/pages/marketPage';
import { ApiHelper } from '../support/apiHelper';

/**
 * Market Page E2E Tests
 *
 * These tests verify the functionality of the Hive Wallet Market page,
 * including market statistics, order tables, trade history, and forms.
 *
 * Best practices applied:
 * - Uses data-testid selectors for reliability
 * - Groups related assertions to minimize navigation
 * - Uses web-first assertions with auto-retry
 * - Avoids hardcoded timeouts
 * - Page Object Model for maintainability
 */

test.describe('Market Page', () => {
  let marketPage: MarketPage;
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketPage(page);
    apiHelper = new ApiHelper(page);
    await marketPage.goto();
  });

  test.describe('Page Load', () => {
    test('should load market page with correct title and URL', async ({ page }) => {
      await expect(page).toHaveURL(/\/market/);
      await expect(page).toHaveTitle('Hive Wallet - Market');
    });

    test('should display all main sections', async () => {
      // Statistics
      await expect(marketPage.marketStatistics).toBeVisible();

      // Chart
      await expect(marketPage.chart).toBeVisible();

      // Buy/Sell forms
      await expect(marketPage.buyFormSection).toBeVisible();
      await expect(marketPage.sellFormSection).toBeVisible();

      // Order tables (visible on desktop)
      await expect(marketPage.buyOrdersSection).toBeVisible();
      await expect(marketPage.sellOrdersSection).toBeVisible();
      await expect(marketPage.tradeHistorySection).toBeVisible();
    });
  });

  test.describe('Market Statistics', () => {
    test('should display all statistics boxes', async () => {
      await expect(marketPage.lastPriceBox).toBeVisible();
      await expect(marketPage.volumeBox).toBeVisible();
      await expect(marketPage.bidBox).toBeVisible();
      await expect(marketPage.askBox).toBeVisible();
      await expect(marketPage.spreadBox).toBeVisible();
    });

    test('should display last price with correct format (6 decimal places)', async () => {
      const lastPrice = await marketPage.getLastPriceValue();
      expect(lastPrice).toBeTruthy();
      expect(lastPrice).toMatch(/^\d+\.\d{6}$/);
    });

    test('should display last price matching API data', async () => {
      const tickerData = await apiHelper.getMarketTickerAPI();
      const apiLastPrice = parseFloat(tickerData.result.latest).toFixed(6);
      const uiLastPrice = await marketPage.getLastPriceValue();

      expect(uiLastPrice).toBe(apiLastPrice);
    });

    test('should display bid price matching API data', async () => {
      const tickerData = await apiHelper.getMarketTickerAPI();
      const apiBidPrice = parseFloat(tickerData.result.highest_bid).toFixed(6);
      const uiBidPrice = await marketPage.getBidValue();

      expect(uiBidPrice).toBe(apiBidPrice);
    });

    test('should display ask price matching API data', async () => {
      const tickerData = await apiHelper.getMarketTickerAPI();
      const apiAskPrice = parseFloat(tickerData.result.lowest_ask).toFixed(6);
      const uiAskPrice = await marketPage.getAskValue();

      expect(uiAskPrice).toBe(apiAskPrice);
    });

    test('should calculate and display spread correctly', async () => {
      const tickerData = await apiHelper.getMarketTickerAPI();
      const highestBid = parseFloat(tickerData.result.highest_bid);
      const lowestAsk = parseFloat(tickerData.result.lowest_ask);

      // Spread formula: 200 * (lowest_ask - highest_bid) / (highest_bid + lowest_ask)
      const expectedSpread = ((200 * (lowestAsk - highestBid)) / (highestBid + lowestAsk)).toFixed(3);
      const uiSpread = await marketPage.getSpreadValue();

      expect(uiSpread).toBe(expectedSpread);
    });

    test('should display volume with valid numeric format', async () => {
      const volume = await marketPage.getVolumeValue();
      expect(volume).toBeTruthy();
      // Volume can contain commas for thousands separator
      expect(volume).toMatch(/^[\d,.]+$/);
    });
  });

  test.describe('Chart', () => {
    test('should display chart with bid and ask areas', async ({ page }) => {
      await expect(marketPage.chart).toBeVisible();

      // Chart should have recharts wrapper
      const rechartsWrapper = page.locator('.recharts-wrapper');
      await expect(rechartsWrapper).toBeVisible();

      // Should have two area elements (bids and asks)
      const chartAreas = page.locator('.recharts-area');
      await expect(chartAreas).toHaveCount(2);
    });
  });

  test.describe('Buy Form', () => {
    test('should display buy form with all elements', async () => {
      await expect(marketPage.buyFormSection).toBeVisible();
      await expect(marketPage.buyFormLabel).toBeVisible();
      await expect(marketPage.buyFormPriceInput).toBeVisible();
      await expect(marketPage.buyFormAmountInput).toBeVisible();
      await expect(marketPage.buyFormTotalInput).toBeVisible();
      await expect(marketPage.buyFormSubmitButton).toBeVisible();
    });

    test('should display buy form with correct styling (green)', async () => {
      await expect(marketPage.buyFormLabel).toHaveClass(/text-green-600/);
    });

    test('should have submit button disabled when no amount entered', async () => {
      await expect(marketPage.buyFormSubmitButton).toBeDisabled();
    });

    test('should display lowest ask price', async () => {
      await expect(marketPage.buyFormLowestAsk).toBeVisible();
      await expect(marketPage.buyFormLowestAsk).toContainText('Lowest ask');
    });

    test('should display available balance label', async () => {
      await expect(marketPage.buyFormAvailable).toBeVisible();
      await expect(marketPage.buyFormAvailable).toContainText('Available');
    });
  });

  test.describe('Sell Form', () => {
    test('should display sell form with all elements', async () => {
      await expect(marketPage.sellFormSection).toBeVisible();
      await expect(marketPage.sellFormLabel).toBeVisible();
      await expect(marketPage.sellFormPriceInput).toBeVisible();
      await expect(marketPage.sellFormAmountInput).toBeVisible();
      await expect(marketPage.sellFormTotalInput).toBeVisible();
      await expect(marketPage.sellFormSubmitButton).toBeVisible();
    });

    test('should display sell form with correct styling (red)', async () => {
      await expect(marketPage.sellFormLabel).toHaveClass(/text-destructive/);
    });

    test('should have submit button disabled when no amount entered', async () => {
      await expect(marketPage.sellFormSubmitButton).toBeDisabled();
    });

    test('should display highest bid price', async () => {
      await expect(marketPage.sellFormHighestBid).toBeVisible();
      await expect(marketPage.sellFormHighestBid).toContainText('Highest bid');
    });

    test('should display available balance label', async () => {
      await expect(marketPage.sellFormAvailable).toBeVisible();
      await expect(marketPage.sellFormAvailable).toContainText('Available');
    });
  });

  test.describe('Buy Orders Table', () => {
    test('should display buy orders section with header', async () => {
      await expect(marketPage.buyOrdersSection).toBeVisible();
      await expect(marketPage.buyOrdersHeader).toBeVisible();
      await expect(marketPage.buyOrdersHeader).toContainText('Buy Orders');
    });

    test('should display table with correct headers', async () => {
      const table = marketPage.buyOrdersTable;
      await expect(table).toBeVisible();

      // Check headers: Total HBD($), HBD($), HIVE, Price
      const headers = table.locator('th');
      await expect(headers).toHaveCount(4);
      await expect(headers.nth(0)).toContainText('Total HBD($)');
      await expect(headers.nth(1)).toContainText('HBD($)');
      await expect(headers.nth(2)).toContainText('HIVE');
      await expect(headers.nth(3)).toContainText('Price');
    });

    test('should display data rows (max 10 per page)', async () => {
      const orderBook = await apiHelper.getOrderBookAPI(500);
      const apiBidsCount = orderBook.result.bids.length;

      if (apiBidsCount > 0) {
        const rowCount = await marketPage.getBuyOrdersRowCount();
        expect(rowCount).toBeGreaterThan(0);
        expect(rowCount).toBeLessThanOrEqual(10);
      }
    });

    test('should display first row with correct data format', async () => {
      const rowCount = await marketPage.getBuyOrdersRowCount();

      if (rowCount > 0) {
        const firstRow = marketPage.getBuyOrderRow(0);
        await expect(firstRow).toBeVisible();

        // Total should have 3 decimal places
        const totalCell = firstRow.locator('[data-testid="buy-orders-row-0-total"]');
        const totalText = await totalCell.textContent();
        expect(totalText).toMatch(/^\d+\.\d{3}$/);

        // Price should have 6 decimal places
        const priceText = await marketPage.getBuyOrderPrice(0).textContent();
        expect(priceText).toMatch(/^\d+\.\d{6}$/);
      }
    });

    test('should display pagination buttons', async () => {
      await expect(marketPage.buyOrdersPagination).toBeVisible();
      await expect(marketPage.buyOrdersPaginationPrev).toBeVisible();
      await expect(marketPage.buyOrdersPaginationNext).toBeVisible();

      // First page - prev button should be disabled
      await expect(marketPage.buyOrdersPaginationPrev).toBeDisabled();
    });
  });

  test.describe('Sell Orders Table', () => {
    test('should display sell orders section with header', async () => {
      await expect(marketPage.sellOrdersSection).toBeVisible();
      await expect(marketPage.sellOrdersHeader).toBeVisible();
      await expect(marketPage.sellOrdersHeader).toContainText('Sell Orders');
    });

    test('should display table with correct headers', async () => {
      const table = marketPage.sellOrdersTable;
      await expect(table).toBeVisible();

      // Check headers: Price, HIVE, HBD($), Total HBD($)
      const headers = table.locator('th');
      await expect(headers).toHaveCount(4);
      await expect(headers.nth(0)).toContainText('Price');
      await expect(headers.nth(1)).toContainText('HIVE');
      await expect(headers.nth(2)).toContainText('HBD($)');
      await expect(headers.nth(3)).toContainText('Total HBD($)');
    });

    test('should display data rows (max 10 per page)', async () => {
      const orderBook = await apiHelper.getOrderBookAPI(500);
      const apiAsksCount = orderBook.result.asks.length;

      if (apiAsksCount > 0) {
        const rowCount = await marketPage.getSellOrdersRowCount();
        expect(rowCount).toBeGreaterThan(0);
        expect(rowCount).toBeLessThanOrEqual(10);
      }
    });

    test('should display first row with correct data format', async () => {
      const rowCount = await marketPage.getSellOrdersRowCount();

      if (rowCount > 0) {
        const firstRow = marketPage.getSellOrderRow(0);
        await expect(firstRow).toBeVisible();

        // Price should have 6 decimal places (first column for sell orders)
        const priceText = await marketPage.getSellOrderPrice(0).textContent();
        expect(priceText).toMatch(/^\d+\.\d{6}$/);

        // Total should have 3 decimal places
        const totalCell = firstRow.locator('[data-testid="sell-orders-row-0-total"]');
        const totalText = await totalCell.textContent();
        expect(totalText).toMatch(/^\d+\.\d{3}$/);
      }
    });

    test('should display pagination buttons', async () => {
      await expect(marketPage.sellOrdersPagination).toBeVisible();
      await expect(marketPage.sellOrdersPaginationPrev).toBeVisible();
      await expect(marketPage.sellOrdersPaginationNext).toBeVisible();

      // First page - prev (higher) button should be disabled for sell orders
      // because we're already at the lowest prices
      await expect(marketPage.sellOrdersPaginationPrev).toBeDisabled();
    });
  });

  test.describe('Trade History Table', () => {
    test('should display trade history section with header', async () => {
      await expect(marketPage.tradeHistorySection).toBeVisible();
      await expect(marketPage.tradeHistoryHeader).toBeVisible();
      await expect(marketPage.tradeHistoryHeader).toContainText('Trade History');
    });

    test('should display table with correct headers', async () => {
      const table = marketPage.tradeHistoryTable;
      await expect(table).toBeVisible();

      // Check headers: Date, Price, HIVE, HBD($)
      const headers = table.locator('th');
      await expect(headers).toHaveCount(4);
      await expect(headers.nth(0)).toContainText('Date');
      await expect(headers.nth(1)).toContainText('Price');
      await expect(headers.nth(2)).toContainText('HIVE');
      await expect(headers.nth(3)).toContainText('HBD($)');
    });

    test('should display data rows (max 10 per page)', async () => {
      const recentTrades = await apiHelper.getRecentTradesAPI(1000);
      const apiTradesCount = recentTrades.result.trades.length;

      if (apiTradesCount > 0) {
        const rowCount = await marketPage.getTradeHistoryRowCount();
        expect(rowCount).toBeGreaterThan(0);
        expect(rowCount).toBeLessThanOrEqual(10);
      }
    });

    test('should display first row with correct data format', async () => {
      const rowCount = await marketPage.getTradeHistoryRowCount();

      if (rowCount > 0) {
        const firstRow = marketPage.getTradeHistoryRow(0);
        await expect(firstRow).toBeVisible();

        // Date cell should have content
        const dateCell = firstRow.locator('[data-testid="trade-history-row-0-date"]');
        await expect(dateCell).not.toBeEmpty();

        // Price should have 6 decimal places
        const priceText = await marketPage.getTradeHistoryPrice(0).textContent();
        expect(priceText).toMatch(/^\d+\.\d{6}$/);
      }
    });

    test('should color-code prices (green for buy, red for sell)', async () => {
      const rowCount = await marketPage.getTradeHistoryRowCount();

      if (rowCount > 0) {
        const priceCell = marketPage.getTradeHistoryPrice(0);
        const tradeType = await priceCell.getAttribute('data-trade-type');

        // Should have trade type attribute
        expect(tradeType).toMatch(/^(buy|sell)$/);

        // Should have corresponding color class
        const className = await priceCell.getAttribute('class');
        if (tradeType === 'buy') {
          expect(className).toContain('text-green-500');
        } else {
          expect(className).toContain('text-destructive');
        }
      }
    });

    test('should display pagination buttons', async () => {
      await expect(marketPage.tradeHistoryPagination).toBeVisible();
      await expect(marketPage.tradeHistoryPaginationPrev).toBeVisible();
      await expect(marketPage.tradeHistoryPaginationNext).toBeVisible();
    });
  });
});

test.describe('Market Page - Internationalization', () => {
  let marketPage: MarketPage;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketPage(page);
    await marketPage.goto();
  });

  test('should display Polish translations when language is switched', async () => {
    await marketPage.switchToPolish();

    // Wait for translations to load
    await expect(marketPage.lastPriceBox).toContainText('Ostatnia cena');
    await expect(marketPage.volumeBox).toContainText('Wolumen 24h');
    await expect(marketPage.buyFormLabel).toContainText('Kup HIVE');
    await expect(marketPage.sellFormLabel).toContainText('Sprzedaj HIVE');
    await expect(marketPage.buyOrdersHeader).toContainText('Oferty zakupu');
    await expect(marketPage.sellOrdersHeader).toContainText('Oferty sprzedaży');
    await expect(marketPage.tradeHistoryHeader).toContainText('Historia transakcji');
  });
});

test.describe('Market Page - Dark Mode', () => {
  let marketPage: MarketPage;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketPage(page);
    await marketPage.goto();
  });

  test('should toggle dark mode successfully', async ({ page, browserName }) => {
    // Skip on Firefox due to known dark mode issues
    test.skip(browserName === 'firefox', 'Dark mode tests skipped on Firefox');

    await marketPage.toggleDarkMode();

    // Validate dark mode is applied
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Verify dark mode is active
    const isDarkMode = await marketPage.isDarkModeActive();
    expect(isDarkMode).toBe(true);
  });
});

test.describe('Market Page - Order Table Pagination', () => {
  let marketPage: MarketPage;
  let apiHelper: ApiHelper;

  // Skip pagination tests on WebKit due to click handling issues with overlapping elements
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination click tests are unreliable on WebKit');
    marketPage = new MarketPage(page);
    apiHelper = new ApiHelper(page);
    await marketPage.goto();
  });

  test('should navigate to next page of buy orders when clicking pagination', async () => {
    const orderBook = await apiHelper.getOrderBookAPI(500);
    const apiBidsCount = orderBook.result.bids.length;

    // Only test pagination if there are more than 10 orders
    if (apiBidsCount > 10) {
      // Get first row price before pagination
      const firstPriceBefore = await marketPage.getBuyOrderPrice(0).textContent();

      // Navigate to next page
      await marketPage.goToNextBuyOrdersPage();

      // Prev button should now be enabled
      await expect(marketPage.buyOrdersPaginationPrev).toBeEnabled();

      // First row price should be different
      const firstPriceAfter = await marketPage.getBuyOrderPrice(0).textContent();
      expect(firstPriceAfter).not.toBe(firstPriceBefore);
    }
  });

  test('should navigate to next page of sell orders when clicking pagination', async () => {
    const orderBook = await apiHelper.getOrderBookAPI(500);
    const apiAsksCount = orderBook.result.asks.length;

    // Only test pagination if there are more than 10 orders
    if (apiAsksCount > 10) {
      // Get first row price before pagination
      const firstPriceBefore = await marketPage.getSellOrderPrice(0).textContent();

      // Navigate to next page using "Lower" button (next button goes to higher page numbers)
      await marketPage.goToNextSellOrdersPage();

      // Prev button should now be enabled (we're no longer on page 0)
      await expect(marketPage.sellOrdersPaginationPrev).toBeEnabled();

      // First row price should be different
      const firstPriceAfter = await marketPage.getSellOrderPrice(0).textContent();
      expect(firstPriceAfter).not.toBe(firstPriceBefore);
    }
  });

  test('should navigate to next page of trade history when clicking pagination', async () => {
    const recentTrades = await apiHelper.getRecentTradesAPI(1000);
    const apiTradesCount = recentTrades.result.trades.length;

    // Only test pagination if there are more than 10 trades
    if (apiTradesCount > 10) {
      // Get first row date before pagination
      const firstRow = marketPage.getTradeHistoryRow(0);
      const dateCell = firstRow.locator('[data-testid="trade-history-row-0-date"]');
      const firstDateBefore = await dateCell.textContent();

      // Navigate to next page
      await marketPage.goToNextTradeHistoryPage();

      // Prev button should now be enabled
      await expect(marketPage.tradeHistoryPaginationPrev).toBeEnabled();

      // First row date should be different
      const firstDateAfter = await dateCell.textContent();
      expect(firstDateAfter).not.toBe(firstDateBefore);
    }
  });
});

test.describe('Market Page - Form Interaction', () => {
  let marketPage: MarketPage;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketPage(page);
    await marketPage.goto();
  });

  test('should enable buy button when amount is entered', async () => {
    // Initially disabled
    await expect(marketPage.buyFormSubmitButton).toBeDisabled();

    // Fill amount
    await marketPage.buyFormAmountInput.fill('100');

    // Button should be enabled
    await expect(marketPage.buyFormSubmitButton).toBeEnabled();
  });

  test('should enable sell button when amount is entered', async () => {
    // Initially disabled
    await expect(marketPage.sellFormSubmitButton).toBeDisabled();

    // Fill amount
    await marketPage.sellFormAmountInput.fill('100');

    // Button should be enabled
    await expect(marketPage.sellFormSubmitButton).toBeEnabled();
  });

  test('should calculate total automatically when price and amount are entered', async () => {
    const price = '0.3';
    const amount = '100';
    const expectedTotal = (parseFloat(price) * parseFloat(amount)).toFixed(3);

    await marketPage.fillBuyForm(price, amount);

    // Total should be calculated
    const totalValue = await marketPage.buyFormTotalInput.inputValue();
    expect(totalValue).toBe(expectedTotal);
  });

  test('should update price in buy form when clicking order row', async ({ browserName }) => {
    // Skip on WebKit due to element overlap issues with table rows
    test.skip(browserName === 'webkit', 'Click on table row is unreliable on WebKit due to element overlap');

    const rowCount = await marketPage.getBuyOrdersRowCount();

    if (rowCount > 0) {
      // Get the price from first row
      const orderPrice = await marketPage.getBuyOrderPrice(0).textContent();

      // Click the row
      await marketPage.getBuyOrderRow(0).click();

      // Price input should be updated
      const priceInputValue = await marketPage.buyFormPriceInput.inputValue();
      expect(priceInputValue).toBe(orderPrice);
    }
  });
});
