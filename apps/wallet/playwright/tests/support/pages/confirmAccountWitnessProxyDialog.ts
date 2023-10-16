import { Locator, Page, expect } from '@playwright/test';

export class ConfirmAccountWitnessProxyDialog {
  readonly page: Page;
  readonly getHeaderConfirmProxyDialog: Locator;
  readonly getConfirmProxyDescription: Locator;
  readonly getCloseDialogButton: Locator;
  readonly getOkButton: Locator;
  readonly getCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getHeaderConfirmProxyDialog = page.locator('[data-testid="reblog-dialog-header"]');
    this.getConfirmProxyDescription = page.locator('[data-testid="reblog-dialog-description"]');
    this.getCloseDialogButton = page.locator('[data-testid="reblog-dialog-close"]');
    this.getOkButton = page.locator('[data-testid="reblog-dialog-ok"]');
    this.getCancelButton = page.locator('[data-testid="reblog-dialog-cancel"]');
  }

  async validateConfirmProxyDialogIsVisible() {
    await this.page.waitForSelector(this.getHeaderConfirmProxyDialog['_selector']);
    await expect(this.getHeaderConfirmProxyDialog).toHaveText("Confirm Account Witness Proxy");
    await expect(this.getConfirmProxyDescription).toHaveText("You are about to remove your proxy.");
    await expect(this.getCloseDialogButton).toBeVisible();
    await expect(this.getOkButton).toBeVisible();
    await expect(this.getCancelButton).toBeVisible();
  }

  async closeConfirmProxyDialog() {
    await this.getCloseDialogButton.click();
  }

  async clickOkButtonInConfirmProxyDialog() {
    await this.getOkButton.click();
  }

  async clickCancelButtonInConfirmProxyDialog() {
    await this.getCancelButton.click();
  }

}
