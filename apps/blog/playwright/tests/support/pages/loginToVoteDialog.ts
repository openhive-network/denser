import { Locator, Page, expect } from '@playwright/test';

export class LoginToVoteDialog {
  readonly page: Page;
  readonly getLoginDialog: Locator;
  readonly getHeaderLoginDialog: Locator;
  readonly getUsernameInput: Locator;
  readonly getPasswordInput: Locator;
  readonly getHiveAuthCheckbox: Locator;
  readonly getKeepMeLoggedInCheckbox: Locator;
  readonly getSignInButton: Locator;
  readonly getCancelButton: Locator;
  readonly getHiveSignerButton: Locator;
  readonly getCloseDialogButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getLoginDialog = page.locator('[data-testid="login-dialog"]');
    this.getHeaderLoginDialog = this.getLoginDialog.getByText(/Login to Vote/);
    this.getUsernameInput = page.locator('#firstName');
    this.getPasswordInput = page.locator('#password');
    this.getHiveAuthCheckbox = page.locator('#hiveAuth');
    this.getKeepMeLoggedInCheckbox = page.locator('#remember');
    this.getSignInButton = page.locator('button').getByText('Sign in');
    this.getCancelButton = page.locator('button').getByText('Cancel');
    this.getHiveSignerButton = page.locator('[data-testid="hivesigner-button"]');
    this.getCloseDialogButton = page.locator('[data-testid="close-dialog"]');
  }

  async validateLoginToVoteDialogIsVisible() {
    await this.page.waitForSelector(this.getHeaderLoginDialog['_selector']);
    await expect(this.getHeaderLoginDialog).toBeVisible();
    await expect(this.getUsernameInput).toHaveAttribute('placeholder', 'Enter your username');
    await expect(this.getPasswordInput).toHaveAttribute('placeholder', 'Password or WIF');
    await expect(this.getHiveAuthCheckbox).not.toBeChecked();
    await expect(this.getKeepMeLoggedInCheckbox).not.toBeChecked();
    await expect(this.getSignInButton).toBeVisible();
    await expect(this.getCancelButton).toBeVisible();
    await expect(this.getHiveSignerButton).toBeVisible();
  }

  async closeLoginDialog() {
    await this.getCloseDialogButton.click();
  }
}
