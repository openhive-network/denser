import { Locator, Page, expect } from '@playwright/test';

export class FaqPage {
  readonly page: Page;
  readonly subTopicsOfContent: Locator;
  readonly subTopicsOfContentDescription: Locator;
  readonly whatIsHiveBlogLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.subTopicsOfContent = this.page.locator('[id="articleBody"] h3 span');
    this.subTopicsOfContentDescription = this.page.locator('[id="articleBody"] ul + h1, [id="articleBody"] p + h1');
    this.whatIsHiveBlogLink = this.page.getByRole('link', {name: 'What is Hive.blog?'});
  }
}
