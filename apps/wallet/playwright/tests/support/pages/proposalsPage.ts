import { Locator, Page, expect } from "@playwright/test";

export class ProposalsPage {
  readonly page: Page;
  readonly proposalTitle: Locator;
  readonly proposalId: Locator;
  readonly proposalDates: Locator;
  readonly proposalsBody: Locator;
  readonly proposalListItem: Locator;
  readonly proposalsHeaderName: Locator;
  readonly proposalsSortAndFilterBlock: Locator;
  readonly proposalsFilterStatus: Locator;
  readonly proposalsFilterStatusConntent: Locator;
  readonly proposalsFilterOrderByConntent: Locator;
  readonly proposalsFilterOrderBy: Locator;
  readonly proposalsFilterDirection: Locator;
  readonly proposalStatusBadge: Locator;
  readonly voteProposalsDialogTrigger: Locator;
  readonly voteProposalsValue: Locator;
  readonly proposalCreator: Locator;
  readonly proposalReceiver: Locator;
  readonly proposalAmountHBD: Locator;
  readonly voteProposalButtonIcon: Locator;
  readonly voteProposalDialogList: Locator;
  readonly proposalIdOnDialog: Locator;
  readonly closeVoteProposalDialogList: Locator;
  readonly proposalVoterLinkInDialogList: Locator;
  readonly voterValuesDialog: Locator;
  readonly cannotShowYouAnyProposals: Locator;

  constructor(page: Page) {
    this.page = page;
    this.proposalTitle = page.locator('[data-testid="proposal-title"]');
    this.proposalId = page.locator('[data-testid="proposal-id"]');
    this.proposalDates = page.locator('[data-testid="proposal-date"]');
    this.proposalsBody = page.locator('[data-testid="proposals-body"]');
    this.proposalListItem = page.locator('[data-testid="proposal-list-item"]');
    this.proposalsHeaderName = page.locator(
      '[data-testid="proposals-header-name"]'
    );
    this.proposalsSortAndFilterBlock = page.locator(
      '[data-testid="proposals-sort-filter"]'
    );
    this.proposalsFilterStatus = page.locator(
      '[data-testid="proposals-sort-filter-status"]'
    );
    this.proposalsFilterStatusConntent = page.locator('[data-testid="proposals-sort-filter-status-conntent"]');
    this.proposalsFilterOrderByConntent = page.locator('[data-testid="proposals-sort-filter-orderby-conntent"]');
    this.proposalsFilterOrderBy = page.locator(
      '[data-testid="proposals-sort-filter-orderby"]'
    );
    this.proposalsFilterDirection = page.locator(
      '[data-testid="proposals-sort-filter-order-direction"]'
    );
    this.proposalStatusBadge = page.locator('[data-testid="proposal-status-badge"]');
    this.voteProposalsDialogTrigger = page.locator('[data-testid="vote-proposals-dialog-trigger"]');
    this.voteProposalsValue = page.locator('[data-testid="vote-proposal-value"]');
    this.proposalCreator = page.locator('[data-testid="proposal-creator"]');
    this.proposalReceiver = page.locator('[data-testid="proposal-receiver"]');
    this.proposalAmountHBD = page.locator('[data-testid="proposal-amount"]');
    this.voteProposalButtonIcon = page.locator('[data-testid="voting-button-icon"]');
    this.voteProposalDialogList = page.locator('[data-testid="vote-proposals-dialog"]');
    this.proposalIdOnDialog = page.locator('[data-testid="proposal-id-dialog"]');
    this.closeVoteProposalDialogList = page.locator('[data-testid="close-dialog"]');
    this.proposalVoterLinkInDialogList = page.locator('[data-testid="proposal-voter-link-dialog"]');
    this.voterValuesDialog = page.locator('[data-testid="voter-values-dialog"]');
    this.cannotShowYouAnyProposals = page.locator('data-testid="cannot-show-you-any-proposals"');
  }

  async goToProposalsPage() {
    await this.page.goto("/proposals");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.proposalsHeaderName).toHaveText("Proposals");
    await expect(this.proposalsBody).toBeVisible();
    await this.page.waitForTimeout(3000);
  }

  async clickVoteButtonOfFirstProposalItem() {
    await this.voteProposalButtonIcon.first().click();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const bcg = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return bcg;
  }
}
