import { Locator, Page, expect } from '@playwright/test';

export class LoginForm {
  readonly page: Page;
  readonly loginFormDescription: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly wifInput: Locator;
  readonly saveSignInButton: Locator;
  readonly otherSignInOptionsButton: Locator;
  readonly closeDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginFormDescription = page.getByTestId('login-form-description');
    this.usernameInput = page.getByTestId('username-input');
    this.passwordInput = page.getByTestId('password-input');
    this.wifInput = page.getByTestId('wif-input');
    this.saveSignInButton = page.getByTestId('save-sign-in-button');
    this.otherSignInOptionsButton = page.getByTestId('other-sign-in-options-button');
    this.closeDialog = page.getByTestId('close-dialog');
  }

  async validateDefaultLoginFormIsLoaded() {
    await this.page.waitForSelector(this.loginFormDescription['_selector']);
    await expect(this.loginFormDescription).toHaveText('Save your posting key by filling form below');
    await expect(this.usernameInput).toHaveAttribute('placeholder', 'Username');
    await expect(this.passwordInput).toHaveAttribute('placeholder', 'Safe storage password');
    await expect(this.wifInput).toHaveAttribute('placeholder', 'WIF posting private key');
    await expect(this.saveSignInButton).toBeVisible();
    await expect(this.otherSignInOptionsButton).toBeVisible();
  }

  async closeLoginForm() {
    await this.closeDialog.click();
  }
}
