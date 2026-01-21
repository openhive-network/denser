import { Locator, Page, expect } from "@playwright/test";

export class MarketPage {
  readonly page: Page;

  // Header statistics boxes
  readonly lastPriceBox: Locator;
  readonly volumeBox: Locator;
  readonly bidBox: Locator;
  readonly askBox: Locator;
  readonly spreadBox: Locator;

  // Chart
  readonly chart: Locator;

  // Buy/Sell forms
  readonly buyHiveSection: Locator;
  readonly sellHiveSection: Locator;
  readonly buyHiveButton: Locator;
  readonly sellHiveButton: Locator;

  // Order tables
  readonly buyOrdersTable: Locator;
  readonly sellOrdersTable: Locator;
  readonly tradeHistoryTable: Locator;

  // Table headers
  readonly buyOrdersHeader: Locator;
  readonly sellOrdersHeader: Locator;
  readonly tradeHistoryHeader: Locator;

  // Table rows
  readonly buyOrdersRows: Locator;
  readonly sellOrdersRows: Locator;
  readonly tradeHistoryRows: Locator;

  // Pagination buttons
  readonly buyOrdersPaginationHigher: Locator;
  readonly buyOrdersPaginationLower: Locator;
  readonly sellOrdersPaginationHigher: Locator;
  readonly sellOrdersPaginationLower: Locator;
  readonly tradeHistoryPaginationOlder: Locator;
  readonly tradeHistoryPaginationNewer: Locator;

  // Form inputs
  readonly buyPriceInput: Locator;
  readonly buyAmountInput: Locator;
  readonly buyTotalInput: Locator;
  readonly sellPriceInput: Locator;
  readonly sellAmountInput: Locator;
  readonly sellTotalInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header statistics boxes - using text labels within the header flex container
    const statsContainer = page.locator('.flex.w-full.flex-wrap.justify-center.gap-1');
    this.lastPriceBox = statsContainer.locator('.bg-background-secondary').filter({ hasText: 'Last price' });
    this.volumeBox = statsContainer.locator('.bg-background-secondary').filter({ hasText: '24h volume' });
    this.bidBox = statsContainer.locator('.bg-background-secondary').filter({ hasText: /Bid/ });
    this.askBox = statsContainer.locator('.bg-background-secondary').filter({ hasText: /Ask/ });
    this.spreadBox = statsContainer.locator('.bg-background-secondary').filter({ hasText: 'Spread' });

    // Chart - using recharts class
    this.chart = page.locator('.recharts-wrapper');

    // Buy/Sell sections
    this.buyHiveSection = page.locator('div').filter({ hasText: /^Buy HIVE$/ }).first();
    this.sellHiveSection = page.locator('div').filter({ hasText: /^Sell HIVE$/ }).first();
    this.buyHiveButton = page.getByRole('button', { name: 'Buy HIVE' });
    this.sellHiveButton = page.getByRole('button', { name: 'Sell HIVE' });

    // Order tables - using section headers
    this.buyOrdersTable = page.locator('div').filter({ hasText: /^Buy Orders/ }).locator('table').first();
    this.sellOrdersTable = page.locator('div').filter({ hasText: /^Sell Orders/ }).locator('table').first();
    this.tradeHistoryTable = page.locator('div').filter({ hasText: /^Trade History/ }).locator('table').first();

    // Table headers
    this.buyOrdersHeader = page.getByText('Buy Orders');
    this.sellOrdersHeader = page.getByText('Sell Orders');
    this.tradeHistoryHeader = page.getByText('Trade History');

    // Table rows - first tbody inside each table container
    this.buyOrdersRows = page.locator('div').filter({ hasText: /^Buy Orders/ }).locator('table tbody tr');
    this.sellOrdersRows = page.locator('div').filter({ hasText: /^Sell Orders/ }).locator('table tbody tr');
    this.tradeHistoryRows = page.locator('div').filter({ hasText: /^Trade History/ }).locator('table tbody tr');

