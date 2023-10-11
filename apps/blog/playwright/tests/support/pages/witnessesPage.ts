import { Locator, Page, expect } from '@playwright/test';

export class WitnessPage {
  readonly page: Page;
  readonly witnessHeaderTitle: Locator;
  readonly witnessHeaderVote: Locator;
  readonly witnessHeaderVoteRemaining: Locator;
  readonly witnessHeaderDescription: Locator;
  readonly witnessesTableHead: Locator;
  readonly witnessesTableBody: Locator;
  readonly witnessesListMembers: Locator;
  readonly witnessesListItemInfo: Locator;
  readonly witnessesExternalSiteLink: Locator;
  readonly witnessesVoteBox: Locator;
  readonly witnessesVoteBoxParagraf: Locator;
  readonly witnessesVoteBoxAtIcon: Locator;
  readonly witnessesVoteBoxInput: Locator;
  readonly witnessesVoteBoxButton: Locator;
  readonly witnessesSetProxyBox: Locator;
  readonly witnessesSetProxyBoxParagraf: Locator;
  readonly witnessesSetProxyBoxAtIcon: Locator;
  readonly witnessesSetProxyBoxInput: Locator;
  readonly witnessesSetProxyBoxButton: Locator;
  readonly firstWitnessNameLink: Locator;
  readonly firstWitnessLastBlockNumberLink: Locator;
  readonly firstWitnessRunningVersion: Locator;
  readonly firstWitnessPriceFeed: Locator;
  readonly witnessHighLightLinks: Locator;
  readonly firstWitnessHighLightLink: Locator;
  readonly firstWitnessListMemberRow: Locator;
  readonly witnessesVotesReceived: Locator;
  readonly firstWitnessVotesReceived: Locator;

  constructor(page: Page) {
    this.page = page;
    this.witnessHeaderTitle = page.locator('[data-testid="witness-header"]');
    this.witnessHeaderVote = page.locator('[data-testid="witness-header-vote"]');
    this.witnessHeaderVoteRemaining = page.locator('[data-testid="witness-header-vote-remaining"]');
    this.witnessHeaderDescription = page.locator('[data-testid="witness-header-description"]');
    this.witnessesTableHead = page.locator('[data-testid="witness-table-head"]');
    this.witnessesTableBody = page.locator('[data-testid="witness-table-body"]');
    this.witnessesListMembers = this.witnessesTableBody.locator('tr');
    this.witnessesListItemInfo = this.witnessesListMembers.locator('[data-testid="witness-list-item-info"]');
    this.witnessesExternalSiteLink = page.locator('[data-testid="witness-external-site-link"] a');
    this.witnessesVoteBox = page.locator('[data-testid="witnesses-vote-box"]');
    this.witnessesVoteBoxParagraf = this.witnessesVoteBox.locator('p');
    this.witnessesVoteBoxAtIcon = this.witnessesVoteBox.locator('div span');
    this.witnessesVoteBoxInput = this.witnessesVoteBox.locator('input');
    this.witnessesVoteBoxButton = this.witnessesVoteBox.locator('button');
    this.witnessesSetProxyBox = page.locator('[data-testid="witnesses-set-proxy-box"]');
    this.witnessesSetProxyBoxParagraf = this.witnessesSetProxyBox.locator('p');
    this.witnessesSetProxyBoxAtIcon = this.witnessesSetProxyBox.locator('div span');
    this.witnessesSetProxyBoxInput = this.witnessesSetProxyBox.locator('input');
    this.witnessesSetProxyBoxButton = this.witnessesSetProxyBox.locator('button');
    this.firstWitnessListMemberRow = this.witnessesListMembers.first();
    this.firstWitnessNameLink = this.witnessesListItemInfo
      .locator('[data-testid="witness-name-link"]')
      .first();
    this.firstWitnessLastBlockNumberLink = this.witnessesListItemInfo
      .locator('[data-testid="last-block-number"]')
      .first();
    this.firstWitnessRunningVersion = this.firstWitnessLastBlockNumberLink.locator('..');
    this.firstWitnessPriceFeed = page.locator('[data-testid="witness-price-feed"]').first();
    this.witnessHighLightLinks = page.locator('[data-testid="witness-highlight-link"]');
    this.firstWitnessHighLightLink = this.witnessHighLightLinks.first();
    this.witnessesVotesReceived = page.locator('[data-testid="witness-votes-received"]');
    this.firstWitnessVotesReceived = this.witnessesVotesReceived.first();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const bcg = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return bcg;
  }

  async waitForWitnessListItemsLoaded() {
    await this.page.waitForSelector(this.witnessesListItemInfo['_selector']);
  }

