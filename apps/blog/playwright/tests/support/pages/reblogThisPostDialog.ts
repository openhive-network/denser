import { Locator, Page, expect } from '@playwright/test';

export class ReblogThisPostDialog {
  readonly page: Page;
  readonly getDialogHeader: Locator;
  readonly getDialogCloseButton: Locator;
  readonly getDialogDescription: Locator;
  readonly getDialogOkButton: Locator;
  readonly getDialogCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getDialogHeader = page.locator('[data-testid="reblog-dialog-header"]');
    this.getDialogDescription = page.locator('[data-testid="reblog-dialog-description"]');
    this.getDialogCloseButton = page.locator('[data-testid="reblog-dialog-close"]');
    this.getDialogCancelButton = page.locator('[data-testid="reblog-dialog-cancel"]');
    this.getDialogOkButton = page.locator('[data-testid="reblog-dialog-ok"]');
  }

  async validateReblogThisPostHeaderIsVisible() {
    await expect(this.getDialogHeader).toHaveText('Reblog This Post');
  }

  async validateReblogThisPostDescriptionIsVisible() {
    await expect(this.getDialogDescription).toHaveText('This post will be added to your blog and shared with your followers.');
  }

  async clickOkButton() {
    await this.getDialogOkButton.click();
  }

  async clickCancelButton() {
    await this.getDialogCloseButton.click();
  }

  async closeReblogDialog() {
    await this.getDialogCloseButton.click();
  }
}
