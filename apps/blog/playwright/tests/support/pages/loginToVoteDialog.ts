import { Locator, Page, expect } from '@playwright/test';

export class LoginToVoteDialog {
  readonly page: Page;
  readonly getLoginDialog: Locator;
  readonly getHeaderLoginDialog: Locator;
  readonly getUsernameInput: Locator;
  readonly getPostingPrivateKeyInput: Locator;
  readonly getHbauthPasswordInput: Locator;
  readonly getHiveAuthCheckbox: Locator;
  readonly getUseKeychainCheckbox: Locator;
  readonly getUseHiveauthCheckbox: Locator;
  readonly getUseHbauthCheckbox: Locator;
  readonly getKeepMeLoggedInCheckbox: Locator;
  readonly getSubmitButton: Locator;
  readonly getResetButton: Locator;
  readonly getHiveSignerButton: Locator;
  readonly getCloseDialogButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getLoginDialog = page.locator('[data-testid="login-dialog"]');
    this.getHeaderLoginDialog = this.getLoginDialog.getByText(/Login/);
    this.getUsernameInput = this.getLoginDialog.locator('[autoComplete="username"]');
    this.getPostingPrivateKeyInput = this.getLoginDialog.locator('[data-testid="posting-private-key-input"]');
    this.getHbauthPasswordInput = this.getLoginDialog.locator('[data-testid="hbauth-password-input"]');
    this.getUseKeychainCheckbox = this.getLoginDialog.locator('input[name="useKeychain"]');
    this.getUseHiveauthCheckbox = this.getLoginDialog.locator('input[name="useHiveauth"]');
    this.getUseHbauthCheckbox = this.getLoginDialog.locator('input[name="useHbauth"]');
    this.getKeepMeLoggedInCheckbox = this.getLoginDialog.locator('input[name="remember"]');
    this.getSubmitButton = page.getByRole('button', { name: 'Submit' });
    this.getResetButton = page.locator('button').getByText('Reset');
    this.getHiveSignerButton = page.locator('[data-testid="hivesigner-button"]');
    this.getCloseDialogButton = page.locator('[data-testid="close-dialog"]');
  }

  async validateLoginToVoteDialogIsVisible() {
    await this.page.waitForSelector(this.getHeaderLoginDialog['_selector']);
    await expect(this.getHeaderLoginDialog).toBeVisible();
    await expect(this.getUsernameInput).toHaveAttribute('placeholder', 'Enter your username');
    await expect(this.getPostingPrivateKeyInput).toHaveAttribute('placeholder', 'Posting private key');
    await expect(this.getHbauthPasswordInput).toHaveAttribute('placeholder', 'Hbauth password to unlock key');
    await expect(this.getUseKeychainCheckbox).not.toBeChecked();
    await expect(this.getUseHiveauthCheckbox).not.toBeChecked();
    await expect(this.getUseHbauthCheckbox).not.toBeChecked();
    await expect(this.getKeepMeLoggedInCheckbox).not.toBeChecked();
    await expect(this.getSubmitButton).toBeVisible();
    await expect(this.getResetButton).toBeVisible();
    await expect(this.getHiveSignerButton).toBeVisible();
  }

  async closeLoginDialog() {
    await this.getCloseDialogButton.click();
  }
}
