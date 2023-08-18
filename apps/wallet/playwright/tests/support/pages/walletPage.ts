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
  }

  async goToWalletPage() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector(this.hiveWalletLoginLabel["_selector"]);
    await expect(this.hiveWalletLoginLabel).toBeVisible();
  }
}
