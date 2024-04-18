import { expect, test } from "@playwright/test";
import { WalletPage } from "../support/pages/walletPage";
import { LoginToVoteDialog } from "../support/pages/loginToVoteDialog";
import { ApiHelper } from "../support/apiHelper";
import { HomePage } from '../../../../blog/playwright/tests/support/pages/homePage';

test.describe("Wallet page tests", () => {
  let walletPage: WalletPage;

  test.beforeEach(async ({ page }) => {
    walletPage = new WalletPage(page);

  });

  test("validate that wallet page is loaded", async ({ page }) => {
    await walletPage.goToWalletPage();
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/?/); // https://caddy/ or http://localhost:4000

    await expect(walletPage.hiveTokenLabel).toHaveText("Hive");
    await expect(walletPage.hiveTokensLiquidPlatformTokenLabel).toBeVisible();
    await expect(walletPage.hivePowerTokenLabel).toHaveText("Hive power");
    await expect(walletPage.hiveTokensVestingInfluenceTokenLabel).toBeVisible();
    await expect(walletPage.hiveTokenHBDLabel).toHaveText("HBD");
    await expect(walletPage.hiveTokensSeeksPriceStabilityWithUSD).toBeVisible();
  });

  // test("move to the login dialog", async ({ page }) => {
  //   const loginDialog = new LoginToVoteDialog(page);

  //   await walletPage.goToWalletPage();
  //   await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/?/); // https://caddy/ or http://localhost:4000

  //   await walletPage.hiveWalletLoginButton.click();
  //   await loginDialog.validateLoginToVoteDialogIsVisible();
  //   await loginDialog.closeLoginDialog();
  // });
});

