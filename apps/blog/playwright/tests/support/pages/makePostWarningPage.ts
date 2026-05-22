import { Locator, Page, expect } from '@playwright/test';

export class MakePostWarningPage {
  readonly page: Page;
  readonly logInToMakePostMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logInToMakePostMessage = page.locator('[data-testid="log-in-to-make-post-message"]');
  }

  async goto() {
    await this.page.goto('/submit.html', { waitUntil: 'domcontentloaded' });
    await expect(this.logInToMakePostMessage).toBeVisible();
  }

  async validateMakePostWarningPageIsLoadedOfSpecificCommunities(community: string){
    const message: string = 'Log in to make a post.';

    await this.page.waitForSelector(this.logInToMakePostMessage['_selector']);
    await expect(this.page.url()).toContain(`submit.html?category=${community}`);
    await expect(this.logInToMakePostMessage).toHaveText(message);
  }

  async validateAnonymousLoginPromptVisible() {
    await expect(this.logInToMakePostMessage).toBeVisible();
    await expect(this.logInToMakePostMessage).toHaveText(/Log in to make a post/i);
  }
}
