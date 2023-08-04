import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { WitnessPage } from '../support/pages/witnessesPage';
import { ProfilePage } from '../support/pages/profilePage';
import { ApiHelper } from '../support/apiHelper';

import Big from 'big.js';

// -------------------------------------------------------------------------------------
// Below test were passing but due to back to the old view of hive blog are skipped.
// -------------------------------------------------------------------------------------
test.describe.skip('Witnesses page tests', () => {
  let homePage: HomePage;
  let witnessPage: WitnessPage;
  let profilePage: ProfilePage;
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    witnessPage = new WitnessPage(page);
    profilePage = new ProfilePage(page);
    apiHelper = new ApiHelper(page);
  });

  test('move to the Witnesses page from the Home page', async ({ page }) => {
  
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();
  });

  test('validate witness page header', async ({ page }) => {
  
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();

    await witnessPage.validateWitnessHeaderTitle();
    await witnessPage.validateWitnessHeaderVote();
    await witnessPage.validateWitnessHeaderDescription();
  });

  test('validate number of displayed witnesses', async ({ page }) => {

    await homePage.goto();
    await homePage.moveToNavWitnessesPage();

    // expected 120 witnesses
    await witnessPage.validateWitnessListMembers();
  });

  test('validate the voting box is visible', async ({ page }) => {
    
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();

    await witnessPage.validateWitnessVotingBoxStyleText();
  });

  test('validate the set proxy box is visible', async ({ page }) => {
    
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();

    await witnessPage.validateWitnessSetProxyBoxStyleText();
  });

  test('validate the witnesses table head visible', async ({ page }) => {
   
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();

    await witnessPage.validateWitnessTableHeadStyleText();
  });

  test('validate info about first witness', async ({ page }) => {
    
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();

    // First witness's info from API
    const firstWitnessInfoAPI = (await apiHelper.getListWitnessesByVoteAPI('', 5)).result[0]; // blocktrades expected
    const nameFirstWitnessAPI = await firstWitnessInfoAPI.owner;
    const lastConfirmedBlockNumberOfFirstWitnessAPI = await firstWitnessInfoAPI.last_confirmed_block_num;
    const runningVersionOfFirstWitnessAPI = await firstWitnessInfoAPI.running_version;
    const priceFeedOfFirstWitnessAPI = await firstWitnessInfoAPI.hbd_exchange_rate.base;

    expect(nameFirstWitnessAPI).toBe(await witnessPage.firstWitnessNameLink.textContent());
    expect('#' + lastConfirmedBlockNumberOfFirstWitnessAPI).toBe(
      await witnessPage.firstWitnessLastBlockNumberLink.textContent()
    );
    expect(await witnessPage.firstWitnessRunningVersion.textContent()).toContain(
      runningVersionOfFirstWitnessAPI
    );

    // Price feed for first witness
    const priceFeedFrontEnd: any = await witnessPage.firstWitnessPriceFeed.innerText();
    const priceFeedString: any = await priceFeedFrontEnd.match(/\d.(\d){1,3}/g)[0];
    const priceFeedOfFirstWitnessAPIString: any = await priceFeedOfFirstWitnessAPI.match(/\d.(\d){1,3}/g)[0];
    expect(await priceFeedOfFirstWitnessAPIString).toBe(await priceFeedString);

    // Calculate Votes received in HP
    const totalVestingFoundHiveAPI = (await apiHelper.getDynamicGlobalPropertiesAPI()).result
      .total_vesting_fund_hive;
    const totalVestingSharesAPI = (await apiHelper.getDynamicGlobalPropertiesAPI()).result
      .total_vesting_shares;
    const witnesVotesAPI = await firstWitnessInfoAPI.votes;
    const totalVestingFoundHiveAPIBig = Big(totalVestingFoundHiveAPI.match(/(\d)+.(\d)+/g)[0]);
    const totalVestingSharesAPIBig = Big(totalVestingSharesAPI.match(/(\d)+.(\d)+/g)[0]);
    const witnesVotesAPIBig = Big(witnesVotesAPI);

    const votesReceived = Big(
      totalVestingFoundHiveAPIBig.times(Big(witnesVotesAPIBig).div(totalVestingSharesAPIBig))
    ).div(1000000);

    await expect(await witnessPage.firstWitnessVotesReceived.textContent()).toContain(
      Big(votesReceived).div(1000000).toNumber().toPrecision(4).toString()
    );
  });

  test('highlight the selected witness and validate typeing his name to vote input', async ({ page }) => {
   
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();

    // Click the highlight link of the first witness
    await witnessPage.firstWitnessHighLightLink.click();
    await witnessPage.page.waitForTimeout(1000);
    const inputValueVoteBox = await witnessPage.page.$eval(
      await witnessPage.witnessesVoteBoxInput['_selector'],
      (el) => el.value
    );
    expect(inputValueVoteBox).toBe(await witnessPage.firstWitnessNameLink.textContent());
    expect(
      await witnessPage.getElementCssPropertyValue(witnessPage.firstWitnessListMemberRow, 'background-color')
    ).toBe('rgb(252, 165, 165)');

    // Click the highlight link of the first witness again
    // Expected empty string inside input value
    await witnessPage.firstWitnessHighLightLink.click();
    await witnessPage.page.waitForTimeout(1000);
    const inputValueVoteBoxEmpty = await witnessPage.page.$eval(
      await witnessPage.witnessesVoteBoxInput['_selector'],
      (el) => el.value
    );
    expect(inputValueVoteBoxEmpty).toBe('');
    expect(
      await witnessPage.getElementCssPropertyValue(witnessPage.firstWitnessListMemberRow, 'background-color')
    ).toBe('rgba(0, 0, 0, 0)');
  });

  test('move to the profile page of the first witness', async ({ page }) => {
    
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();

    const witnessName = await witnessPage.firstWitnessNameLink.textContent();
    await witnessPage.firstWitnessNameLink.click();

    await profilePage.page.waitForSelector(profilePage.profileName['_selector']);
    await profilePage.profileNickNameIsEqual(witnessName);
  });

  test('move to the extra side of the first witness', async ({ page }) => {
   
    await homePage.goto();
    await homePage.moveToNavWitnessesPage();
    await witnessPage.page.waitForTimeout(1000);

    const hrefValueFirstWitnessExternalSiteLink = await witnessPage.page.$eval(
      await witnessPage.witnessesExternalSiteLink.first()['_selector'],
      (el) => el.href
    );

    // expected site of blocktrades
    await expect(hrefValueFirstWitnessExternalSiteLink).toBe('https://blocktrades.us/');

    // await witnessPage.witnessesExternalSiteLink.first().click();
    // await witnessPage.page.waitForTimeout(1000);
    // await expect(witnessPage.page).toHaveURL('https://blocktrades.us/en/trade');
  });
});
