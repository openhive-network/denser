import { Locator, Page, expect } from "@playwright/test";
import { timed } from "../../../../../../playwright/support/timeouts";

export class ProposalsPage {
  readonly page: Page;
  readonly proposalTitle: Locator;
  readonly proposalId: Locator;
  readonly proposalDates: Locator;
  readonly proposalsBody: Locator;
  readonly proposalListItem: Locator;
  readonly proposalsHeaderName: Locator;
  readonly proposalsSortAndFilterBlock: Locator;
  readonly proposalsStatusTabs: Locator;
  readonly proposalsStatusSelect: Locator;
  readonly proposalsStatusSelectContent: Locator;
  readonly proposalsSearch: Locator;
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
  readonly proposalMessageCannotShowYouAnyProposals: Locator;
  readonly proposalRemainingDays: Locator;
  readonly proposalPostLink: Locator;
  readonly proposalFundingBadge: Locator;
  readonly proposalReturnNote: Locator;
  readonly fundingLine: Locator;
  readonly dhfSummary: Locator;
  readonly dhfDailyFunded: Locator;
  readonly dhfStabilizer: Locator;
  readonly dhfMaxDailyBudget: Locator;
  readonly dhfTotalBudget: Locator;
  readonly voteProposalValueTooltip: Locator;

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
    this.proposalsStatusTabs = page.locator('[data-testid="proposals-status-tabs"]');
    this.proposalsStatusSelect = page.locator('[data-testid="proposals-status-select"]');
    this.proposalsStatusSelectContent = page.locator('[data-testid="proposals-status-select-content"]');
    this.proposalsSearch = page.locator('[data-testid="proposals-search"]');
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

    this.proposalMessageCannotShowYouAnyProposals = page.locator('text="Sorry, I can\'t show you any proposals right now."')
    this.proposalRemainingDays = page.locator('[data-testid="proposal-remaining-days"]');
    this.proposalPostLink = page.locator('[data-testid="proposal-post-link"]');
    this.proposalFundingBadge = page.locator('[data-testid="proposal-funding-badge"]');
    this.proposalReturnNote = page.locator('[data-testid="proposal-return-note"]');
    this.fundingLine = page.locator('[data-testid="proposals-funding-line"]');
    this.dhfSummary = page.locator('[data-testid="dhf-summary"]');
    this.dhfDailyFunded = page.locator('[data-testid="dhf-daily-funded"]');
    this.dhfStabilizer = page.locator('[data-testid="dhf-stabilizer"]');
    this.dhfMaxDailyBudget = page.locator('[data-testid="dhf-max-daily-budget"]');
    this.dhfTotalBudget = page.locator('[data-testid="dhf-total-budget"]');
    this.voteProposalValueTooltip = page.locator('[data-testid="vote-proposal-value-tooltip"]');
  }

  async goToProposalsPage() {
    await this.page.goto("/proposals");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.proposalsHeaderName).toHaveText("Proposals");
    await expect(this.proposalsBody).toBeVisible();
    // Wait for proposals to load - either proposal items appear or "no proposals" message
    await timed('proposals-loaded', 10000, (timeout) =>
      Promise.race([
        this.proposalListItem.first().waitFor({ state: 'visible', timeout }),
        this.proposalMessageCannotShowYouAnyProposals.waitFor({ state: 'visible', timeout })
      ])
    ).catch(() => {
      // If neither appears within timeout, continue anyway (data may still be loading)
    });
  }

  /** The status tab named `name` (All, Active, Upcoming, Expired, Votable). */
  statusTab(name: string): Locator {
    return this.proposalsStatusTabs.getByRole('tab', { name, exact: true });
  }

  /** Picks the status `name` (All, Active, Upcoming, Expired, Votable) in the narrow screens' status select. */
  async selectStatus(name: string) {
    await this.proposalsStatusSelect.click();
    await this.proposalsStatusSelectContent.getByRole('option', { name, exact: true }).click();
  }

  /** The card of proposal `proposalId`. */
  proposalCard(proposalId: number): Locator {
    return this.page.locator(`[data-testid="proposal-list-item"][data-proposal-id="${proposalId}"]`);
  }

  /** The ids of the listed proposals, in list order. */
  async listedProposalIds(): Promise<number[]> {
    const ids = await this.proposalListItem.evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-proposal-id'))
    );
    return ids.map(Number);
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
