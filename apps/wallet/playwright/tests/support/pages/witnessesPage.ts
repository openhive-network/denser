import { Locator, Page, expect } from "@playwright/test";

export class WitnessesPage {
  readonly page: Page;
  readonly witnessTitle: Locator;
  readonly witnessAvatar: Locator;
  readonly witnessHeaderVoteLabel: Locator;
  readonly witnessHeaderVoteRemaining: Locator;
  readonly witnessHeaderDescription: Locator;
  readonly witnessTableHead: Locator;
  readonly witnessTableBody: Locator;
  readonly witnessListItemInfo: Locator;
  readonly witnessNameLink: Locator;
  readonly witnessHighlightLink: Locator;
  readonly witnessLastBlockNumber: Locator;
  readonly witnessExternalSiteLink: Locator;
  readonly witnessVotesReceived: Locator;
  readonly witnessPriceFeed: Locator;
  readonly witnessVoteBox: Locator;
  readonly witnessSetProxyBox: Locator;
  readonly witnessCreated: Locator;
  readonly witnessVoteIcon: Locator;
  readonly witnessHasNotProducedBlocksWarning: Locator;

  constructor(page: Page) {
    this.page = page;
    this.witnessTitle = page.locator('[data-testid="witness-header"]');
    this.witnessHeaderVoteLabel = page.locator('[data-testid="witness-header-vote"]');
    this.witnessHeaderVoteRemaining = page.locator('[data-testid="witness-header-vote-remaining"]');
    this.witnessHeaderDescription = page.locator('[data-testid="witness-header-description"]');
    this.witnessTableHead = page.locator('[data-testid="witness-table-head"]');
    this.witnessTableBody = page.locator('[data-testid="witness-table-body"]');
    this.witnessListItemInfo = page.locator('[data-testid="witness-list-item-info"]');
    this.witnessAvatar = this.witnessListItemInfo.locator('a');
    this.witnessNameLink = page.locator('[data-testid="witness-name-link"]');
    this.witnessHighlightLink = page.locator('[data-testid="witness-highlight-link"]');
    this.witnessLastBlockNumber = page.locator('[data-testid="last-block-number"]');
    this.witnessExternalSiteLink = page.locator('[data-testid="witness-external-site-link"]');
    this.witnessVotesReceived = page.locator('[data-testid="witness-votes-received"]');
    this.witnessPriceFeed = page.locator('[data-testid="witness-price-feed"]');
    this.witnessVoteBox = page.locator('[data-testid="witnesses-vote-box"]');
    this.witnessSetProxyBox = page.locator('[data-testid="witnesses-set-proxy-box"]');
    this.witnessCreated = page.locator('[data-testid="witness-created"]');
    this.witnessVoteIcon = page.locator('[data-testid="witness-vote"]');
    this.witnessHasNotProducedBlocksWarning = page.locator('[data-testid="witness-has-not-produced-blocks-warning"]');
  }

  async goToWitnessesPage() {
    await this.page.goto("/~witnesses");
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.witnessTitle).toHaveText('Witness Voting');
    await expect(this.witnessTableBody).toBeVisible();
    // Wait for witness data to load by checking for first witness name link
    await this.witnessNameLink.first().waitFor({ state: 'visible' });
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const bcg = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return bcg;
  }
}
