import { Locator, Page } from '@playwright/test';

/**
 * POM for `/@{account}/followed` — `app/[param]/(user-profile)/followed/content.tsx`,
 * with the owner-only "Unfollow all" confirmation (`features/account-lists/unfollow-all-dialog.tsx`).
 */
export class FollowedPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly items: Locator;
  readonly unfollowAllButton: Locator;
  readonly dialog: Locator;
  readonly dialogDescription: Locator;
  readonly dialogInput: Locator;
  readonly dialogConfirm: Locator;
  readonly dialogCancel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /^followed page/i });
    this.items = page.getByTestId('followed-list-item');
    this.unfollowAllButton = page.getByTestId('unfollow-all-button');
    this.dialog = page.getByTestId('unfollow-all-dialog');
    this.dialogDescription = this.dialog.getByTestId('unfollow-all-dialog-description');
    this.dialogInput = this.dialog.getByTestId('unfollow-all-dialog-input');
    this.dialogConfirm = this.dialog.getByTestId('unfollow-all-dialog-confirm');
    this.dialogCancel = this.dialog.getByTestId('unfollow-all-dialog-cancel');
  }

  async goto(account: string): Promise<void> {
    await this.page.goto(`/@${account}/followed`);
  }
}
