import { Locator, Page, expect } from '@playwright/test';

export class LoginForm {
  readonly page: Page;
  readonly loginDialog: Locator;
  readonly loginFormHeader: Locator;
  readonly loginFormDescription: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly wifInput: Locator;
  readonly saveSignInButton: Locator;
  readonly signInButton: Locator;
  readonly otherSignInOptionsButton: Locator;
  readonly otherSignInOptionsHeader: Locator;
  readonly otherSignInOptionsDescription: Locator;
  readonly otherSignInOptionsErrorMessage: Locator;
  readonly otherSignInOptionsUsernameInput: Locator;
  readonly otherSignInOptionsUsernameErrorMsg: Locator;
  readonly hiveKeychainExtensionButton: Locator;
  readonly signInWithWifButton: Locator;
  readonly hiveAuthButton: Locator;
  readonly hiveSignerButton: Locator;
  readonly goBackButton: Locator;
  readonly closeDialog: Locator;

  readonly headerEnterYourWifKey: Locator;
  readonly postingPrivateKeyInput: Locator;
  readonly storeKeyCheckbox: Locator;
  readonly postingPrivateKeySubmitButton: Locator;
  readonly postingPrivateKeyResetButton: Locator;

  readonly usernameErrorMessage: Locator;
  readonly passwordErrorMessage: Locator;
  readonly wifInputErrorMessage: Locator;
  readonly passwordErrorMessageEnterYourWifKey: Locator;

  readonly enterYourPasswordForm: Locator;
  readonly headerEnterYourPassword: Locator;
  readonly passwordToUnlockKeyInput: Locator;
  readonly passwordToUnlockKeySubmitButton: Locator;
  readonly passwordToUnlockKeyResetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginDialog = page.getByTestId('login-dialog');
    this.loginFormHeader = page.getByText('Sign in with safe storage');
    this.loginFormDescription = page.getByTestId('login-form-description');
    this.usernameInput = page.getByTestId('username-input');
    this.passwordInput = page.getByTestId('password-input');
    this.wifInput = page.getByTestId('wif-input');
    this.saveSignInButton = page.getByTestId('save-sign-in-button');
    this.signInButton = page.locator('[type="submit"]');
    this.otherSignInOptionsButton = page.getByTestId('other-sign-in-options-button');
    this.closeDialog = page.getByTestId('close-dialog');

    this.otherSignInOptionsHeader = page.getByText('Other sign in options');
    this.otherSignInOptionsDescription = page.getByTestId('other-signin-options-description');
    this.otherSignInOptionsErrorMessage = page.getByTestId('other-signin-options-error-msg');
    this.otherSignInOptionsUsernameInput = page.getByTestId('other-signin-options-username-input');
    this.otherSignInOptionsUsernameErrorMsg = page.getByTestId('other-signin-username-error-msg');
    this.hiveKeychainExtensionButton = page.getByTestId('hive-keychain-extension-button');
    this.signInWithWifButton = page.getByTestId('sign-in-with-wif-button');
    this.hiveAuthButton = page.getByTestId('hive-auth-button');
    this.hiveSignerButton = page.getByTestId('hive-signer-button');
    this.goBackButton = page.getByTestId('go-back-button');

    this.headerEnterYourWifKey = page.getByText('Enter your WIF key');
    this.postingPrivateKeyInput = page.getByTestId('posting-private-key-input');
    this.storeKeyCheckbox = page.getByLabel('Store key');
    this.postingPrivateKeySubmitButton = page.getByTestId('password-submit-button');
    this.postingPrivateKeyResetButton = page.getByTestId('password-reset-button');

    this.usernameErrorMessage = page.getByTestId('username-error-message');
    this.passwordErrorMessage = page.getByTestId('password-error-message');
    this.wifInputErrorMessage = page.getByTestId('wif-input-error-message');
    this.passwordErrorMessageEnterYourWifKey = page.getByTestId('password-form-error-message');

    this.enterYourPasswordForm = page.getByTestId('enter-password-to-unlock-key');
    this.headerEnterYourPassword = page.getByText('Enter your password');
    this.passwordToUnlockKeyInput = page.getByTestId('posting-private-key-input');
    this.passwordToUnlockKeySubmitButton = page.getByTestId('password-submit-button');
    this.passwordToUnlockKeyResetButton = page.getByTestId('password-reset-button');
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

