import { Locator, expect, test } from '@playwright/test';
import { WitnessesPage } from '../support/pages/witnessesPage';
import { LoginToVoteDialog } from '../support/pages/loginToVoteDialog';
import { ApiHelper } from '../support/apiHelper';
import { HomePage } from '../../../../blog/playwright/tests/support/pages/homePage';
import { WitnessPage } from '../../../../blog/playwright/tests/support/pages/witnessesPage';
import { ConfirmAccountWitnessProxyDialog } from '../support/pages/confirmAccountWitnessProxyDialog';
import { getRoundedAbbreveration } from '@hive/ui/lib/utils';
import moment from 'moment';
import Big from 'big.js';

test.describe('Witnesses page tests', () => {
  let witnessesPage: WitnessesPage;
  let witnessPage: WitnessPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    witnessesPage = new WitnessesPage(page);
    witnessPage = new WitnessPage(page);
    homePage = new HomePage(page);
  });

  test('validate the Witness page is loaded', async ({ page }) => {
    await witnessesPage.goToWitnessesPage();
  });

  test('validate the witness description header', async ({ page }) => {
    await witnessesPage.goToWitnessesPage();
    await expect(witnessesPage.witnessHeaderDescription).toContainText(
      'the first 100 witnesses are unfiltered'
    );
    await expect(witnessesPage.witnessHeaderDescription).toContainText(
      'Past the rank of 100, witnesses will be filtered out of the list'
    );
    await expect(witnessesPage.witnessHeaderDescription).toContainText(
      'if they have not produced any block for the last 30 days'
    );
  });

  test('validate the number of displayed Witnesses and their names', async ({
                                                                              page
                                                                            }) => {
    let apiHelper = new ApiHelper(page);
    const LAST_BLOCK_AGE_THRESHOLD_IN_SEC = 2592000;
    const resDynamicGlobalProperties =
      await apiHelper.getDynamicGlobalPropertiesAPI();
    const headBlock = await resDynamicGlobalProperties.result.head_block_number;
    const resWitnessesByVote = await apiHelper.getListWitnessesByVoteAPI(
      '',
      250
    );

    await witnessesPage.goToWitnessesPage();

    let witnessLastBlockAgeInSecs: number = 0;
    let witnessLinkNameUIArray: Locator[];
    witnessLinkNameUIArray = await witnessesPage.witnessNameLink.all();

    let witnessByVoteAPIArray: string[] = [];

    for (let i = 0; i < 250; i++) {
      if (i >= 0 && i < 101) {
        witnessByVoteAPIArray.push(await resWitnessesByVote.result[i].owner);
      }
      if (i >= 101 && i < 250) {
        witnessLastBlockAgeInSecs =
          (headBlock -
            (await resWitnessesByVote.result[i].last_confirmed_block_num)) *
          3;

        if (witnessLastBlockAgeInSecs < LAST_BLOCK_AGE_THRESHOLD_IN_SEC) {
          witnessByVoteAPIArray.push(await resWitnessesByVote.result[i].owner);
        }
      }
    }
    // Validate the length of UI witness elements and specific witnesses from api are equal
    // Displayed witnesses from api are calculated:
    // - first 101 from api is displayed
    // - next witness are displayed if last block age in secs is less than 30 days
    expect(witnessLinkNameUIArray.length).toBe(witnessByVoteAPIArray.length);
    for (let i = 0; i < witnessLinkNameUIArray.length; i++) {
      expect(await witnessLinkNameUIArray[i].textContent()).toBe(
        witnessByVoteAPIArray[i]
      );
    }
  });

  test('validate table\'s header in the witnesses rank', async ({ page }) => {
    await witnessesPage.goToWitnessesPage();
    const rankTableHeaderThElements: Locator[] =
      await witnessesPage.witnessTableHead.locator('th').all();
    const rankTableHeaderNames: string[] = await witnessesPage.witnessTableHead
      .locator('th')
      .allTextContents();

    // Validate names of the table's headers
    let i: number = 0;
    for await (let tableHeaderName of rankTableHeaderNames) {
      expect(tableHeaderName).toBe(rankTableHeaderNames[i]);
      i++;
    }
    // Validate styles of column names
    for await (let tableHeaderThElementLocator of rankTableHeaderThElements) {
      expect(
        await witnessesPage.getElementCssPropertyValue(
          tableHeaderThElementLocator,
          'color'
        )
      ).toBe('rgb(15, 23, 42)');
    }
    // Validate table's head background-color
    expect(
      await witnessesPage.getElementCssPropertyValue(
        witnessesPage.witnessTableHead,
        'background-color'
      )
    ).toBe('rgb(244, 244, 245)');
  });

  test('validate table\'s header in the witnesses rank in the dark mode', async ({ page }) => {
    let homePage = new HomePage(page);

    await witnessesPage.goToWitnessesPage();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    const rankTableHeaderThElements: Locator[] =
      await witnessesPage.witnessTableHead.locator('th').all();
    const rankTableHeaderNames: string[] = await witnessesPage.witnessTableHead
      .locator('th')
      .allTextContents();

    // Validate names of the table's headers
    let i: number = 0;
    for await (let tableHeaderName of rankTableHeaderNames) {
      expect(tableHeaderName).toBe(rankTableHeaderNames[i]);
      i++;
    }
    // Validate styles of column names
    for await (let tableHeaderThElementLocator of rankTableHeaderThElements) {
      expect(
        await witnessesPage.getElementCssPropertyValue(
          tableHeaderThElementLocator,
          'color'
        )
      ).toBe('rgb(225, 231, 239)');
    }
    // Validate table's head background-color
    expect(
      await witnessesPage.getElementCssPropertyValue(
        witnessesPage.witnessTableHead,
        'background-color'
      )
    ).toBe('rgb(15, 23, 42)');
  });

  test('validate first witness in the witness\'s rank list', async ({
                                                                      page
                                                                    }) => {
    let apiHelper = new ApiHelper(page);

    await witnessesPage.goToWitnessesPage();

    const resWitnessesByVoteAPI = await apiHelper.getListWitnessesByVoteAPI(
      '',
      250
    );
    const lastConfirmedBlockNum =
      await resWitnessesByVoteAPI.result[0].last_confirmed_block_num.toString();
    // Validate last confirmed block number
    expect(await witnessesPage.witnessLastBlockNumber.first()).toBeVisible();
    // Below assertion is too unstable
    // expect(await witnessesPage.witnessLastBlockNumber.first().textContent()).toContain(await lastConfirmedBlockNum);

    const witnessCreatedAPI = await resWitnessesByVoteAPI.result[0].created;
    // Validate Witness's age
    expect(await witnessesPage.witnessCreated.first().textContent()).toContain(
      moment().from(witnessCreatedAPI, true)
    );

    // Validate Witness external site
    const firstWitnessUrl = await resWitnessesByVoteAPI.result[0].url;
    await expect(
      witnessesPage.witnessExternalSiteLink.locator('a').first()
    ).toHaveAttribute('href', firstWitnessUrl);

    // Validate Witness votes received
    const resDynamicGlobalProperties =
      await apiHelper.getDynamicGlobalPropertiesAPI();
    const totalVesting =
      await resDynamicGlobalProperties.result.total_vesting_fund_hive.replace(
        / HIVE/g,
        ''
      );
    const totalShares =
      await resDynamicGlobalProperties.result.total_vesting_shares.replace(
        / VESTS/g,
        ''
      );
    const witnessVotesAPI = await resWitnessesByVoteAPI.result[0].votes;
    const vestsToHp: Big = Big(
      Big(totalVesting).times(Big(witnessVotesAPI).div(Big(totalShares)))
    ).div(1000000);
    expect(await witnessesPage.witnessVotesReceived.first().textContent()).toBe(
      getRoundedAbbreveration(vestsToHp) + ' HP'
    );

    // Validate Witness price feed
    const firstWitnessPriceFeed =
      await resWitnessesByVoteAPI.result[0].hbd_exchange_rate.base.replace(
        / HBD/g,
        ''
      );
    expect('$' + firstWitnessPriceFeed).toContain(
      await witnessesPage.witnessPriceFeed.first().textContent()
    );
  });

  // It works on localhost but in CI it cannot move to the new domain page
  test.skip('move to the profile page of the first witness by clicking avatar', async ({
                                                                                         page
                                                                                       }) => {
    await witnessesPage.goToWitnessesPage();

    const pagePromise = page.context().waitForEvent('page');

    const firstWitnessName = await witnessesPage.witnessNameLink
      .first()
      .textContent();

    await witnessesPage.witnessAvatar.first().click();

    const newPage = await pagePromise;

    let reUrl = new RegExp(`http:\/\/\\w+:3000/@${firstWitnessName}`);
    expect(newPage.url()).toMatch(reUrl);
  });

  // It works on localhost but in CI it cannot move to the new domain page
  test.skip('move to the profile page of the first witness by clicking name link', async ({
                                                                                            page
                                                                                          }) => {
    await witnessesPage.goToWitnessesPage();

    const pagePromise = page.context().waitForEvent('page');

    const firstWitnessName = await witnessesPage.witnessNameLink
      .first()
      .textContent();

    await witnessesPage.witnessNameLink.first().click();

    const newPage = await pagePromise;

    let reUrl = new RegExp(`http:\/\/\\w+:3000/@${firstWitnessName}`);
    expect(newPage.url()).toMatch(reUrl);
  });

  // Skip this test due to problems with nodes of hiveblocks.com
  test.skip('move to the block explorer by clicking last block link', async ({
                                                                               page
                                                                             }) => {
    await witnessesPage.goToWitnessesPage();

    const firstWitnesslastBlockNumber =
      await witnessesPage.witnessLastBlockNumber.first().textContent();
    await witnessesPage.witnessLastBlockNumber.first().click();

    let reUrl = new RegExp(
      `https:\/\/hiveblocks.com\/b\/${firstWitnesslastBlockNumber
        ?.toString()
        .replace(/#/g, '')}`
    );
    expect(page.url()).toMatch(reUrl);
  });

  test('validate witness vote box', async ({ page }) => {
    await witnessesPage.goToWitnessesPage();

    const voteBoxDescription = await witnessesPage.witnessVoteBox.locator('p');
    const voteBoxInput =
      await witnessesPage.witnessVoteBox.locator('div input');
    const voteBoxButton =
      await witnessesPage.witnessVoteBox.locator('div button');

    await expect(voteBoxDescription).toHaveText(
      'If you would like to vote for a witness outside of the top 200, enter the account name below to cast a vote.'
    );
    await expect(voteBoxInput).toBeVisible();
    await expect(voteBoxInput).toHaveAttribute('value', '');
    await expect(voteBoxButton).toHaveText('vote');
    expect(
      await witnessesPage.getElementCssPropertyValue(voteBoxButton, 'color')
    ).toBe('rgb(248, 250, 252)');
    expect(
      await witnessesPage.getElementCssPropertyValue(
        voteBoxButton,
        'background-color'
      )
    ).toBe('rgb(255, 0, 0)');
  });

  test('validate witness vote box in the dark mode', async ({ page }) => {
    let homePage = new HomePage(page);

    await witnessesPage.goToWitnessesPage();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    const voteBoxDescription = await witnessesPage.witnessVoteBox.locator('p');
    const voteBoxInput =
      await witnessesPage.witnessVoteBox.locator('div input');
    const voteBoxButton =
      await witnessesPage.witnessVoteBox.locator('div button');

    await expect(voteBoxDescription).toHaveText(
      'If you would like to vote for a witness outside of the top 200, enter the account name below to cast a vote.'
    );
    await expect(voteBoxInput).toBeVisible();
    await expect(voteBoxInput).toHaveAttribute('value', '');
    await expect(voteBoxButton).toHaveText('vote');
    expect(
      await witnessesPage.getElementCssPropertyValue(voteBoxButton, 'color')
    ).toBe('rgb(248, 250, 252)');
    expect(
      await witnessesPage.getElementCssPropertyValue(
        voteBoxButton,
        'background-color'
      )
    ).toBe('rgb(129, 29, 29)');
    expect(
      await witnessesPage.getElementCssPropertyValue(voteBoxInput, 'color')
    ).toBe('rgb(225, 231, 239)');
    expect(
      await witnessesPage.getElementCssPropertyValue(
        voteBoxInput,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
  });

  test('validate witness proxy box', async ({ page }) => {
    await witnessesPage.goToWitnessesPage();

    const proxyBoxDescription =
      await witnessesPage.witnessSetProxyBox.locator('p');
    const proxyBoxInput =
      await witnessesPage.witnessSetProxyBox.locator('div input');
    const proxyBoxButton =
      await witnessesPage.witnessSetProxyBox.locator('div button');

    await expect(proxyBoxDescription).toHaveText(
      'You can also choose a proxy that will vote for witnesses for you. This will reset your current witness selection.'
    );
    await expect(proxyBoxInput).toBeVisible();
    expect(
      await witnessesPage.getElementCssPropertyValue(
        proxyBoxButton,
        'border-color'
      )
    ).toBe('rgb(226, 232, 240)');
    await expect(proxyBoxButton).toHaveText('Set proxy');
    expect(
      await witnessesPage.getElementCssPropertyValue(proxyBoxButton, 'color')
    ).toBe('rgb(248, 250, 252)');
    expect(
      await witnessesPage.getElementCssPropertyValue(
        proxyBoxButton,
        'background-color'
      )
    ).toBe('rgb(255, 0, 0)');
  });

  test('validate highlighting witnesses by clicking link', async ({ page }) => {
    await witnessesPage.goToWitnessesPage();

    const voteBoxInput =
      await witnessesPage.witnessVoteBox.locator('div input');
    const witnessHighlightLink =
      await witnessesPage.witnessHighlightLink.first();
    const firstWitnessTableRow = await witnessesPage.witnessTableBody
      .locator('tr')
      .first();

    // Validate the tooltip message of highlight link after hovering
    expect(await witnessHighlightLink).toHaveAttribute('title', "Use this for linking to this page and highlight the selected witness");

    // Validate background-color of the first row in the rand witness table
    expect(
      await witnessesPage.getElementCssPropertyValue(
        firstWitnessTableRow,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    await witnessHighlightLink.click();
    await page.waitForTimeout(1000);
    // Validate background-color of the first row in the rand witness table after clicking highlight link
    expect(
      await witnessesPage.getElementCssPropertyValue(
        firstWitnessTableRow,
        'background-color'
      )
    ).toBe('rgb(254, 205, 211)');

    // Validate the witness name was typed into the input vote
    const firstWitnessName: any = await witnessesPage.witnessNameLink
      .first()
      .textContent();
    await expect(voteBoxInput).toHaveAttribute('value', firstWitnessName);
  });

  test('validate highlighting witnesses by clicking link in the dark mode', async ({ page }) => {
    let homePage = new HomePage(page);

    await witnessesPage.goToWitnessesPage();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    const voteBoxInput =
      await witnessesPage.witnessVoteBox.locator('div input');
    const witnessHighlightLink =
      await witnessesPage.witnessHighlightLink.first();
    const firstWitnessTableRow = await witnessesPage.witnessTableBody
      .locator('tr')
      .first();

    // Validate the tooltip message of highlight link after hovering
    expect(await witnessHighlightLink).toHaveAttribute('title', "Use this for linking to this page and highlight the selected witness");

    // Validate background-color of the first row in the rand witness table
    expect(
      await witnessesPage.getElementCssPropertyValue(
        firstWitnessTableRow,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    await witnessHighlightLink.click();
    await page.waitForTimeout(1000);
    // Validate background-color of the first row in the rand witness table after clicking highlight link
    expect(
      await witnessesPage.getElementCssPropertyValue(
        firstWitnessTableRow,
        'background-color'
      )
    ).toBe('rgb(159, 18, 57)');
    // Validate color of the witness's nickname
    expect(
      await witnessesPage.getElementCssPropertyValue(
        witnessesPage.witnessNameLink.first().locator('div'),
        'color'
      )
    ).toBe('rgb(239, 68, 68)');
    // Validate color of the witness's votes received
    expect(
      await witnessesPage.getElementCssPropertyValue(
        witnessesPage.witnessVotesReceived.first(),
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    // Validate the witness name was typed into the input vote
    const firstWitnessName: any = await witnessesPage.witnessNameLink
      .first()
      .textContent();
    await expect(voteBoxInput).toHaveAttribute('value', firstWitnessName);
    // Validate color of the witness's open external site before hovering
    expect(
      await witnessesPage.getElementCssPropertyValue(
        witnessesPage.witnessExternalSiteLink.first().locator('a span'),
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    // Validate color of the witness's open external site after hovering
    await witnessesPage.witnessExternalSiteLink.first().locator('a span').hover();
    expect(
      await witnessesPage.getElementCssPropertyValue(
        witnessesPage.witnessExternalSiteLink.first().locator('a span'),
        'color'
      )
    ).toBe('rgb(248, 113, 113)');

  });

  test('move to the login dialog by clicking vote icon of the first witness', async ({
                                                                                       page
                                                                                     }) => {
    let loginDialog = new LoginToVoteDialog(page);
    await witnessesPage.goToWitnessesPage();

    await witnessesPage.witnessVoteIcon.first().click();
    await loginDialog.validateLoginToVoteDialogIsVisible();
    await loginDialog.closeLoginDialog();
    await expect(witnessesPage.witnessTitle).toHaveText('Witness Voting');
    await expect(witnessesPage.witnessTableBody).toBeVisible();
  });

  test('move to the login dialog by clicking vote button', async ({ page }) => {
    let loginDialog = new LoginToVoteDialog(page);
    const voteBoxButton =
      await witnessesPage.witnessVoteBox.locator('div button');

    await witnessesPage.goToWitnessesPage();

    await voteBoxButton.click();
    await loginDialog.validateLoginToVoteDialogIsVisible();
    await loginDialog.closeLoginDialog();
    await expect(witnessesPage.witnessTitle).toHaveText('Witness Voting');
    await expect(witnessesPage.witnessTableBody).toBeVisible();
  });

  test('move to the confirm account witness proxy dialog by clicking Set proxy button', async ({ page }) => {
    let confirmAccountWitnessProxyDialog = new ConfirmAccountWitnessProxyDialog(page);

    const proxyBoxButton =
      await witnessesPage.witnessSetProxyBox.locator('div button');

    await witnessesPage.goToWitnessesPage();
    await proxyBoxButton.click();
    await confirmAccountWitnessProxyDialog.validateConfirmProxyDialogIsVisible();
    await confirmAccountWitnessProxyDialog.closeConfirmProxyDialog();
    await expect(witnessesPage.witnessTitle).toHaveText('Witness Voting');
    await expect(witnessesPage.witnessTableBody).toBeVisible();
  });

  test('click ok button on the confirm account witness proxy dialog and move to the login dialog', async ({ page }) => {
    let loginDialog = new LoginToVoteDialog(page);
    let confirmAccountWitnessProxyDialog = new ConfirmAccountWitnessProxyDialog(page);

    const proxyBoxButton =
      await witnessesPage.witnessSetProxyBox.locator('div button');

    await witnessesPage.goToWitnessesPage();
    await proxyBoxButton.click();
    await confirmAccountWitnessProxyDialog.validateConfirmProxyDialogIsVisible();
    await confirmAccountWitnessProxyDialog.clickOkButtonInConfirmProxyDialog();
    await loginDialog.validateLoginToVoteDialogIsVisible();
    await loginDialog.closeLoginDialog();
    await confirmAccountWitnessProxyDialog.validateConfirmProxyDialogIsVisible();
    await confirmAccountWitnessProxyDialog.clickCancelButtonInConfirmProxyDialog();
    await expect(witnessesPage.witnessTitle).toHaveText('Witness Voting');
    await expect(witnessesPage.witnessTableBody).toBeVisible();
  });

  test('Witnesses page - translation', async ({page}) =>{
    await witnessesPage.goToWitnessesPage();
    await expect(witnessPage.witnessHeaderTitle).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu).toBeVisible()
    await page.getByRole('menuitem', { name: 'pl' }).click()
    await expect(witnessPage.witnessHeaderTitle).toBeVisible()
    await expect(await witnessPage.witnessHeaderTitle.textContent()).toBe('Głosowanie na delegatów')
    await expect(await witnessPage.witnessHeaderDescription.textContent()).toBe(
    'Na poniższej liście znajduje sie 100 pierwszych delegatów, aktywnych jak również nieaktywnych. Każdy delegat powyżej 100 pozycji jest filtrowany i nie wyświetlany jeśli nie wyprodukował bloku w ostatnich 30 dniach.')
    await expect(page.getByRole('button', { name: 'Zagłosuj' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ustaw pełnomocnika' })).toBeVisible()
  })

});
