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

  test('validate the styles of the row description of the proposal card in the light mode', async ({
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
    // text and color style of status tag
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalStatusTag.locator('span').first(),
        'color'
      )
    ).toBe('rgb(220, 38, 38)');
    expect(
      await proposalsPage.getElementCssPropertyValue(
        await proposalsPage.proposalStatusTag.locator('span').first(),
        'border-color'
      )
    ).toBe('rgb(220, 38, 38)');

    await expect(proposalsPage.proposalStatusTag.locator('span').first()).toHaveText('started');
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