  async validateWitnessHeaderTitle() {
    await expect(this.witnessHeaderTitle).toHaveText('Witness Voting');
  }

  async validateWitnessHeaderVote() {
    const witnessHeaderVoteRemainingStyle = await this.getElementCssPropertyValue(
      this.witnessHeaderVoteRemaining,
      'font-weight'
    );

    await expect(this.witnessHeaderVote).toHaveText(
      'You have 30 votes remaining. You can vote for a maximum of 30 witnesses.'
    );
    await expect(witnessHeaderVoteRemainingStyle).toBe('700');
  }

  async validateWitnessHeaderDescription() {
    await expect(this.witnessHeaderDescription).toContainText(
      'the first 100 witnesses are unfiltered, this includes active and inactive witnesses.'
    );
    await expect(this.witnessHeaderDescription).toContainText(
      'if they have not produced any block for the last 30 days.'
    );
  }

  async validateWitnessListMembers() {
    await this.waitForWitnessListItemsLoaded();
    expect(await this.witnessesListMembers.all()).toHaveLength(120);
  }

  async validateWitnessVotingBoxStyleText() {
    // Paragrafe of the voting box
    await expect(this.witnessesVoteBoxParagraf).toHaveText(
      'If you would like to vote for a witness outside of the top 200, enter the account name below to cast a vote.'
    );
    // @ icone of the voting box
    await expect(this.witnessesVoteBoxAtIcon).toHaveCSS('background-color', 'rgb(203, 213, 225)');
    await expect(this.witnessesVoteBoxAtIcon).toHaveCSS('border-width', '1px');
    await expect(this.witnessesVoteBoxAtIcon).toHaveCSS('border-color', 'rgb(0, 0, 0)');
    // input of the voting box
    await expect(this.witnessesVoteBoxInput).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(this.witnessesVoteBoxInput).toHaveCSS('border-width', '1px');
    await expect(this.witnessesVoteBoxInput).toHaveCSS('border-color', 'rgb(226, 232, 240)');
    await expect(this.witnessesVoteBoxInput).toHaveCSS('placeholder', '');
    // button of the voting box
    await expect(this.witnessesVoteBoxButton).toHaveText('VOTE');
    await expect(this.witnessesVoteBoxButton).toHaveCSS('background-color', 'rgb(255, 0, 0)');
    await expect(this.witnessesVoteBoxButton).toHaveCSS('color', 'rgb(248, 250, 252)');
  }

  async validateWitnessSetProxyBoxStyleText() {
    // Paragrafe of set proxy box
    await expect(this.witnessesSetProxyBoxParagraf).toHaveText(
      'You can also choose a proxy that will vote for witnesses for you. This will reset your current witness selection.'
    );
    // @ icone of the set proxy box
    await expect(this.witnessesSetProxyBoxAtIcon).toHaveCSS('background-color', 'rgb(203, 213, 225)');
    await expect(this.witnessesSetProxyBoxAtIcon).toHaveCSS('border-width', '1px');
    await expect(this.witnessesSetProxyBoxAtIcon).toHaveCSS('border-color', 'rgb(0, 0, 0)');
    // input of the set proxy box
    await expect(this.witnessesSetProxyBoxInput).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(this.witnessesSetProxyBoxInput).toHaveCSS('border-width', '1px');
    await expect(this.witnessesSetProxyBoxInput).toHaveCSS('border-color', 'rgb(226, 232, 240)');
    await expect(this.witnessesSetProxyBoxInput).toHaveCSS('placeholder', '');
    // button of the set proxy box
    await expect(this.witnessesSetProxyBoxButton).toHaveText('Set proxy');
    await expect(this.witnessesSetProxyBoxButton).toHaveCSS('background-color', 'rgb(255, 0, 0)');
    await expect(this.witnessesSetProxyBoxButton).toHaveCSS('color', 'rgb(248, 250, 252)');
  }

  async validateWitnessTableHeadStyleText() {
    const expectedListOfColumnNames: string[] = ['Rank', 'Witness', 'Votes received', 'Price feed'];
    const listOfColumnNames: string[] = await this.witnessesTableHead.locator('tr th').allTextContents();

    await expect(listOfColumnNames.toString()).toBe(expectedListOfColumnNames.toString());
    await expect(this.witnessesTableHead).toHaveCSS('background-color', 'rgb(226, 232, 240)');
    await expect(this.witnessesTableHead.locator('th').first()).toHaveCSS('color', 'rgb(15, 23, 42)');
    await expect(this.witnessesTableHead).toHaveCSS('font-weight', '400');
  }
}
