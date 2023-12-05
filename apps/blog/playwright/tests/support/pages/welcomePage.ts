import { Locator, Page, expect } from '@playwright/test';

export class WelcomePage {
  readonly page: Page;
  readonly subtitles: Locator;

  constructor(page: Page) {
    this.page = page;
    this.subtitles = this.page.locator('[id="articleBody"] h3');
  }
}
