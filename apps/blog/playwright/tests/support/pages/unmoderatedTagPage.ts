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