  async validateUnlockUserWithPasswordLoginFormIsLoaded(username: string) {
    await this.page.waitForSelector(this.loginFormDescription['_selector']);
    await expect(this.loginFormDescription).toHaveText('Unlock user with password');
    await expect(this.usernameInput).toHaveAttribute('value', username);
    await expect(this.passwordInput).toHaveAttribute('placeholder', 'Safe storage password');
    await expect(this.signInButton).toBeDisabled();
    await expect(this.otherSignInOptionsButton).toBeVisible();
  }

  async validateDefaultOtherSignInOptionsFormIsLoaded() {
    await this.page.waitForSelector(this.otherSignInOptionsDescription['_selector']);
    await expect(this.otherSignInOptionsDescription).toHaveText(
      'Enter your username and select a sign in method'
    );
    await expect(this.otherSignInOptionsUsernameInput).toHaveAttribute('placeholder', 'Username');
    await expect(this.hiveKeychainExtensionButton).toBeDisabled();
    await expect(this.signInWithWifButton).toBeDisabled();
    await expect(this.hiveAuthButton).toBeDisabled();
    await expect(this.hiveSignerButton).toBeDisabled();
    await expect(this.goBackButton).toBeEnabled();
  }

  // user when username is typed in Sign in form
  async validateOtherSignInOptionsFormWithUsernameIsLoaded(username: string) {
    await this.page.waitForSelector(this.otherSignInOptionsDescription['_selector']);
    await expect(this.otherSignInOptionsDescription).toHaveText(
      'Enter your username and select a sign in method'
    );
    await expect(this.otherSignInOptionsUsernameInput).toHaveAttribute('value', username);
    await expect(this.hiveKeychainExtensionButton).toBeEnabled();
    await expect(this.signInWithWifButton).toBeEnabled();
    await expect(this.hiveAuthButton).toBeDisabled();
    await expect(this.hiveSignerButton).toBeDisabled();
    await expect(this.goBackButton).toBeEnabled();
  }

  async validateEnterYourWifKeyFormIsLoaded() {
    await this.page.waitForSelector(this.headerEnterYourWifKey['_selector']);
    await expect(this.headerEnterYourWifKey).toBeVisible();
    await expect(this.postingPrivateKeyInput).toBeVisible();
    await expect(this.storeKeyCheckbox).not.toBeChecked();
    await expect(this.postingPrivateKeySubmitButton).toBeVisible();
    await expect(this.postingPrivateKeyResetButton).toBeVisible();
  }

  async validateEnterYourPasswordToUnlockKeyIsLoaded() {
    await this.page.waitForSelector(this.enterYourPasswordForm['_selector']);
    await expect(this.headerEnterYourPassword).toHaveText('Enter your password');
    await expect(this.passwordToUnlockKeyInput).toHaveAttribute('placeholder', 'Password to unlock key');
    await expect(this.passwordToUnlockKeySubmitButton).toBeVisible();
    await expect(this.passwordToUnlockKeyResetButton).toBeVisible();
  }

  async putEnterYourPasswordToUnlockKey(safeStoragePassword: string) {
    await this.page.waitForSelector(this.enterYourPasswordForm['_selector']);
    await expect(this.headerEnterYourPassword).toHaveText('Enter your password');
    await expect(this.passwordToUnlockKeyInput).toHaveAttribute('placeholder', 'Password to unlock key');
    await expect(this.passwordToUnlockKeySubmitButton).toBeVisible();
    await expect(this.passwordToUnlockKeyResetButton).toBeVisible();
    await this.passwordToUnlockKeyInput.fill(safeStoragePassword);
    await this.passwordToUnlockKeySubmitButton.click();
  }

  async putEnterYourPasswordToUnlockKeyIfNeeded(safeStoragePassword: string) {
    if (await this.enterYourPasswordForm.isVisible()) {
      await this.putEnterYourPasswordToUnlockKey(safeStoragePassword);
    }
  }

  async closeLoginForm() {
    await this.closeDialog.click();
  }
}
