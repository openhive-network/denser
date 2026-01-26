import { Locator, Page, expect } from '@playwright/test';

/**
 * Page Object Model for the Market page.
 * Uses data-testid selectors for reliability and maintainability.
 */
export class MarketPage {
  readonly page: Page;

  // Main container
  readonly marketPage: Locator;
  readonly marketStatistics: Locator;

  // Statistics boxes
  readonly lastPriceBox: Locator;
  readonly lastPriceValue: Locator;
  readonly lastPriceDiff: Locator;
  readonly volumeBox: Locator;
  readonly volumeValue: Locator;
  readonly bidBox: Locator;
  readonly bidValue: Locator;
  readonly askBox: Locator;
  readonly askValue: Locator;
  readonly spreadBox: Locator;
  readonly spreadValue: Locator;

  // Chart
  readonly chart: Locator;

  // Buy form
  readonly buyFormSection: Locator;
  readonly buyFormLabel: Locator;
  readonly buyFormPriceInput: Locator;
  readonly buyFormAmountInput: Locator;
  readonly buyFormTotalInput: Locator;
  readonly buyFormSubmitButton: Locator;
  readonly buyFormAvailable: Locator;
  readonly buyFormLowestAsk: Locator;

  // Sell form
  readonly sellFormSection: Locator;
  readonly sellFormLabel: Locator;
  readonly sellFormPriceInput: Locator;
  readonly sellFormAmountInput: Locator;
  readonly sellFormTotalInput: Locator;
  readonly sellFormSubmitButton: Locator;
  readonly sellFormAvailable: Locator;
  readonly sellFormHighestBid: Locator;

  // Buy Orders table
  readonly buyOrdersSection: Locator;
  readonly buyOrdersHeader: Locator;
  readonly buyOrdersTable: Locator;
  readonly buyOrdersTbody: Locator;
  readonly buyOrdersPagination: Locator;
  readonly buyOrdersPaginationPrev: Locator;
  readonly buyOrdersPaginationNext: Locator;

  // Sell Orders table
  readonly sellOrdersSection: Locator;
  readonly sellOrdersHeader: Locator;
  readonly sellOrdersTable: Locator;
  readonly sellOrdersTbody: Locator;
  readonly sellOrdersPagination: Locator;
  readonly sellOrdersPaginationPrev: Locator;
  readonly sellOrdersPaginationNext: Locator;

  // Trade History table
  readonly tradeHistorySection: Locator;
  readonly tradeHistoryHeader: Locator;
  readonly tradeHistoryTable: Locator;
  readonly tradeHistoryTbody: Locator;
  readonly tradeHistoryPagination: Locator;
  readonly tradeHistoryPaginationPrev: Locator;
  readonly tradeHistoryPaginationNext: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main containers
    this.marketPage = page.getByTestId('market-page');
    this.marketStatistics = page.getByTestId('market-statistics');

    // Statistics boxes - using data-testid
    this.lastPriceBox = page.getByTestId('market-last-price');
    this.lastPriceValue = page.getByTestId('market-last-price-value');
    this.lastPriceDiff = page.getByTestId('market-last-price-diff');
    this.volumeBox = page.getByTestId('market-volume');
    this.volumeValue = page.getByTestId('market-volume-value');
    this.bidBox = page.getByTestId('market-bid');
    this.bidValue = page.getByTestId('market-bid-value');
    this.askBox = page.getByTestId('market-ask');
    this.askValue = page.getByTestId('market-ask-value');
    this.spreadBox = page.getByTestId('market-spread');
    this.spreadValue = page.getByTestId('market-spread-value');

    // Chart
    this.chart = page.getByTestId('market-chart');

    // Buy form
    this.buyFormSection = page.getByTestId('buy-form-section');
    this.buyFormLabel = page.getByTestId('buy-form-label');
    this.buyFormPriceInput = page.getByTestId('buy-form-price-input');
    this.buyFormAmountInput = page.getByTestId('buy-form-amount-input');
    this.buyFormTotalInput = page.getByTestId('buy-form-total-input');
    this.buyFormSubmitButton = page.getByTestId('buy-form-submit-button');
    this.buyFormAvailable = page.getByTestId('buy-form-available');
    this.buyFormLowestAsk = page.getByTestId('buy-form-default-price');

    // Sell form
    this.sellFormSection = page.getByTestId('sell-form-section');
    this.sellFormLabel = page.getByTestId('sell-form-label');
    this.sellFormPriceInput = page.getByTestId('sell-form-price-input');
    this.sellFormAmountInput = page.getByTestId('sell-form-amount-input');
    this.sellFormTotalInput = page.getByTestId('sell-form-total-input');
    this.sellFormSubmitButton = page.getByTestId('sell-form-submit-button');
    this.sellFormAvailable = page.getByTestId('sell-form-available');
    this.sellFormHighestBid = page.getByTestId('sell-form-default-price');

