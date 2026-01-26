import { type Locator, type Page } from '@playwright/test';

export class SearchPage {
  readonly page: Page;

  // Search input and controls
  readonly modeSelectTrigger: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly secondInput: Locator; // For userTopic mode

  // Mode select items (by value attribute)
  readonly modeClassic: Locator;
  readonly modeAi: Locator;
  readonly modeAccount: Locator;
  readonly modeUserTopic: Locator;
  readonly modeTag: Locator;

  // Sort select (classic/userTopic only)
  readonly sortSelectTrigger: Locator;
  readonly sortRelevance: Locator;
  readonly sortCreated: Locator;

  // Search results - using standard data-testid
  readonly postListItems: Locator;
  readonly firstPostItem: Locator;
  readonly firstPostTitle: Locator;
  readonly firstPostAuthor: Locator;

  // Loading and empty states
  readonly loadingSpinner: Locator;
  readonly noResultsMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Mode select trigger - first button[role="combobox"]
    this.modeSelectTrigger = page.locator('button[role="combobox"]').first();

    // Search input - main text input
    this.searchInput = page.locator('input[type="text"]').first();
    this.secondInput = page.locator('input[placeholder="Topic..."]');

    // Search button
    this.searchButton = page.locator('button[aria-label="Search"]');

    // Mode options - using nth selector as order is fixed:
    // 0: classic, 1: ai, 2: account, 3: userTopic, 4: tag
    this.modeClassic = page.locator('[role="option"]').nth(0);
    this.modeAi = page.locator('[role="option"]').nth(1);
    this.modeAccount = page.locator('[role="option"]').nth(2);
    this.modeUserTopic = page.locator('[role="option"]').nth(3);
    this.modeTag = page.locator('[role="option"]').nth(4);

    // Sort select - second combobox (visible only for classic/userTopic)
    this.sortSelectTrigger = page.locator('button[role="combobox"]').nth(1);
    this.sortRelevance = page.locator('[role="option"]').filter({ hasText: 'Relevance' });
    this.sortCreated = page.locator('[role="option"]').filter({ hasText: /Newest|Created/i });

    // Search results - standard post-list-item
    this.postListItems = page.locator('[data-testid="post-list-item"]');
    this.firstPostItem = this.postListItems.first();
    this.firstPostTitle = page.locator('[data-testid="post-list-item"]').first().locator('h3 a');
    this.firstPostAuthor = page.locator('[data-testid="post-author"]').first();

    // States
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.noResultsMessage = page.getByText(/no results|nothing found|no data/i);
  }

  async goto() {
    await this.page.goto('/search');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoWithClassicQuery(query: string, sort: 'relevance' | 'created' = 'relevance') {
    await this.page.goto(`/search?q=${encodeURIComponent(query)}&s=${sort}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoWithAiQuery(query: string) {
    await this.page.goto(`/search?ai=${encodeURIComponent(query)}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async switchToMode(mode: 'classic' | 'ai' | 'account' | 'userTopic' | 'tag') {
    await this.modeSelectTrigger.click();
    // Wait for menu to appear
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });

    switch (mode) {
      case 'classic':
        await this.modeClassic.click();
        break;
      case 'ai':
        await this.modeAi.click();
        break;
      case 'account':
        await this.modeAccount.click();
        break;
      case 'userTopic':
        await this.modeUserTopic.click();
        break;
      case 'tag':
        await this.modeTag.click();
        break;
    }
    // Wait for menu to close
    await this.page.waitForTimeout(300);
  }

  async performSearch(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async performSearchWithEnter(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectSort(sort: 'relevance' | 'created') {
    await this.sortSelectTrigger.click();
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });

    if (sort === 'relevance') {
      await this.sortRelevance.click();
    } else {
      await this.sortCreated.click();
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForSearchResults(timeout: number = 15000) {
    // Wait for results to appear or no results message
    try {
      await Promise.race([
        this.firstPostItem.waitFor({ state: 'visible', timeout }),
        this.noResultsMessage.waitFor({ state: 'visible', timeout })
      ]);
    } catch {
      // Timeout - state will be checked in test
    }
  }

  async getResultsCount(): Promise<number> {
    await this.page.waitForTimeout(1000);
    return await this.postListItems.count();
  }

  async clickFirstResult() {
    await this.firstPostTitle.click();
    await this.page.waitForSelector('[data-testid="article-title"]', { timeout: 15000 });
  }

  async clickFirstResultAuthor() {
    await this.firstPostAuthor.click();
    await this.page.waitForSelector('[data-testid="profile-name"]', { timeout: 15000 });
  }

  async scrollToLoadMore() {
    await this.page.keyboard.press('End');
    await this.page.waitForTimeout(2000);
  }

  // Helpers
  async getElementCssPropertyValue(element: Locator, cssProperty: string): Promise<string> {
    return await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
  }

  async isInputEnabled(): Promise<boolean> {
    return await this.searchInput.isEnabled();
  }

  async getInputPlaceholder(): Promise<string | null> {
    return await this.searchInput.getAttribute('placeholder');
  }
}
