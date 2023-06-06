import { Page, Locator, expect } from '@playwright/test';
import { HomePage } from './homePage';
import { ApiHelper } from '../apiHelper';
import { REFUND_ACCOUNTS, BURN_ACCOUNTS } from '../../../../lib/constants';

export class ProposalsPage {
  readonly page: Page;
  readonly proposalsBody: Locator;
  readonly proposalsHeaderText: Locator;
  readonly proposalsFilterStatus: Locator;
  readonly proposalsFilterStatusContent: Locator;
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
    this.proposalsFilterStatusContent = page.locator('[data-testid="proposals-filter-status-content"]');
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

  async validateStartedTimeStatusTag(elemLocator: Locator) {
    // validate time status is 'started'
    // text and color style of status tag
    expect(await this.getElementCssPropertyValue(await elemLocator, 'color')).toBe('rgb(241, 245, 249)');
    expect(await this.getElementCssPropertyValue(await elemLocator, 'background-color')).toBe('rgb(255, 0, 0)');

    await expect(elemLocator).toHaveText('started');
  }

  async validateNotStartedTimeStatusTag(elemLocator: Locator) {
    // validate time status is 'not started'
    // text and color style of status tag
    expect(await this.getElementCssPropertyValue(await elemLocator, 'color')).toBe('rgb(241, 245, 249)');
    expect(await this.getElementCssPropertyValue(await elemLocator, 'background-color')).toBe('rgb(255, 0, 0)');

    await expect(elemLocator).toHaveText('not started');
  }

  async validateFinishedTimeStatusTag(elemLocator: Locator) {
    // Validate time status is 'finished'
    // text and color style of status tag
    expect(await this.getElementCssPropertyValue(await elemLocator, 'color')).toBe('rgb(241, 245, 249)');
    expect(await this.getElementCssPropertyValue(await elemLocator, 'background-color')).toBe('rgb(255, 0, 0)');

    await expect(elemLocator).toHaveText('finished');
  }

  async validateRefundStatusTag(elemLocator: Locator) {
    // text and color style of status tag
    expect(await this.getElementCssPropertyValue(await elemLocator, 'color')).toBe('rgb(241, 245, 249)');
    expect(await this.getElementCssPropertyValue(await elemLocator, 'background-color')).toBe('rgb(77, 124, 15)');

    await expect(elemLocator).toHaveText('refund');
  }

  async validateBurnStatusTag(elemLocator: Locator) {
    // text and color style of status tag
    expect(await this.getElementCssPropertyValue(await elemLocator, 'color')).toBe('rgb(241, 245, 249)');
    expect(await this.getElementCssPropertyValue(await elemLocator, 'background-color')).toBe('rgb(234, 88, 12)');

    await expect(elemLocator).toHaveText('burn');
  }

  // Validate first proposal status tags in default filters
  //     start: Array<number | string> = [],
  //     limit: number = 30,
  //     order: string = 'by_total_votes',
  //     orderDirection: string = 'descending',
  //     status: string = 'votable'
  async validateFirstProposalStatusTagsDefaultFilters() {
    const apiHelper = new ApiHelper(this.page);

    const responsProposalListAPI = await apiHelper.getListProposalsAPI();
    const listOfProposalsAPI = await responsProposalListAPI.result.proposals[0];
    const statusFristProposalAPI = await responsProposalListAPI.result.proposals[0].status;
    const receiverFirstProposalAPI = await responsProposalListAPI.result.proposals[0].receiver;

    // Validate time status
    if (statusFristProposalAPI === 'active') {
      await this.validateStartedTimeStatusTag(await this.proposalStatusTag.locator('span div').first());
    } else if (statusFristProposalAPI === 'inactive') {
      await this.validateNotStartedTimeStatusTag(await this.proposalStatusTag.locator('span div').first());
    } else if (statusFristProposalAPI == 'expired') {
      await this.validateFinishedTimeStatusTag(await this.proposalStatusTag.locator('span div').first());
    }

    // Validate status refund for the receiver 'steem.dao'
    if (receiverFirstProposalAPI === REFUND_ACCOUNTS[0]) {
      await this.validateRefundStatusTag(await this.proposalStatusTag.locator('span div').getByText('refund').first());
    }
    // Validate status refund for the receiver 'hive.fund'
    if (receiverFirstProposalAPI === REFUND_ACCOUNTS[1]) {
      await this.validateRefundStatusTag(await this.proposalStatusTag.locator('span div').getByText('refund').first());
    }
    // Validate status burn for the receiver 'null'
    if (receiverFirstProposalAPI === BURN_ACCOUNTS[0]) {
      await this.validateBurnStatusTag(await this.proposalStatusTag.locator('span div').getByText('burn').first());
    }
  }

  // Validate first proposal status tags in custom filters
  //     start: Array<number | string> = [],
  //     limit: number = 30,
  //     order: string = 'by_total_votes',
  //     orderDirection: string = 'descending',
  //     status: string = 'votable'
  async validateFirstProposalStatusTagsOfCustomFilters(
    start: Array<number | string> = [],
    limit: number = 30,
    order: string = 'by_total_votes',
    orderDirection: string = 'descending',
    status: string = 'votable'
  ) {
    const apiHelper = new ApiHelper(this.page);

    const responsProposalListAPI = await apiHelper.getListProposalsAPI(start, limit, order, orderDirection, status);
    const listOfProposalsAPI = await responsProposalListAPI.result.proposals[0];
    const statusFristProposalAPI = await responsProposalListAPI.result.proposals[0].status;
    const receiverFirstProposalAPI = await responsProposalListAPI.result.proposals[0].receiver;

    // Validate time status
    if (statusFristProposalAPI === 'active') {
      await this.validateStartedTimeStatusTag(await this.proposalStatusTag.locator('span div').first());
    } else if (statusFristProposalAPI === 'inactive') {
      await this.validateNotStartedTimeStatusTag(await this.proposalStatusTag.locator('span div').first());
    } else if (statusFristProposalAPI == 'expired') {
      await this.validateFinishedTimeStatusTag(await this.proposalStatusTag.locator('span div').first());
    }

    // Validate status refund for the receiver 'steem.dao'
    if (receiverFirstProposalAPI === REFUND_ACCOUNTS[0]) {
      await this.validateRefundStatusTag(await this.proposalStatusTag.locator('span div').getByText('refund').first());
    }
    // Validate status refund for the receiver 'hive.fund'
    if (receiverFirstProposalAPI === REFUND_ACCOUNTS[1]) {
      await this.validateRefundStatusTag(await this.proposalStatusTag.locator('span div').getByText('refund').first());
    }
    // Validate status burn for the receiver 'null'
    if (receiverFirstProposalAPI === BURN_ACCOUNTS[0]) {
      await this.validateBurnStatusTag(await this.proposalStatusTag.locator('span div').getByText('burn').first());
    }
  }

  async selectStatusFilter(statusValue: string = 'Votable'){
    // statusValue: All, Active, Inactive, Expired, Votable
    await this.proposalsFilterStatus.click();
    await this.proposalsFilterStatusContent.getByText(statusValue, {exact: true}).locator('..').waitFor();
    await this.proposalsFilterStatusContent.getByText(statusValue, {exact: true}).locator('..').click();
    await this.proposalItem.first().waitForLoadState;
    await expect(this.proposalsFilterStatus.locator('span')).toHaveText(statusValue);
  }
}
