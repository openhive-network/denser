import { expect, test } from '@playwright/test';
import { MarketPage } from '../support/pages/marketPage';
import { ApiHelper } from '../support/apiHelper';
import { HomePage } from '../../../../blog/playwright/tests/support/pages/homePage';

test.describe('Market page tests', () => {
  let marketPage: MarketPage;
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketPage(page);
    apiHelper = new ApiHelper(page);
  });

  test('validate that market page is loaded', async ({ page }) => {
    await marketPage.goToMarketPage();
    await expect(page).toHaveURL(/\/market/);
    await expect(page).toHaveTitle('Hive Wallet - Market');
  });

  test('validate market statistics boxes are visible', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    await expect(marketPage.lastPriceBox).toBeVisible();
    await expect(marketPage.volumeBox).toBeVisible();
    await expect(marketPage.bidBox).toBeVisible();
    await expect(marketPage.askBox).toBeVisible();
    await expect(marketPage.spreadBox).toBeVisible();
  });

  test('validate last price box contains valid data', async () => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const tickerData = await apiHelper.getMarketTickerAPI();
    const apiLatestPrice = parseFloat(tickerData.result.latest).toFixed(6);

    const uiLastPrice = await marketPage.getLastPriceValue();
    expect(uiLastPrice).toBeTruthy();
    // UI shows 6 decimal places for price
    expect(uiLastPrice).toMatch(/^\d+\.\d{6}$/);
    // Validate UI matches API (allowing for small timing differences)
    expect(uiLastPrice).toBe(apiLatestPrice);
  });

  test('validate bid price box contains valid data', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const tickerData = await apiHelper.getMarketTickerAPI();
    const apiBidPrice = parseFloat(tickerData.result.highest_bid).toFixed(6);

    const uiBidPrice = await marketPage.getBidValue();
    expect(uiBidPrice).toBeTruthy();
    expect(uiBidPrice).toBe(apiBidPrice);
  });

  test('validate ask price box contains valid data', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const tickerData = await apiHelper.getMarketTickerAPI();
    const apiAskPrice = parseFloat(tickerData.result.lowest_ask).toFixed(6);

    const uiAskPrice = await marketPage.getAskValue();
    expect(uiAskPrice).toBeTruthy();
    expect(uiAskPrice).toBe(apiAskPrice);
  });

  test('validate spread is calculated correctly', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const tickerData = await apiHelper.getMarketTickerAPI();
    const highestBid = parseFloat(tickerData.result.highest_bid);
    const lowestAsk = parseFloat(tickerData.result.lowest_ask);

    // Spread formula: 200 * (lowest_ask - highest_bid) / (highest_bid + lowest_ask)
    const expectedSpread = (200 * (lowestAsk - highestBid) / (highestBid + lowestAsk)).toFixed(3);

    const uiSpread = await marketPage.getSpreadValue();
    expect(uiSpread).toBeTruthy();
    expect(uiSpread).toBe(expectedSpread);
  });

  test('validate 24h volume box contains valid data', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const uiVolume = await marketPage.getVolumeValue();
    expect(uiVolume).toBeTruthy();
    // Volume should be a number (possibly with commas for thousands)
    expect(uiVolume).toMatch(/^[\d,.]+$/);
  });

  test('validate chart is displayed', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    await expect(marketPage.chart).toBeVisible();
    // Chart should have area elements for bids and asks
    const chartAreas = page.locator('.recharts-area');
    await expect(chartAreas).toHaveCount(2);
  });

  test('validate buy/sell forms are visible', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    // Buy HIVE section
    await expect(page.getByText('Buy HIVE').first()).toBeVisible();
    await expect(marketPage.buyHiveButton).toBeVisible();
    await expect(marketPage.buyHiveButton).toBeDisabled(); // Disabled when no amount entered

    // Sell HIVE section
    await expect(page.getByText('Sell HIVE').first()).toBeVisible();
    await expect(marketPage.sellHiveButton).toBeVisible();
    await expect(marketPage.sellHiveButton).toBeDisabled(); // Disabled when no amount entered
  });

  test('validate buy form has correct styling (green)', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const buyLabel = page.locator('div.text-green-600').filter({ hasText: 'Buy HIVE' });
    await expect(buyLabel).toBeVisible();
  });

  test('validate sell form has correct styling (red)', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const sellLabel = page.locator('div.text-destructive').filter({ hasText: 'Sell HIVE' });
    await expect(sellLabel).toBeVisible();
  });

  test('validate form labels are displayed', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    // Check Price, Amount, Total labels appear in the buy/sell form sections
    // Use more specific selectors to avoid matching table headers
    const formSection = page.locator('.flex.flex-col.gap-8');

    // Buy form should have Price, Amount, Total labels
    await expect(formSection.filter({ hasText: 'Buy HIVE' }).getByText('Price').first()).toBeVisible();
    await expect(formSection.filter({ hasText: 'Buy HIVE' }).getByText('Amount').first()).toBeVisible();
    await expect(formSection.filter({ hasText: 'Buy HIVE' }).getByText('Total').first()).toBeVisible();

    // Sell form should have Price, Amount, Total labels
    await expect(formSection.filter({ hasText: 'Sell HIVE' }).getByText('Price').first()).toBeVisible();
    await expect(formSection.filter({ hasText: 'Sell HIVE' }).getByText('Amount').first()).toBeVisible();
    await expect(formSection.filter({ hasText: 'Sell HIVE' }).getByText('Total').first()).toBeVisible();
  });

  test('validate buy orders table is visible with headers', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    await expect(marketPage.buyOrdersHeader).toBeVisible();

    // Check table headers: Total HBD($), HBD($), HIVE, Price
    // Use first() to get just the Buy Orders table (not other tables)
    const buyOrdersTable = page.locator('table').filter({ has: page.locator('th:has-text("Total HBD($)")') }).first();
    await expect(buyOrdersTable.locator('th').filter({ hasText: 'Total HBD($)' })).toBeVisible();
    await expect(buyOrdersTable.locator('th').filter({ hasText: /^HBD\(\$\)$/ })).toBeVisible();
    await expect(buyOrdersTable.locator('th').filter({ hasText: /^HIVE$/ })).toBeVisible();
    await expect(buyOrdersTable.locator('th').filter({ hasText: /^Price$/ })).toBeVisible();
  });

  test('validate sell orders table is visible with headers', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    await expect(marketPage.sellOrdersHeader).toBeVisible();

    // Check table headers: Price, HIVE, HBD($), Total HBD($)
    const sellOrdersSection = page.locator('div').filter({ hasText: /^Sell Orders/ });
    await expect(sellOrdersSection.locator('th').filter({ hasText: /^Price$/ })).toBeVisible();
    await expect(sellOrdersSection.locator('th').filter({ hasText: /^HIVE$/ })).toBeVisible();
    await expect(sellOrdersSection.locator('th').filter({ hasText: /^HBD\(\$\)$/ })).toBeVisible();
    await expect(sellOrdersSection.locator('th').filter({ hasText: 'Total HBD($)' })).toBeVisible();
  });

  test('validate trade history table is visible with headers', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    await expect(marketPage.tradeHistoryHeader).toBeVisible();

    // Check table headers: Date, Price, HIVE, HBD($)
    const tradeHistorySection = page.locator('div').filter({ hasText: /^Trade History/ });
    await expect(tradeHistorySection.locator('th').filter({ hasText: /^Date$/ })).toBeVisible();
    await expect(tradeHistorySection.locator('th').filter({ hasText: /^Price$/ })).toBeVisible();
    await expect(tradeHistorySection.locator('th').filter({ hasText: /^HIVE$/ })).toBeVisible();
    await expect(tradeHistorySection.locator('th').filter({ hasText: /^HBD\(\$\)$/ })).toBeVisible();
  });

  test('validate buy orders table has data rows', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const orderBook = await apiHelper.getOrderBookAPI(500);
    const apiBidsCount = orderBook.result.bids.length;

    // Get buy orders from the Buy Orders section only
    const buyOrdersSection = page.locator('div.h-\\[342px\\]').filter({ hasText: /Buy Orders/ }).first();
    const buyOrdersRows = buyOrdersSection.locator('table tbody tr');
    const uiBuyOrdersCount = await buyOrdersRows.count();

    // UI shows max 10 rows per page
    if (apiBidsCount > 0) {
      expect(uiBuyOrdersCount).toBeGreaterThan(0);
      expect(uiBuyOrdersCount).toBeLessThanOrEqual(10);
    }
  });

  test('validate sell orders table has data rows', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const orderBook = await apiHelper.getOrderBookAPI(500);
    const apiAsksCount = orderBook.result.asks.length;

    // Get sell orders from the Sell Orders section only
    const sellOrdersSection = page.locator('div.h-\\[342px\\]').filter({ hasText: /Sell Orders/ }).first();
    const sellOrdersRows = sellOrdersSection.locator('table tbody tr');
    const uiSellOrdersCount = await sellOrdersRows.count();

    // UI shows max 10 rows per page
    if (apiAsksCount > 0) {
      expect(uiSellOrdersCount).toBeGreaterThan(0);
      expect(uiSellOrdersCount).toBeLessThanOrEqual(10);
    }
  });

  test('validate trade history table has data rows', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const recentTrades = await apiHelper.getRecentTradesAPI(1000);
    const apiTradesCount = recentTrades.result.trades.length;

    // Get trade history from the Trade History section only
    const tradeHistorySection = page.locator('div.h-\\[342px\\]').filter({ hasText: /Trade History/ }).first();
    const tradeHistoryRows = tradeHistorySection.locator('table tbody tr');
    const uiTradeHistoryCount = await tradeHistoryRows.count();

    // UI shows max 10 rows per page
    if (apiTradesCount > 0) {
      expect(uiTradeHistoryCount).toBeGreaterThan(0);
      expect(uiTradeHistoryCount).toBeLessThanOrEqual(10);
    }
  });

  test('validate buy orders pagination buttons are visible', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const buyOrdersSection = page.locator('div.h-\\[342px\\]').filter({ hasText: /^Buy Orders/ });
    const higherButton = buyOrdersSection.getByRole('button', { name: 'Higher' });
    const lowerButton = buyOrdersSection.getByRole('button', { name: 'Lower' });

    await expect(higherButton).toBeVisible();
    await expect(lowerButton).toBeVisible();

    // Higher (prev) should be disabled on first page
    await expect(higherButton).toBeDisabled();
  });

  test('validate sell orders pagination buttons are visible', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const sellOrdersSection = page.locator('div.h-\\[342px\\]').filter({ hasText: /^Sell Orders/ });
    const higherButton = sellOrdersSection.getByRole('button', { name: 'Higher' });
    const lowerButton = sellOrdersSection.getByRole('button', { name: 'Lower' });

    await expect(higherButton).toBeVisible();
    await expect(lowerButton).toBeVisible();

    // Higher (prev for sell) should be disabled on first page
    await expect(lowerButton).toBeDisabled();
  });

  test('validate trade history pagination buttons are visible', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const tradeHistorySection = page.locator('div.h-\\[342px\\]').filter({ hasText: /^Trade History/ });
    const olderButtons = tradeHistorySection.getByRole('button', { name: 'Older' });

    // Both buttons show "Older" label based on the component
    await expect(olderButtons.first()).toBeVisible();
    await expect(olderButtons.last()).toBeVisible();
  });

  test('validate buy order first row data format', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const buyOrdersSection = page.locator('div.h-\\[342px\\]').filter({ hasText: /Buy Orders/ }).first();
    const buyOrdersRows = buyOrdersSection.locator('table tbody tr');
    const buyOrdersCount = await buyOrdersRows.count();

    if (buyOrdersCount > 0) {
      const firstRow = buyOrdersRows.first();
      const cells = firstRow.locator('td');

      // Should have 4 cells: Total, HBD, HIVE, Price
      await expect(cells).toHaveCount(4);

      // Total (first cell) should be a number with 3 decimal places
      const totalText = await cells.nth(0).textContent();
      expect(totalText).toMatch(/^\d+\.\d{3}$/);

      // Price (last cell) should be a number with 6 decimal places
      const priceText = await cells.nth(3).textContent();
      expect(priceText).toMatch(/^\d+\.\d{6}$/);
    }
  });

  test('validate sell order first row data format', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const sellOrdersSection = page.locator('div.h-\\[342px\\]').filter({ hasText: /Sell Orders/ }).first();
    const sellOrdersRows = sellOrdersSection.locator('table tbody tr');
    const sellOrdersCount = await sellOrdersRows.count();

    if (sellOrdersCount > 0) {
      const firstRow = sellOrdersRows.first();
      const cells = firstRow.locator('td');

      // Should have 4 cells: Price, HIVE, HBD, Total
      await expect(cells).toHaveCount(4);

      // Price (first cell) should be a number with 6 decimal places
      const priceText = await cells.nth(0).textContent();
      expect(priceText).toMatch(/^\d+\.\d{6}$/);

      // Total (last cell) should be a number with 3 decimal places
      const totalText = await cells.nth(3).textContent();
      expect(totalText).toMatch(/^\d+\.\d{3}$/);
    }
  });

  test('validate trade history first row data format', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const tradeHistorySection = page.locator('div.h-\\[342px\\]').filter({ hasText: /Trade History/ }).first();
    const tradeHistoryRows = tradeHistorySection.locator('table tbody tr');
    const tradeHistoryCount = await tradeHistoryRows.count();

    if (tradeHistoryCount > 0) {
      const firstRow = tradeHistoryRows.first();
      const cells = firstRow.locator('td');

      // Should have 4 cells: Date, Price, HIVE, HBD
      await expect(cells).toHaveCount(4);

      // Date (first cell) should contain relative time text
      const dateText = await cells.nth(0).textContent();
      expect(dateText).toBeTruthy();

      // Price (second cell) should be a number with 6 decimal places
      const priceText = await cells.nth(1).textContent();
      expect(priceText).toMatch(/^\d+\.\d{6}$/);
    }
  });

  test('validate trade history price color (green for buy, red for sell)', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    const tradeHistorySection = page.locator('div.h-\\[342px\\]').filter({ hasText: /Trade History/ }).first();
    const tradeHistoryRows = tradeHistorySection.locator('table tbody tr');
    const tradeHistoryCount = await tradeHistoryRows.count();

    if (tradeHistoryCount > 0) {
      const firstRow = tradeHistoryRows.first();
      const priceCell = firstRow.locator('td').nth(1);

      // Price cell should have either text-destructive (red) or text-green-500 class
      const className = await priceCell.getAttribute('class');
      expect(className).toMatch(/text-(destructive|green-500)/);
    }
  });

  test('validate lowest ask and highest bid are displayed in forms', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    // Buy form should show "Lowest ask"
    await expect(page.getByText('Lowest ask:').first()).toBeVisible();

    // Sell form should show "Highest bid"
    await expect(page.getByText('Highest bid:').first()).toBeVisible();
  });

  test('validate available balance text in forms (for anonymous user)', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    // Both forms should show "Available:" text
    const availableTexts = page.getByText('Available:');
    await expect(availableTexts).toHaveCount(2);
  });
});

