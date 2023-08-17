import { expect, test } from "@playwright/test";
import { WalletPage } from "../support/pages/walletPage";

test.describe("Wallet page tests", () => {
  let walletPage: WalletPage;

  test.beforeEach(async ({ page }) => {
    walletPage = new WalletPage(page);
  });

  test("validate that wallet page is loaded", async ({ page }) => {
    await walletPage.goToWalletPage();
    await expect(walletPage.page.url()).toMatch(/http:\/\/\w+:4000/); // http://denser:4000 or http://localhost:4000

    await expect(walletPage.hiveTokensLiquidPlatformTokenLabel).toBeVisible();
    await expect(walletPage.hiveTokensVestingInfluenceTokenLabel).toBeVisible();
    await expect(walletPage.hiveTokensSeeksPriceStabilityWithUSD).toBeVisible();
  });
});
