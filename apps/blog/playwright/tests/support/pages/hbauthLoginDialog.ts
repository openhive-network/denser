import { Locator, Page, expect } from '@playwright/test';

export class HbauthLoginDialog {
  readonly page: Page;
  readonly loginDialogHbauth: Locator;
  readonly hbauthUnlockKeyButton: Locator;
  readonly hbauthAddKeyButton: Locator;
  readonly hbauthUnlockKeyHeader: Locator;
  readonly hbauthUnlockKeyUsernameInput: Locator;
  readonly hbauthUnlockKeySelectKeyType: Locator;
  readonly hbauthUnlockKeyTypeRadioPostingPrivateKey: Locator;
  readonly hbauthUnlockKeyTypeRadioActivePrivateKey: Locator;
  readonly hbauthUnlockKeySubmitButton: Locator;
  readonly hbauthUnlockKeyResetButton: Locator;

  readonly hbauthAddKeyHeader: Locator;
  readonly hbauthAddKeyUsernameInput: Locator;
  readonly hbauthAddKeyPasswordInput: Locator;
  readonly hbauthAddKeySelectKeyType: Locator;
  readonly hbauthAddKeySelectKeyTypeTrigger: Locator;
  readonly hbauthAddKeyTypeRadioPostingPrivateKey: Locator;
  readonly hbauthAddKeyTypeRadioActivePrivateKey: Locator;
  readonly hbauthAddKeyPrivateKeyInput: Locator;
  readonly hbauthAddKeySubmitButton: Locator;
  readonly hbauthAddKeyResetButton: Locator;
  readonly hbauthCloseDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginDialogHbauth = page.locator('[data-testid="login-dialog-hb-auth"]');
    this.hbauthUnlockKeyButton = page.locator('[data-testid="hbauth-unlock-key-button"]');
    this.hbauthAddKeyButton = page.locator('[data-testid="hbauth-add-key-button"]');
    this.hbauthUnlockKeyHeader = page.locator('[data-testid="hbauth-unlock-key-header"]');
    this.hbauthUnlockKeyUsernameInput = page.locator('[data-testid="hbauth-unlock-key-username-input"]');
    this.hbauthUnlockKeySelectKeyType = page.locator('[data-testid="hbauth-unlock-key-select-key-type"]');
    this.hbauthUnlockKeyTypeRadioPostingPrivateKey = this.hbauthUnlockKeySelectKeyType.locator('button[data-testid="radio-button"]').first();
    this.hbauthUnlockKeyTypeRadioActivePrivateKey = this.hbauthUnlockKeySelectKeyType.locator('button[data-testid="radio-button"]').last();
    this.hbauthUnlockKeySubmitButton = page.locator('[data-testid="hbauth-unlock-key-submit-button"]');
    this.hbauthUnlockKeyResetButton = page.locator('[data-testid="hbauth-unlock-key-reset-button"]');

    this.hbauthAddKeyHeader = page.locator('[data-testid="hbauth-add-key-header"]');
    this.hbauthAddKeyUsernameInput = page.locator('[data-testid="hbauth-add-key-username-input"]');
    this.hbauthAddKeyPasswordInput = page.locator('[data-testid="hbauth-add-key-password-input"]');
    this.hbauthAddKeySelectKeyType = page.locator('[data-testid="hbauth-add-key-select-key-type"]');
    this.hbauthAddKeyTypeRadioPostingPrivateKey = this.hbauthAddKeySelectKeyType.locator('button[data-testid="radio-button"]').first();
    this.hbauthAddKeyTypeRadioActivePrivateKey = this.hbauthAddKeySelectKeyType.locator('button[data-testid="radio-button"]').last();
    this.hbauthAddKeyPrivateKeyInput = page.locator('[data-testid="hbauth-add-key-private-key-input"]');;
    this.hbauthAddKeySubmitButton = page.locator('[data-testid="hbauth-add-key-submit-button"]');
    this.hbauthAddKeyResetButton = page.locator('[data-testid="hbauth-add-key-reset-button"]');

    this.hbauthCloseDialog = page.locator('[data-testid="close-dialog"]');
  }

  async validateHbauthDialogIsVisible() {
    await expect(this.loginDialogHbauth).toBeVisible();
    await expect(this.hbauthUnlockKeyButton).toBeVisible();
    await expect(this.hbauthUnlockKeyHeader).toHaveText('Hbauth: Unlock Key');
    await expect(this.hbauthUnlockKeyUsernameInput).toHaveAttribute('placeholder', 'Enter your username');
    await expect(this.hbauthUnlockKeySelectKeyType).toBeVisible();
    await expect(this.hbauthUnlockKeySubmitButton).toBeVisible();
    await expect(this.hbauthUnlockKeyResetButton).toBeVisible();
  }

  async validateHbauthUnlockKeyDialogIsVisible() {
    await expect(this.loginDialogHbauth).toBeVisible();
    await expect(this.hbauthUnlockKeyButton).toBeVisible();
    await expect(this.hbauthUnlockKeyHeader).toHaveText('Hbauth: Unlock Key');
    await expect(this.hbauthUnlockKeyUsernameInput).toHaveAttribute('placeholder', 'Enter your username');
    await expect(this.hbauthUnlockKeyTypeRadioPostingPrivateKey).toBeVisible();
    await expect(this.hbauthUnlockKeyTypeRadioActivePrivateKey).toBeVisible();
    await expect(this.hbauthUnlockKeySubmitButton).toBeVisible();
    await expect(this.hbauthUnlockKeyResetButton).toBeVisible();
  }

  async validateHbauthAddKeyDialogIsVisible() {
    await expect(this.hbauthAddKeyButton).toBeVisible();
    await expect(this.hbauthAddKeyHeader).toHaveText('Hbauth: Add Key');
    await expect(this.hbauthAddKeyUsernameInput).toHaveAttribute('placeholder', 'Enter your username');
    await expect(this.hbauthAddKeyPasswordInput).toHaveAttribute('placeholder', 'Password');
    await expect(this.hbauthAddKeyTypeRadioPostingPrivateKey).toBeVisible();
    await expect(this.hbauthAddKeyTypeRadioActivePrivateKey).toBeVisible();
    await expect(this.hbauthAddKeyPrivateKeyInput).toHaveAttribute('placeholder', 'Your private key');
    await expect(this.hbauthAddKeySubmitButton).toBeVisible();
    await expect(this.hbauthAddKeyResetButton).toBeVisible();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const bcg = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return bcg;
  }
}
