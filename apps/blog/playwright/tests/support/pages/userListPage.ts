import { Locator, Page, expect } from '@playwright/test';
import { TIMEOUTS } from '../constants';

export class UserListPage {
  readonly page: Page;
  readonly area: Locator;
  readonly title: Locator;
  readonly container: Locator;
  readonly emptyState: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly addAccountHeading: Locator;
  readonly resetAllButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.area = page.getByTestId('user-list-area');
    this.title = this.area.getByTestId('user-list-title');
    this.container = this.area.getByTestId('user-list-container');
    this.emptyState = this.container.getByTestId('user-list-empty');
    this.items = this.container.getByTestId('user-list-item');
    this.itemNames = this.items.getByTestId('user-list-item-name');
    this.addAccountHeading = page.getByRole('heading', { name: /add account to list/i });
    this.resetAllButton = page.getByRole('button', { name: /reset all lists/i });
  }

  async gotoListPage(username: string, slug: string): Promise<void> {
    await this.page.goto(`/@${username}/lists/${slug}`, { waitUntil: 'commit' });
  }

  async expectAreaVisible(): Promise<void> {
    await expect(this.area).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  }

  async expectTitleMatches(pattern: RegExp): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.title).toHaveText(pattern);
  }

  async expectContainerOrEmpty(): Promise<void> {
    await expect(this.container).toBeVisible();
    await expect(this.items.or(this.emptyState)).toBeVisible();
  }

  async expectItemCount(count: number): Promise<void> {
    await expect(this.items).toHaveCount(count);
    await expect(this.itemNames).toHaveCount(count);
  }

  async expectOwnerOnlySectionsHidden(): Promise<void> {
    await expect(this.addAccountHeading).toHaveCount(0);
    await expect(this.resetAllButton).toHaveCount(0);
  }
}
