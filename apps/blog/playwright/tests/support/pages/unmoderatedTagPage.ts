import { Locator, Page, expect } from '@playwright/test';
import { HomePage } from './homePage';

export class UnmoderatedTagPage {
  readonly page: Page;
  readonly homePage: HomePage;
  readonly unmoderatedTag: Locator;
  readonly unmoderatedTagHeader: Locator;
  readonly firstPostAuthor: Locator;
  readonly firstPostTitle: Locator;
  readonly firstPostSummary: Locator;
  readonly firstPostCardFooter: Locator;
  readonly firstPostCardFooterDeclinePayout: Locator;
  readonly secondPostAuthor: Locator;
  readonly secondPostTitle: Locator;
  readonly secondPostSummary: Locator;
  readonly firstPostCardPoweredUp100Trigger: Locator;
  readonly firstPostCardPoweredUp100TriggerLink: Locator;
  readonly postCardPoweredUp100Tooltip: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homePage = new HomePage(page);

    this.unmoderatedTag = page.getByTestId('community-name');
    this.unmoderatedTagHeader = page.getByTestId('community-name-unmoderated');
    this.firstPostAuthor = page
      .locator('[data-testid="post-list-item"]')
      .first()
      .locator('[data-testid="post-author"]');
    this.firstPostTitle = page
      .locator('[data-testid="post-list-item"]')
      .first()
      .locator('[data-testid="post-title"]');
    this.firstPostSummary = page
      .locator('[data-testid="post-list-item"]')
      .first()
      .locator('[data-testid="post-description"]');
    this.firstPostCardFooter = page
      .locator('[data-testid="post-list-item"]')
      .first()
      .locator('[data-testid="post-card-footer"]');
    this.firstPostCardFooterDeclinePayout = page
      .locator('[data-testid="post-list-item"]')
      .first()
      .locator('[data-testid="post-card-footer"]')
      .locator('[data-testid="post-payout-decline"]');
    this.secondPostAuthor = page
      .locator('[data-testid="post-list-item"]')
      .nth(1)
      .locator('[data-testid="post-author"]');
    this.secondPostTitle = page
      .locator('[data-testid="post-list-item"]')
      .nth(1)
      .locator('[data-testid="post-title"]');
    this.secondPostSummary = page
      .locator('[data-testid="post-list-item"]')
      .nth(1)
      .locator('[data-testid="post-description"]');
    this.firstPostCardPoweredUp100Trigger = page
      .locator('[data-testid="post-list-item"]')
      .first()
      .locator('[data-testid="powered-up-100-trigger"]');
    this.firstPostCardPoweredUp100TriggerLink = this.firstPostCardPoweredUp100Trigger.locator('a');
    this.postCardPoweredUp100Tooltip = page.locator('[data-testid="powered-up-100-tooltip"]');
  }

  async validateUnmoderatedTagPageIsLoaded(postTag: string) {
    //
    await this.page.waitForTimeout(5000);
    await this.page.waitForLoadState('domcontentloaded');
    // Validate that user has been moved to the unmoderated tag page
    expect(await this.unmoderatedTagHeader.textContent()).toBe('Unmoderated tag');
    expect(await this.unmoderatedTag.textContent()).toBe(`#${postTag}`);
  }

  async validateFirstPostInTheUnmoderatedTagList(author: string, postTitle: string, postSummary: string) {
    // Validate the first post on the unmoderated post list
    // Validate post's author name
    expect(await this.firstPostAuthor.textContent()).toBe(author);
    // Validate the first post's title
    expect(await this.firstPostTitle.textContent()).toBe(postTitle);
    // Validate the first post's summary description
    expect(await this.firstPostSummary.textContent()).toBe(postSummary);
  }
}
