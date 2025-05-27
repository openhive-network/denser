import { Locator, Page, expect } from "@playwright/test";

export class WalletPage {
  readonly page: Page;
  readonly hiveWalletLoginLabel: Locator;
  readonly hiveTokenLabel: Locator;
  readonly hiveTokensLiquidPlatformTokenLabel: Locator;
  readonly hivePowerTokenLabel: Locator;
  readonly hiveTokensVestingInfluenceTokenLabel: Locator;
  readonly hiveTokenHBDLabel: Locator;
  readonly hiveTokensSeeksPriceStabilityWithUSD: Locator;
  readonly hiveWalletLoginButton: Locator;

  readonly userProfileInfo: Locator;
  readonly balancesTab: Locator;
  readonly delegationsTab: Locator;

  readonly walletHiveDescription: Locator;
  readonly walletHiveValue: Locator;
  readonly walletHivePowerDescription: Locator;
  readonly walletHivePowerValue: Locator;
  readonly walletHiveDollarsDescription: Locator;
  readonly walletHiveDollarsValue: Locator;
  readonly walletSavingsDescription: Locator;
  readonly walletSavingsHiveValue: Locator;
  readonly walletSavingsHbdValue: Locator;
  readonly walletEstimatedAccountValueDescription: Locator;
  readonly walletEstimatedAccountValue: Locator;
  readonly walletCheckboxOthers: Locator;
  readonly walletCheckboxIncoming: Locator;
  readonly walletCheckboxOutcoming: Locator;
  readonly walletCheckboxExcludeLessThan1: Locator;
  readonly walletSearchInput: Locator;
  readonly walletAccountHistoryDescription: Locator;
  readonly walletAccountHistoryRow: Locator;
  readonly walletAccountHistoryNoTransactionMsg: Locator;
  readonly walletDelegationItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.hiveWalletLoginLabel = page.getByText("Hive wallet login");
    this.hiveTokenLabel = page.locator('[data-testid="hive-token-label"]');
    this.hiveTokensLiquidPlatformTokenLabel = page.getByText(
      "Liquid platform token"
    );
    this.hivePowerTokenLabel = page.locator('[data-testid="hive-power-token-label"]');
    this.hiveTokensVestingInfluenceTokenLabel = page.getByText(
      "Vesting influence token"
    );
    this.hiveTokenHBDLabel = page.locator('[data-testid="hive-hbd-label"]');
    this.hiveTokensSeeksPriceStabilityWithUSD = page.getByText(
      "Seeks price stability with USD"
    );
    this.hiveWalletLoginButton = page.locator('[data-testid="wallet-login-button"]');
    this.userProfileInfo = page.locator('[data-testid="profile-info"]');
    this.balancesTab = page.locator('[data-testid="wallet-balances-link"]');
    this.delegationsTab = page.locator('[data-testid="wallet-delegations-link"]');
    this.walletHiveDescription = page.locator('[data-testid="wallet-hive-description"]');
    this.walletHiveValue = page.locator('[data-testid="wallet-hive-value"]');
    this.walletHivePowerDescription = page.locator('[data-testid="wallet-hive-power-description"]');
    this.walletHivePowerValue = page.locator('[data-testid="wallet-hive-power"]');
    this.walletHiveDollarsDescription = page.locator('[data-testid="wallet-hive-dollars-description"]');
    this.walletHiveDollarsValue = page.locator('[data-testid="wallet-hive-dallars-value"]');
    this.walletSavingsDescription = page.locator('[data-testid="wallet-savings-description"]');
    this.walletSavingsHiveValue = page.locator('[data-testid="wallet-saving-hive-value"]');
    this.walletSavingsHbdValue = page.locator('[data-testid="walled-hbd-saving-value"]');
    this.walletEstimatedAccountValueDescription = page.locator('[data-testid="wallet-estimated-account-value-description"]');
    this.walletEstimatedAccountValue = page.locator('[data-testid="wallet-estimated-account-value"]');
    this.walletCheckboxOthers = page.locator('[data-testid="wallet-checkbox-others"]');
    this.walletCheckboxIncoming = page.locator('[data-testid="wallet-checkbox-incoming"]');
    this.walletCheckboxOutcoming = page.locator('[data-testid="wallet-checkbox-outcoming"]');
    this.walletCheckboxExcludeLessThan1 = page.locator('[data-testid="wallet-checkbox-exclude-less-than-1-hbd-hive"]');
    this.walletSearchInput = page.locator('[data-testid="wallet-search-input"]');
    this.walletAccountHistoryDescription = page.locator('[data-testid="wallet-account-history-description"]');
    this.walletAccountHistoryRow = page.locator('[data-testid="wallet-account-history-row"]');
    this.walletAccountHistoryNoTransactionMsg = page.locator('[data-testid="wallet-account-history-no-transacions-found"]');
    this.walletDelegationItem = page.locator('[data-testid="wallet-delegation-item"]');
  }

  async goToWalletPage() {
    await this.page.goto("/");
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForSelector(this.hiveWalletLoginLabel["_selector"]);
    await expect(this.hiveWalletLoginLabel).toBeVisible();
  }

  async goToWalletPageOfUser(user: string) {
    await this.page.goto(`/${user}/transfers`);
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForSelector(this.userProfileInfo["_selector"]);
    await expect(this.userProfileInfo).toBeVisible();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const bcg = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return bcg;
  }
}