test.describe("Wallet page of @gtg tests", () => {
  let walletPage: WalletPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    walletPage = new WalletPage(page);
    homePage = new HomePage(page);
  });

  test("validate that wallet of @gtg page is loaded", async ({ page }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await expect(walletPage.balancesTab).toBeVisible();
  });

  test("validate hive balances on @gtg wallet page is visible", async ({
    page,
  }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    await expect(
      await walletPage.walletHiveDescription.textContent()
    ).toContain(
      "Tradeable tokens that may be transferred anywhere at anytime."
    );
    await expect(await walletPage.walletHiveValue).toBeVisible();
  });

  test("validate hive power balances on @gtg wallet page is visible", async ({
    page,
  }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    await expect(
      await walletPage.walletHivePowerDescription.textContent()
    ).toContain(
      "Part of gtg's HIVE POWER is currently delegated. Delegation is donated for influence or to help new users perform actions on Hive."
    );
    await expect(await walletPage.walletHivePowerValue).toBeVisible();
  });

  test("validate hive dollars balances on @gtg wallet page is visible", async ({
    page,
  }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    await expect(
      await walletPage.walletHiveDollarsDescription.textContent()
    ).toContain(
      "Tradeable tokens that may be transferred anywhere at anytime."
    );
    await expect(await walletPage.walletHiveDollarsValue).toBeVisible();
  });

  test("validate hive savings balances on @gtg wallet page is visible", async ({
    page,
  }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    await expect(
      await walletPage.walletSavingsDescription.textContent()
    ).toContain(
      "Balances subject to 3 day withdraw waiting period. HBD interest rate: 20.00% APR"
    );
    await expect(await walletPage.walletSavingsHiveValue).toBeVisible();
    await expect(await walletPage.walletSavingsHbdValue).toBeVisible();
  });

  test("validate estimated account value on @gtg wallet page is visible", async ({
    page,
  }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    await expect(
      await walletPage.walletEstimatedAccountValueDescription.textContent()
    ).toContain(
      "The estimated value is based on an average value of Hive in US dollars."
    );
    await expect(await walletPage.walletEstimatedAccountValue).toBeVisible();
  });

  test("validate filters on @gtg wallet page is visible", async ({ page }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    await expect(walletPage.walletCheckboxOthers).not.toBeChecked();
    await expect(walletPage.walletCheckboxIncoming).not.toBeChecked();
    await expect(walletPage.walletCheckboxOutcoming).not. toBeChecked();
    await expect(walletPage.walletCheckboxExcludeLessThan1).not.toBeChecked();
  });

  test("validate search by user on @gtg wallet page is visible", async ({
    page,
  }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    await expect(walletPage.walletSearchInput).toHaveAttribute(
      "placeholder",
      "username"
    );
    await walletPage.walletSearchInput.fill("unknownuser");
    await expect(walletPage.walletSearchInput).toHaveAttribute(
      "value",
      "unknownuser"
    );
  });

  test("validate searching by unknown user on @gtg wallet page is visible", async ({
    page,
  }) => {
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    await walletPage.walletSearchInput.fill("unknownuser");
    await expect(walletPage.walletSearchInput).toHaveAttribute(
      "value",
      "unknownuser"
    );
    await expect(walletPage.walletAccountHistoryNoTransactionMsg).toHaveText(
      "No transactions found"
    ); // a typo to correct
    await expect(
      await walletPage.getElementCssPropertyValue(
        await walletPage.walletAccountHistoryNoTransactionMsg,
        "color"
      )
    ).toBe("rgb(252, 165, 165)");
  });

  test("validate amount of transactions on @gtg in account history", async ({
    page,
  }) => {
    let apiHelper = new ApiHelper(page);
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );
    const accountHistoryResult = await apiHelper.getAccountHistoryAPI('gtg', -1, 500);
    const accountHistoryUI = await walletPage.walletAccountHistoryRow.all();
    await expect(accountHistoryUI.length).toBe(accountHistoryResult.result.length);
  });

  test("validate first transaction on @gtg in account history", async ({
    page,
  }) => {
    let apiHelper = new ApiHelper(page);
    const username: string = 'gtg';
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );

    const accountHistoryResultAPI = await apiHelper.getAccountHistoryAPI(username, -1, 500);
    const accountHistoryResult = await accountHistoryResultAPI.result.reverse();

    // console.log('Account history result:\n', await accountHistoryResult);

    if (await walletPage.walletAccountHistoryRow.first().isVisible()){
      const firstAccountHistoryOperation = await accountHistoryResult[0][1].op;
      const firstAccountHistoryOperationType: string = await firstAccountHistoryOperation[0];
      const firstAccountHistoryTransfer = await walletPage.walletAccountHistoryRow.first().locator('td > span');

      if (firstAccountHistoryOperationType == "claim_reward_balance"){
        await expect(firstAccountHistoryTransfer).toContainText('Claim rewards');
      } else if (firstAccountHistoryOperationType == "transfer"){
        const firstAccountHistoryOperationTo = await firstAccountHistoryOperation[1].to;
        const firstAccountHistoryOperationFrom = await firstAccountHistoryOperation[1].from;
        if(firstAccountHistoryOperationTo == username){
          await expect(firstAccountHistoryTransfer).toContainText('Received');
        }
        if(firstAccountHistoryOperationFrom == username){
          await expect(firstAccountHistoryTransfer).toContainText('Transfer');
        }
      } else if (firstAccountHistoryOperationType == "transfer_from_savings"){
        await expect(firstAccountHistoryTransfer).toContainText('Transfer from savings');
      } else if (firstAccountHistoryOperationType == "transfer_to_savings"){
        await expect(firstAccountHistoryTransfer).toContainText('Transfer to savings');
      } else if (firstAccountHistoryOperationType == "transfer_to_vesting"){
        await expect(firstAccountHistoryTransfer).toContainText(/^(Receive|Transfer)/);
      } else if (firstAccountHistoryOperationType == "interest"){
        await expect(firstAccountHistoryTransfer).toContainText('Receive interest of');
      } else if (firstAccountHistoryOperationType == "cancel_transfer_from_savings"){
        await expect(firstAccountHistoryTransfer).toContainText('Cancel transfer from savings');
      } else if (firstAccountHistoryOperationType == "fill_order"){
        await expect(firstAccountHistoryTransfer).toContainText('Paid');
      } else {
        console.log("Other transaction!!! - Check it!");
      }
    } else {
      await expect(await walletPage.walletAccountHistoryNoTransactionMsg).toContainText('No transactions found');
    }
  });

  test("validate delegations on @blocktrades in wallet", async ({
    page,
  }) => {
    let apiHelper = new ApiHelper(page);
    const username: string = 'blocktrades';
    await walletPage.goToWalletPageOfUser(`@${username}`);
    await expect(walletPage.page.url()).toMatch(
      /https?:\/\/[\w\.]+(:\d{1,5})?\/@blocktrades\/transfers/
    );
    await walletPage.page.waitForSelector(
      await walletPage.walletSearchInput["_selector"]
    );

    await walletPage.delegationsTab.click();
    await walletPage.page.waitForSelector(await walletPage.walletDelegationItem["_selector"]);

    const vestingDelegationAPI = await apiHelper.getVestingDelegationsAPI("blocktrades", "", 50);
    const vestingDelegationAPILength = await vestingDelegationAPI.result.length;
    // console.log('vesting delegation api response ', await vestingDelegationAPI, await vestingDelegationAPILength);

    expect((await walletPage.walletDelegationItem.all()).length).toBe(vestingDelegationAPILength);
  });

  test('Wallet page - translation polish', async({page}) =>{
    await walletPage.goToWalletPageOfUser("@gtg");
    await expect(page.locator('.container.p-0').last()).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await expect(page.locator('.container.p-0').last()).toBeVisible()
    await expect(page.getByTestId('wallet-balances-link')).toHaveText('Salda')
    await expect(page.getByRole('link', { name: 'Delegacje' })).toBeVisible()
    await expect(page.getByTestId('wallet-hive-description')).toHaveText('Zbywalne tokeny, które mogą być przesłane gdziekolwiek w dowolnym momencie. HIVE mogą zostać również przekonwertowane na HIVE POWER w procesie nazywanym zwiększenie mocy.')
    await expect(page.getByTestId('wallet-hive-power-description')).toContainText('Tokeny wpływu, które zwiększają Twój wpływ na podział wypłat za publikowanie treści, oraz pozwalają Ci zarabiać na głosowaniu na treści. Część z Twoich jednostek wpływu HIVE POWER jest Ci oddelegowana. Delegowanie jednostek to czasowe użyczenie dla zwiększenia wpływu lub by pomóc nowym użytkownikom platformy w korzystaniu ze Hive. Kwota oddelegowanych jednostek może się zmieniać w czasie. ')
    await expect(page.getByTestId('wallet-account-history-description')).toContainText('Uważaj na spam i linki phishingowe w notatkach transakcji. Nie otwieraj linków od użytkowników, którym nie ufasz. Nie udostępniaj swoich kluczy prywatnych żadnym stronom internetowym osób trzecich. Transakcje nie zostaną wyświetlone, dopóki nie zostaną potwierdzone w blockchain, co może zająć kilka minut.')
  })
});