test.describe('Market page - internationalization tests', () => {
  let marketPage: MarketPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketPage(page);
    homePage = new HomePage(page);
  });

  test('Market page - translation polish', async ({ page }) => {
    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    // Switch to Polish
    await homePage.toggleLanguage.click();
    await expect(homePage.languageMenu.first()).toBeVisible();
    await homePage.languageMenuPl.click();

    // Wait for page to reload with new language
    await page.waitForLoadState('networkidle');

    // Validate Polish translations for market page elements
    await expect(page.getByText('Ostatnia cena')).toBeVisible();
    await expect(page.getByText('Wolumen 24h')).toBeVisible();
    await expect(page.getByText('Kup HIVE').first()).toBeVisible();
    await expect(page.getByText('Sprzedaj HIVE').first()).toBeVisible();
    await expect(page.getByText('Oferty zakupu')).toBeVisible();
    await expect(page.getByText('Oferty sprzedaży').first()).toBeVisible();
    await expect(page.getByText('Historia transakcji')).toBeVisible();
  });
});

test.describe('Market page - dark mode tests', () => {
  let marketPage: MarketPage;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketPage(page);
  });

  test('validate market page in dark mode', async ({ page, browserName }) => {
    // Skip on Firefox due to known dark mode issues
    test.skip(browserName === 'firefox', 'Dark mode tests skipped on Firefox');

    await marketPage.goToMarketPage();
    await marketPage.waitForMarketDataLoaded();

    // Toggle dark mode
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500); // Wait for theme transition

      // Validate dark mode is applied
      const html = page.locator('html');
      await expect(html).toHaveClass(/dark/);
    }
  });
});
