import { expect, test, Locator } from '@playwright/test';
import { ProposalsPage } from '../support/pages/proposalsPage';
import { HomePage } from '../support/pages/homePage';
import { PostPage } from '../support/pages/postPage';

test.describe('Proposal page', () => {
  test('validate the poroposals page is loaded', async ({ page }) => {
    const proposalsPage = new ProposalsPage(page);

    await proposalsPage.gotoProposalsPage();
  });

  test('validate the styles of the title of the proposal card in the light mode', async ({ page }) => {
    const proposalsPage = new ProposalsPage(page);

    await proposalsPage.gotoProposalsPage();

    // get title of the first proposal item
    // color of title text
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.firstPorposalItemTitleLinkText,
        'color'
      )
    ).toBe('rgb(220, 38, 38)');
    // color of the proposal item id
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.firstPorposalItemTitleLinkText.locator('span'),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
  });

  test('validate the styles of the title of the proposal card in the dark mode', async ({ page }) => {
    const homePage = new HomePage(page);
    const proposalsPage = new ProposalsPage(page);

    await proposalsPage.gotoProposalsPage();

    // change theme mode to dark
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // get title of the first proposal item
    // color of title text
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.firstPorposalItemTitleLinkText,
        'color'
      )
    ).toBe('rgb(59, 130, 246)');
    // color of the proposal item id
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.firstPorposalItemTitleLinkText.locator('span'),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
  });

  // (Status: Votable, Order By: Total Votes, Order: descending)
  test('validate the styles of the row description of the proposal card in the light mode - default filters', async ({
    page
  }) => {
    const proposalsPage = new ProposalsPage(page);

    await proposalsPage.gotoProposalsPage();

    // get row description
    // color style of dates
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('span').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    // color style HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div > span').first(),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');
    // color style daily HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');

    // Validate status tags of the first proposal in default filters (Status: Votable, Order By: Total Votes, Order: descending)
    await proposalsPage.validateFirstProposalStatusTagsDefaultFilters();
  });

  test('validate the styles of the row description of the proposal card in the light mode - (Status: All, Order By: Total Votes, Order: descending)', async ({
    page
  }) => {
    const proposalsPage = new ProposalsPage(page);

    await proposalsPage.gotoProposalsPage();

    await proposalsPage.selectStatusFilter('All');

    // get row description
    // color style of dates
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('span').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    // color style HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div > span').first(),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');
    // color style daily HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');

    // Validate status tags of the first proposal in custom filters (Status: all, Order By: Total Votes, Order: descending)
    await proposalsPage.validateFirstProposalStatusTagsOfCustomFilters([],30,'by_total_votes', 'descending','all');
  });

  test('validate the styles of the row description of the proposal card in the light mode - (Status: Active, Order By: Total Votes, Order: descending)', async ({
    page
  }) => {
    const proposalsPage = new ProposalsPage(page);

    await proposalsPage.gotoProposalsPage();

    await proposalsPage.selectStatusFilter('Active');

    // get row description
    // color style of dates
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('span').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    // color style HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div > span').first(),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');
    // color style daily HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');

    // Validate status tags of the first proposal in custom filters (Status: active, Order By: Total Votes, Order: descending)
    await proposalsPage.validateFirstProposalStatusTagsOfCustomFilters([],30,'by_total_votes', 'descending','active');
  });

  test('validate the styles of the row description of the proposal card in the light mode - (Status: Inactive, Order By: Total Votes, Order: descending)', async ({
    page
  }) => {
    const proposalsPage = new ProposalsPage(page);

    await proposalsPage.gotoProposalsPage();

    await proposalsPage.selectStatusFilter('Inactive');

    // get row description
    // color style of dates
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('span').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    // color style HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div > span').first(),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');
    // color style daily HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');

    // Validate status tags of the first proposal in custom filters (Status: inactive, Order By: Total Votes, Order: descending)
    await proposalsPage.validateFirstProposalStatusTagsOfCustomFilters([],30,'by_total_votes', 'descending','inactive');
  });

  test('validate the styles of the row description of the proposal card in the light mode - (Status: Expired, Order By: Total Votes, Order: descending)', async ({
    page
  }) => {
    const proposalsPage = new ProposalsPage(page);

    await proposalsPage.gotoProposalsPage();

    await proposalsPage.selectStatusFilter('Expired');

    // get row description
    // color style of dates
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('span').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
    // color style HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div > span').first(),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');
    // color style daily HBD
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalItemRowDescription.locator('div').first(),
        'color'
      )
    ).toBe('rgb(100, 116, 139)');

    // Validate status tags of the first proposal in custom filters (Status: inactive, Order By: Total Votes, Order: descending)
    await proposalsPage.validateFirstProposalStatusTagsOfCustomFilters([],30,'by_total_votes', 'descending','expired');
  });



  test('move to the post content of the first propolas in the default proposals page', async ({ page }) => {
    const proposalsPage = new ProposalsPage(page);
    const postPage = new PostPage(page);

    await proposalsPage.gotoProposalsPage();

    const firstProposalName = await proposalsPage.firstPorposalItemTitleLinkText.textContent();
    // click title of the first proposal
    await proposalsPage.proposalItemTitleLink.first().click();
    expect(firstProposalName).toContain(await postPage.articleTitle.textContent());
  });

});