    // Buy Orders table
    this.buyOrdersSection = page.getByTestId('buy-orders-section');
    this.buyOrdersHeader = page.getByTestId('buy-orders-header');
    this.buyOrdersTable = page.getByTestId('buy-orders-table');
    this.buyOrdersTbody = page.getByTestId('buy-orders-tbody');
    this.buyOrdersPagination = page.getByTestId('buy-orders-pagination');
    this.buyOrdersPaginationPrev = page.getByTestId('buy-orders-pagination-prev');
    this.buyOrdersPaginationNext = page.getByTestId('buy-orders-pagination-next');

    // Sell Orders table
    this.sellOrdersSection = page.getByTestId('sell-orders-section');
    this.sellOrdersHeader = page.getByTestId('sell-orders-header');
    this.sellOrdersTable = page.getByTestId('sell-orders-table');
    this.sellOrdersTbody = page.getByTestId('sell-orders-tbody');
    this.sellOrdersPagination = page.getByTestId('sell-orders-pagination');
    this.sellOrdersPaginationPrev = page.getByTestId('sell-orders-pagination-prev');
    this.sellOrdersPaginationNext = page.getByTestId('sell-orders-pagination-next');

    // Trade History table
    this.tradeHistorySection = page.getByTestId('trade-history-section');
    this.tradeHistoryHeader = page.getByTestId('trade-history-header');
    this.tradeHistoryTable = page.getByTestId('trade-history-table');
    this.tradeHistoryTbody = page.getByTestId('trade-history-tbody');
    this.tradeHistoryPagination = page.getByTestId('trade-history-pagination');
    this.tradeHistoryPaginationPrev = page.getByTestId('trade-history-pagination-prev');
    this.tradeHistoryPaginationNext = page.getByTestId('trade-history-pagination-next');
  }

  /**
   * Navigate to the market page and wait for it to load.
   */
  async goto(): Promise<void> {
    await this.page.goto('/market');
    await this.waitForPageLoaded();
  }

  /**
   * Wait for the market page to be fully loaded with data.
   */
  async waitForPageLoaded(): Promise<void> {
    await expect(this.marketPage).toBeVisible({ timeout: 30000 });
    await expect(this.lastPriceBox).toBeVisible({ timeout: 30000 });
    await expect(this.chart).toBeVisible({ timeout: 30000 });
    await expect(this.buyOrdersSection).toBeVisible({ timeout: 30000 });
  }

  /**
   * Get the last price value from the statistics box.
   * @returns The price value (e.g., "0.298145")
   */
  async getLastPriceValue(): Promise<string> {
    const text = await this.lastPriceValue.textContent();
    // Remove $ prefix if present
    return text?.replace('$', '').trim() ?? '';
  }

  /**
   * Get the volume value from the statistics box.
   * @returns The volume value
   */
  async getVolumeValue(): Promise<string> {
    const text = await this.volumeValue.textContent();
    return text?.replace('$', '').trim() ?? '';
  }

  /**
   * Get the bid price value from the statistics box.
   * @returns The bid price value
   */
  async getBidValue(): Promise<string> {
    const text = await this.bidValue.textContent();
    return text?.replace('$', '').trim() ?? '';
  }

  /**
   * Get the ask price value from the statistics box.
   * @returns The ask price value
   */
  async getAskValue(): Promise<string> {
    const text = await this.askValue.textContent();
    return text?.replace('$', '').trim() ?? '';
  }

  /**
   * Get the spread value from the statistics box.
   * @returns The spread percentage value (e.g., "0.123")
   */
  async getSpreadValue(): Promise<string> {
    const text = await this.spreadValue.textContent();
    return text?.replace('%', '').trim() ?? '';
  }

  /**
   * Get the number of visible rows in buy orders table.
   * @returns Number of rows
   */
  async getBuyOrdersRowCount(): Promise<number> {
    return this.buyOrdersTbody.locator('tr').count();
  }

  /**
   * Get the number of visible rows in sell orders table.
   * @returns Number of rows
   */
  async getSellOrdersRowCount(): Promise<number> {
    return this.sellOrdersTbody.locator('tr').count();
  }

  /**
   * Get the number of visible rows in trade history table.
   * @returns Number of rows
   */
  async getTradeHistoryRowCount(): Promise<number> {
    return this.tradeHistoryTbody.locator('tr').count();
  }

  /**
   * Get a specific buy order row by index.
   * @param index Row index (0-based)
   */
  getBuyOrderRow(index: number): Locator {
    return this.page.getByTestId(`buy-orders-row-${index}`);
  }

  /**
   * Get a specific sell order row by index.
   * @param index Row index (0-based)
   */
  getSellOrderRow(index: number): Locator {
    return this.page.getByTestId(`sell-orders-row-${index}`);
  }

  /**
   * Get a specific trade history row by index.
   * @param index Row index (0-based)
   */
  getTradeHistoryRow(index: number): Locator {
    return this.page.getByTestId(`trade-history-row-${index}`);
  }

  /**
   * Get the price cell of a buy order row.
   * @param rowIndex Row index (0-based)
   */
  getBuyOrderPrice(rowIndex: number): Locator {
    return this.page.getByTestId(`buy-orders-row-${rowIndex}-price`);
  }

  /**
   * Get the price cell of a sell order row.
   * @param rowIndex Row index (0-based)
   */
  getSellOrderPrice(rowIndex: number): Locator {
    return this.page.getByTestId(`sell-orders-row-${rowIndex}-price`);
  }

  /**
   * Get the price cell of a trade history row.
   * @param rowIndex Row index (0-based)
   */
  getTradeHistoryPrice(rowIndex: number): Locator {
    return this.page.getByTestId(`trade-history-row-${rowIndex}-price`);
  }

  /**
   * Navigate to next page of buy orders.
   * Uses force:true due to potential overlap with adjacent tables in WebKit.
   */
  async goToNextBuyOrdersPage(): Promise<void> {
    await this.buyOrdersPaginationNext.click({ force: true });
  }

  /**
   * Navigate to previous page of buy orders.
   * Uses force:true due to potential overlap with adjacent tables in WebKit.
   */
  async goToPrevBuyOrdersPage(): Promise<void> {
    await this.buyOrdersPaginationPrev.click({ force: true });
  }

  /**
   * Navigate to next page of sell orders.
   * Uses force:true due to potential overlap with adjacent tables in WebKit.
   */
  async goToNextSellOrdersPage(): Promise<void> {
    await this.sellOrdersPaginationNext.click({ force: true });
  }

  /**
   * Navigate to previous page of sell orders.
   * Uses force:true due to potential overlap with adjacent tables in WebKit.
   */
  async goToPrevSellOrdersPage(): Promise<void> {
    await this.sellOrdersPaginationPrev.click({ force: true });
  }

  /**
   * Navigate to next page of trade history.
   * Uses force:true due to potential overlap with adjacent tables in WebKit.
   */
  async goToNextTradeHistoryPage(): Promise<void> {
    await this.tradeHistoryPaginationNext.click({ force: true });
  }

  /**
   * Navigate to previous page of trade history.
   * Uses force:true due to potential overlap with adjacent tables in WebKit.
   */
  async goToPrevTradeHistoryPage(): Promise<void> {
    await this.tradeHistoryPaginationPrev.click({ force: true });
  }

  /**
   * Fill the buy form with specified values.
   */
  async fillBuyForm(price: string, amount: string): Promise<void> {
    await this.buyFormPriceInput.fill(price);
    await this.buyFormAmountInput.fill(amount);
  }

  /**
   * Fill the sell form with specified values.
   */
  async fillSellForm(price: string, amount: string): Promise<void> {
    await this.sellFormPriceInput.fill(price);
    await this.sellFormAmountInput.fill(amount);
  }

  /**
   * Get computed CSS property value for an element.
   * @param element The locator element
   * @param property CSS property name
   */
  async getCssProperty(element: Locator, property: string): Promise<string> {
    return element.evaluate((el, prop) => {
      return window.getComputedStyle(el).getPropertyValue(prop);
    }, property);
  }

  /**
   * Switch language to Polish.
   */
  async switchToPolish(): Promise<void> {
    const languageToggle = this.page.getByTestId('toggle-language');
    await languageToggle.click();
    const polishOption = this.page.getByTestId('pl');
    await polishOption.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Toggle dark mode.
   */
  async toggleDarkMode(): Promise<void> {
    const themeToggle = this.page.getByTestId('theme-mode');
    await themeToggle.click();
    // Select dark mode from dropdown
    const darkOption = this.page.getByTestId('theme-mode-item').filter({ hasText: 'Dark' });
    await darkOption.click();
  }

  /**
   * Check if dark mode is active.
   */
  async isDarkModeActive(): Promise<boolean> {
    const htmlClass = await this.page.locator('html').getAttribute('class');
    return htmlClass?.includes('dark') ?? false;
  }
}
