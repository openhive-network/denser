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

    // Mode options - using data-testid for robust selection
    this.modeClassic = page.getByTestId('search-mode-classic');
    this.modeAi = page.getByTestId('search-mode-ai');
    this.modeAccount = page.getByTestId('search-mode-account');
    this.modeUserTopic = page.getByTestId('search-mode-user-topic');
    this.modeTag = page.getByTestId('search-mode-tag');

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
    // Wait for menu to close by checking options are no longer visible
    await this.page.locator('[role="option"]').first().waitFor({ state: 'hidden', timeout: 5000 });
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

  async waitForSearchResults(timeout: number = 15000): Promise<'results' | 'empty' | 'timeout'> {
    // Wait for results to appear or no results message
    try {
      await Promise.race([
        this.firstPostItem.waitFor({ state: 'visible', timeout }),
        this.noResultsMessage.waitFor({ state: 'visible', timeout })
      ]);
      // Determine which state we're in
      if (await this.firstPostItem.isVisible()) {
        return 'results';
      }
      return 'empty';
    } catch {
      // Timeout reached - return explicit state for test to handle
      return 'timeout';
    }
  }

  async getResultsCount(): Promise<number> {
    // Wait for either results or empty state to stabilize
    await this.page.waitForLoadState('networkidle');
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
    const initialCount = await this.postListItems.count();
    await this.page.keyboard.press('End');
    // Wait for new items to load or network to settle
    try {
      await this.page.waitForFunction(
        (initial) => document.querySelectorAll('[data-testid="post-list-item"]').length > initial,
        initialCount,
        { timeout: 10000 }
      );
    } catch {
      // No new items loaded - that's acceptable, test will verify count
      await this.page.waitForLoadState('networkidle');
    }
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
