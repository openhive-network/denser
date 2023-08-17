import { Locator, Page, expect } from "@playwright/test";

export class WalletPage {
  readonly page: Page;
  readonly hiveWalletLoginLabel: Locator;
  readonly hiveTokensLiquidPlatformTokenLabel: Locator;
  readonly hiveTokensVestingInfluenceTokenLabel: Locator;
  readonly hiveTokensSeeksPriceStabilityWithUSD: Locator;

  constructor(page: Page) {
    this.page = page;
    this.hiveWalletLoginLabel = page.getByText("Hive wallet login");
    this.hiveTokensLiquidPlatformTokenLabel = page.getByText(
      "Liquid platform token"
    );
    this.hiveTokensVestingInfluenceTokenLabel = page.getByText(
      "Vesting influence token"
    );
    this.hiveTokensSeeksPriceStabilityWithUSD = page.getByText(
      "Seeks price stability with USD"
    );
  }

  async goToWalletPage() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector(this.hiveWalletLoginLabel["_selector"]);
    await expect(this.hiveWalletLoginLabel).toBeVisible();
  }
}
