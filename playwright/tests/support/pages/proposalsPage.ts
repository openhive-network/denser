import { Page, Locator, expect } from '@playwright/test';
import { HomePage } from './homePage';

export class ProposalsPage {
  readonly page: Page;
  readonly proposalsBody: Locator;
  readonly proposalsHeaderText: Locator;
  readonly proposalsFilterStatus: Locator;
  readonly proposalsOrderBy: Locator;
  readonly proposalsOrderDirectionButton: Locator;
  readonly proposalItem: Locator;
  readonly proposalItemContent: Locator;
  readonly proposalItemVote: Locator;
  readonly proposalItemTitleLink: Locator;
  readonly firstPorposalItemTitleLinkText: Locator;
  readonly proposalItemId: Locator;
  readonly proposalItemRowDescription: Locator;
  readonly proposalItemItemDetails: Locator;
  readonly proposalStatusTag: Locator;

  constructor(page: Page) {
    this.page = page;
    this.proposalsBody = page.locator('[data-testid="proposals-body"]');
    this.proposalsHeaderText = this.proposalsBody.getByText('Proposals');
    this.proposalsFilterStatus = page.locator('[data-testid="proposals-filter-status"]');
    this.proposalsOrderBy = page.locator('[data-testid="proposals-order-by"]');
    this.proposalsOrderDirectionButton = page.locator('[data-testid="proposals-order-direction"]');
    this.proposalItem = page.locator('[data-testid="proposal-item"]');
    this.proposalItemContent = page.locator('[data-testid="proposal-item-content"]');
    this.proposalItemVote = page.locator('[data-testid="proposal-item-vote"]');
    this.proposalItemTitleLink = this.proposalItemContent.locator('a');
    this.firstPorposalItemTitleLinkText = this.proposalItemContent.locator('a > span').first();
    this.proposalItemId = page.locator('[data-testid="proposal-item-id"]');
    this.proposalItemRowDescription = page.locator('[data-testid="proposal-item-row-description"]');
    this.proposalItemItemDetails = page.locator('[data-testid="proposal-item-details"]');
    this.proposalStatusTag = page.locator('[data-testid="proposal-status-tag"]');
  }

  async gotoProposalsPage() {
    const homePage = new HomePage(this.page);

    await homePage.goto();
    await homePage.moveToNavProposalsPage();
    await expect(this.proposalsBody).toBeVisible();
    await expect(this.proposalsHeaderText).toHaveText('Proposals');
    await expect(this.proposalsFilterStatus).toBeVisible();
    await expect(this.proposalsOrderBy).toBeVisible();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const cssStyleValue = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return cssStyleValue;
  }
}
