import { Locator, Page, expect } from '@playwright/test';

export class HbauthLoginDialog {
  readonly page: Page;
  readonly loginDialogHbauth: Locator;
  readonly hbauthUnlockKeyButton: Locator;
  readonly hbauthAddKeyButton: Locator;
  readonly hbauthUnlockKeyHeader: Locator;
  readonly hbauthUnlockKeyUsernameInput: Locator;
  readonly hbauthUnlockKeyPasswordInput: Locator;
  readonly hbauthUnlockKeySelectKeyType: Locator;
  readonly hbauthUnlockKeySelectKeyTypeTrigger: Locator;
  readonly hbauthUnlockKeySubmitButton: Locator;
  readonly hbauthUnlockKeyResetButton: Locator;

  readonly hbauthAddKeyHeader: Locator;
  readonly hbauthAddKeyUsernameInput: Locator;
  readonly hbauthAddKeyPasswordInput: Locator;
  readonly hbauthAddKeySelectKeyType: Locator;
  readonly hbauthAddKeySelectKeyTypeTrigger: Locator;
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
    this.hbauthUnlockKeyPasswordInput = page.locator('[data-testid="hbauth-unlock-key-password-input"]');
    this.hbauthUnlockKeySelectKeyType = page.locator('[data-testid="hbauth-unlock-key-select-key-type"] select');
    this.hbauthUnlockKeySelectKeyTypeTrigger = page.locator('[data-testid="hbauth-unlock-key-select-key-type-trigger"]');
    this.hbauthUnlockKeySubmitButton = page.locator('[data-testid="hbauth-unlock-key-submit-button"]');
    this.hbauthUnlockKeyResetButton = page.locator('[data-testid="hbauth-unlock-key-reset-button"]');

    this.hbauthAddKeyHeader = page.locator('[data-testid="hbauth-add-key-header"]');
    this.hbauthAddKeyUsernameInput = page.locator('[data-testid="hbauth-add-key-username-input"]');
    this.hbauthAddKeyPasswordInput = page.locator('[data-testid="hbauth-add-key-password-input"]');
    this.hbauthAddKeySelectKeyType = page.locator('[data-testid="hbauth-add-key-select-key-type"]');
    this.hbauthAddKeySelectKeyTypeTrigger = page.locator('[data-testid="hbauth-add-key-select-key-type-trigger"]');
    this.hbauthAddKeyPrivateKeyInput = page.locator('[data-testid="hbauth-add-key-private-key-input"]');;
    this.hbauthAddKeySubmitButton = page.locator('[data-testid="hbauth-add-key-submit-button"]');
    this.hbauthAddKeyResetButton = page.locator('[data-testid="hbauth-add-key-reset-button"]');

    this.hbauthCloseDialog = page.locator('[data-testid="close-dialog"]');
  }

  async validateHbauthDialogIsVisible() {
  }

  async validateHbauthUnlockKeyDialogIsVisible() {
    await expect(this.loginDialogHbauth).toBeVisible();
    await expect(this.hbauthUnlockKeyButton).toBeVisible();
    await expect(this.hbauthUnlockKeyHeader).toHaveText('Hbauth: Unlock Key');
    await expect(this.hbauthUnlockKeyUsernameInput).toHaveAttribute('placeholder', 'Enter your username');
    await expect(this.hbauthUnlockKeyPasswordInput).toHaveAttribute('placeholder', 'Password');
    await expect(this.hbauthUnlockKeySelectKeyTypeTrigger).toBeVisible();
    await expect(this.hbauthUnlockKeySubmitButton).toBeVisible();
    await expect(this.hbauthUnlockKeyResetButton).toBeVisible();
  }

  async validateHbauthAddKeyDialogIsVisible() {}
}