    // Pagination buttons - by position in table containers
    const buyOrdersContainer = page.locator('div.h-\\[342px\\]').filter({ hasText: /^Buy Orders/ });
    const sellOrdersContainer = page.locator('div.h-\\[342px\\]').filter({ hasText: /^Sell Orders/ });
    const tradeHistoryContainer = page.locator('div.h-\\[342px\\]').filter({ hasText: /^Trade History/ });

    this.buyOrdersPaginationHigher = buyOrdersContainer.getByRole('button', { name: 'Higher' });
    this.buyOrdersPaginationLower = buyOrdersContainer.getByRole('button', { name: 'Lower' });
    this.sellOrdersPaginationHigher = sellOrdersContainer.getByRole('button', { name: 'Higher' });
    this.sellOrdersPaginationLower = sellOrdersContainer.getByRole('button', { name: 'Lower' });
    this.tradeHistoryPaginationOlder = tradeHistoryContainer.getByRole('button', { name: 'Older' });
    this.tradeHistoryPaginationNewer = tradeHistoryContainer.getByRole('button', { name: 'Older' }).first();

    // Form inputs - within buy/sell sections
    const buyForm = page.locator('div').filter({ has: page.locator('div.text-green-600:has-text("Buy HIVE")') });
    const sellForm = page.locator('div').filter({ has: page.locator('div.text-destructive:has-text("Sell HIVE")') });

    this.buyPriceInput = buyForm.locator('input[type="number"]').first();
    this.buyAmountInput = buyForm.locator('input[type="number"]').nth(1);
    this.buyTotalInput = buyForm.locator('input[type="number"]').nth(2);
    this.sellPriceInput = sellForm.locator('input[type="number"]').first();
    this.sellAmountInput = sellForm.locator('input[type="number"]').nth(1);
    this.sellTotalInput = sellForm.locator('input[type="number"]').nth(2);
  }

  async goToMarketPage() {
    await this.page.goto("/market");
    await this.page.waitForLoadState("networkidle");
  }

  async waitForMarketDataLoaded() {
    // Wait for the statistics container to be visible (indicates data loaded)
    await this.lastPriceBox.waitFor({ state: 'visible', timeout: 30000 });
    // Wait for chart to be visible
    await this.chart.waitFor({ state: 'visible', timeout: 30000 });
    // Wait for order tables to be visible
    await this.buyOrdersHeader.waitFor({ state: 'visible', timeout: 30000 });
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const value = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    return value;
  }

  async getLastPriceValue(): Promise<string> {
    const text = await this.lastPriceBox.textContent();
    // Extract the price value (e.g., "Last price$0.298145(+2.36%)" -> "0.298145")
    const match = text?.match(/\$?([\d.]+)/);
    return match ? match[1] : '';
  }

  async getVolumeValue(): Promise<string> {
    const text = await this.volumeBox.textContent();
    const match = text?.match(/\$?([\d,.]+)/);
    return match ? match[1] : '';
  }

  async getBidValue(): Promise<string> {
    const text = await this.bidBox.textContent();
    const match = text?.match(/\$?([\d.]+)/);
    return match ? match[1] : '';
  }

  async getAskValue(): Promise<string> {
    const text = await this.askBox.textContent();
    const match = text?.match(/\$?([\d.]+)/);
    return match ? match[1] : '';
  }

  async getSpreadValue(): Promise<string> {
    const text = await this.spreadBox.textContent();
    const match = text?.match(/([\d.]+)%/);
    return match ? match[1] : '';
  }

  async getBuyOrdersCount(): Promise<number> {
    return await this.buyOrdersRows.count();
  }

  async getSellOrdersCount(): Promise<number> {
    return await this.sellOrdersRows.count();
  }

  async getTradeHistoryCount(): Promise<number> {
    return await this.tradeHistoryRows.count();
  }
}
