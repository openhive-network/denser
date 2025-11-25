import { expect, test } from '@playwright/test';
import { ProposalsPage } from '../support/pages/proposalsPage';
import { ApiHelper } from '../support/apiHelper';
import { LoginToVoteDialog } from '../support/pages/loginToVoteDialog';
import { HomePage } from '../../../../blog/playwright/tests/support/pages/homePage';
import { getRoundedAbbreveration } from '../../../../../packages/ui/lib/utils';
import moment from 'moment';
import Big from 'big.js';

test.describe('Proposals page tests', () => {
  let proposalsPage: ProposalsPage;

  test.beforeEach(async ({ page }) => {
    proposalsPage = new ProposalsPage(page);
  });

  test('validate that proposals page is loaded', async ({ page }) => {
    await proposalsPage.goToProposalsPage();
  });

  test('validate the amount of proposals in the list of proposals is equal get from api', async ({
    page
  }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      const resListOfProposalsAPI = await apiHelper.getListOfProposalsAPI(); // default parameters
      const amountListOfProposalsItemsAPI = resListOfProposalsAPI.result.length;

      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;

      expect(amountProposalsItemUI).toBe(amountListOfProposalsItemsAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change status to All and order by the same (total votes)', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'all'
    );
    const amountResListOfProposalsStatusAllAPI = await resListOfProposalsStatusAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsStatusAllAPI);

    await proposalsPage.proposalsFilterStatus.click();
    await proposalsPage.proposalsFilterStatusConntent.getByText('All').click();
    await expect(proposalsPage.proposalsFilterStatus.locator('span')).toHaveText('All');
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsStatusAllAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change status to Active and order by the same (total votes)', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'active'
    );
    const amountResListOfProposalsStatusAllAPI = await resListOfProposalsStatusAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsStatusAllAPI);

    await proposalsPage.proposalsFilterStatus.click();
    await proposalsPage.proposalsFilterStatusConntent.getByText(/^Active$/).click();
    await expect(proposalsPage.proposalsFilterStatus.locator('span')).toHaveText(/^Active$/);
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await expect(proposalsPage.proposalStatusBadge.first()).toHaveText('started');
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsStatusAllAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change status to Inactive and order by the same (total votes)', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'inactive'
    );
    const amountResListOfProposalsStatusAllAPI = await resListOfProposalsStatusAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsStatusAllAPI);

    await proposalsPage.proposalsFilterStatus.click();
    await proposalsPage.proposalsFilterStatusConntent.getByText(/^Inactive$/).click();
    await proposalsPage.page.waitForSelector(proposalsPage.proposalsFilterStatus.getByText(/^Inactive$/)['_selector']);
    await expect(proposalsPage.proposalsFilterStatus.locator('span')).toHaveText(/^Inactive$/);
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      await expect(proposalsPage.proposalStatusBadge.first()).toHaveText('not started');
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsStatusAllAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change status to Expired and order by the same (total votes)', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'expired'
    );
    const amountResListOfProposalsStatusAllAPI = await resListOfProposalsStatusAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsStatusAllAPI);

    await proposalsPage.proposalsFilterStatus.click();
    await proposalsPage.proposalsFilterStatusConntent.getByText(/^Expired$/).click();
    await expect(proposalsPage.proposalsFilterStatus.locator('span')).toHaveText(/^Expired$/);
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await expect(proposalsPage.proposalStatusBadge.first()).toHaveText('finished');
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsStatusAllAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change status to Votable and order by the same (total votes)', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'votable'
    );
    const amountResListOfProposalsStatusAllAPI = await resListOfProposalsStatusAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsStatusAllAPI);

    await proposalsPage.proposalsFilterStatus.click();
    await proposalsPage.proposalsFilterStatusConntent.getByText(/^Votable$/).click();
    await expect(proposalsPage.proposalsFilterStatus.locator('span')).toHaveText(/^Votable$/);
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsStatusAllAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('validate descending/ascending direction in proposals list', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      const firstProposalVotesValueOnPageDescending = await proposalsPage.voteProposalsValue
        .first()
        .textContent();

      await proposalsPage.page.keyboard.down('End');
      await proposalsPage.page.waitForTimeout(2000);

      const lastProposalVotesValueOnPageDescending = await proposalsPage.voteProposalsValue
        .last()
        .textContent();

      // Change descending votes to ascending votes
      await proposalsPage.proposalsFilterDirection.click();
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);

      const firstProposalVotesValueOnPageAscending = await proposalsPage.voteProposalsValue
        .first()
        .textContent();

      await proposalsPage.page.keyboard.down('End');
      await proposalsPage.page.waitForTimeout(2000);

      const lastProposalVotesValueOnPageAscending = await proposalsPage.voteProposalsValue.last().textContent();

      expect(firstProposalVotesValueOnPageAscending).toBe(lastProposalVotesValueOnPageDescending);
      expect(lastProposalVotesValueOnPageAscending).toBe(firstProposalVotesValueOnPageDescending);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change order by filter to Creator', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_creator',
      'descending',
      'votable'
    );
    const amountResListOfProposalsOrderByCreatorAPI =
      await resListOfProposalsStatusAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsOrderByCreatorAPI);
    const subjectOfFirstProposalOrderByCreatorAPI =
      await resListOfProposalsStatusAllAPI.result.proposals[0].subject;

    await proposalsPage.proposalsFilterOrderBy.click();
    await proposalsPage.proposalsFilterOrderByConntent.getByText(/^Creator$/).click();
    await expect(proposalsPage.proposalsFilterOrderBy.locator('span')).toHaveText(/^Creator$/);
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsOrderByCreatorAPI);

      const subjectOfFirstProposalOrderByCreatorUI = await proposalsPage.proposalTitle.first().textContent();
      expect(subjectOfFirstProposalOrderByCreatorUI).toContain(subjectOfFirstProposalOrderByCreatorAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change order by filter to Start Date', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_start_date',
      'descending',
      'votable'
    );
    const amountResListOfProposalsOrderByStartDateAPI =
      await resListOfProposalsStatusAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsOrderByStartDateAPI);
    const subjectOfFirstProposalOrderByStartDateAPI =
      await resListOfProposalsStatusAllAPI.result.proposals[0].subject;

    await proposalsPage.proposalsFilterOrderBy.click();
    await proposalsPage.proposalsFilterOrderByConntent.getByText(/^Start Date$/).click();
    await expect(proposalsPage.proposalsFilterOrderBy.locator('span')).toHaveText(/^Start Date$/);
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsOrderByStartDateAPI);

      const subjectOfFirstProposalOrderByStartDateUI = await proposalsPage.proposalTitle.first().textContent();
      expect(subjectOfFirstProposalOrderByStartDateUI).toContain(subjectOfFirstProposalOrderByStartDateAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change order by filter to End Date', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsEndDateAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_end_date',
      'descending',
      'votable'
    );
    const amountResListOfProposalsOrderByEndDateAPI =
      await resListOfProposalsEndDateAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsOrderByEndDateAPI);
    const subjectOfFirstProposalOrderByEndDateAPI =
      await resListOfProposalsEndDateAllAPI.result.proposals[0].subject;

    await proposalsPage.proposalsFilterOrderBy.click();
    await proposalsPage.proposalsFilterOrderByConntent.getByText(/^End Date$/).click();
    await expect(proposalsPage.proposalsFilterOrderBy.locator('span')).toHaveText(/^End Date$/);
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsOrderByEndDateAPI);

      const subjectOfFirstProposalOrderByEndDateUI = await proposalsPage.proposalTitle.first().textContent();
      expect(subjectOfFirstProposalOrderByEndDateUI).toContain(subjectOfFirstProposalOrderByEndDateAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('change order by filter to Total Votes', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsTotalVotesAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'votable'
    );
    const amountResListOfProposalsOrderByTotalVotesAPI =
      await resListOfProposalsTotalVotesAllAPI.result.proposals.length;
    // console.log("Amount of proposals in API: ", amountResListOfProposalsOrderByTotalVotesAPI);
    const subjectOfFirstProposalOrderByTotalVotesAPI =
      await resListOfProposalsTotalVotesAllAPI.result.proposals[0].subject;

    await proposalsPage.proposalsFilterOrderBy.click();
    await proposalsPage.proposalsFilterOrderByConntent.getByText(/^Total Votes$/).click();
    await expect(proposalsPage.proposalsFilterOrderBy.locator('span')).toHaveText(/^Total Votes$/);
    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      await proposalsPage.page.waitForSelector(proposalsPage.proposalListItem['_selector']);
      const amountProposalsItemUI = (await proposalsPage.proposalListItem.all()).length;
      // console.log("Amount of proposals in UI: ", amountProposalsItemUI);
      expect(amountProposalsItemUI).toBe(amountResListOfProposalsOrderByTotalVotesAPI);

      const subjectOfFirstProposalOrderByTotalVotesUI = await proposalsPage.proposalTitle.first().textContent();
      expect(subjectOfFirstProposalOrderByTotalVotesUI).toContain(subjectOfFirstProposalOrderByTotalVotesAPI);
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('validate the elements of the first poroposal in default filters (Status: Votable, Order By: Total Votes, Descending) ', async ({
    page
  }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'votable'
    );
    const firstProposalAPI = await resListOfProposalsStatusAllAPI.result.proposals[0];
    const firstProposalIdAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].proposal_id;
    const firstProposalCreatorAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].creator;
    const firstProposalReceiverAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].receiver;
    const firstProposalSubjectAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].subject;
    const firstProposalStartDateAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].start_date;
    const firstProposalEndDateAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].end_date;
    const firstProposalStatusAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].status;

    const firstProposalDailyPayAmountAPI = await new Big(
      resListOfProposalsStatusAllAPI.result.proposals[0].daily_pay.amount
    ).div(1000);

    const totalDays = moment(firstProposalEndDateAPI).diff(firstProposalStartDateAPI, `d`);

    const totalHBD = firstProposalDailyPayAmountAPI.times(
      moment(firstProposalEndDateAPI).diff(moment(firstProposalStartDateAPI), 'd')
    );

    let totalDaysBrackets: string;

    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {

      // Validate proposal subject and id
      await expect(proposalsPage.proposalTitle.first()).toContainText(firstProposalSubjectAPI);
      await expect(proposalsPage.proposalTitle.first()).toContainText('#' + firstProposalIdAPI);
      // Validate start/end date
      await expect(proposalsPage.proposalDates.first()).toContainText(
        moment(firstProposalStartDateAPI).format('MMM D, YYYY')
      );
      await expect(proposalsPage.proposalDates.first()).toContainText(
        moment(firstProposalEndDateAPI).format('MMM D, YYYY')
      );

      // Validate amount of days in date
      if (totalDays !== 1) totalDaysBrackets = '(' + totalDays + ' days)';
      else totalDaysBrackets = '(' + totalDays + ' day)';
      // console.log("totalDays: ", totalDaysBrackets);
      await expect(proposalsPage.proposalDates.first()).toContainText(totalDaysBrackets);

      // If creator and receiver are different then both should be visile in the proposal list
      if (firstProposalCreatorAPI !== firstProposalReceiverAPI) {
        await expect(proposalsPage.proposalCreator.first()).toHaveText(firstProposalCreatorAPI);
        await expect(proposalsPage.proposalReceiver.first()).toHaveText(firstProposalReceiverAPI);
      } else await expect(proposalsPage.proposalCreator.first()).toHaveText(firstProposalCreatorAPI);

      // Proposal amount contains daily pay amount
      expect(await proposalsPage.proposalAmountHBD.first().textContent()).toContain(
        getRoundedAbbreveration(firstProposalDailyPayAmountAPI)
      );
      // Proposal amount contains total pay amount
      expect(await proposalsPage.proposalAmountHBD.first().textContent()).toContain(
        getRoundedAbbreveration(totalHBD)
      );
      // Validate that badge is visible
      await expect(proposalsPage.proposalStatusBadge.first()).toBeVisible();
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('validate styles in proposals list', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'votable'
    );
    const firstProposalCreatorAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].creator;
    const firstProposalReceiverAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].receiver;

    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      // Title color
      expect(await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalTitle.first(), 'color')).toBe(
        'rgb(239, 68, 68)'
      );
      // Proposal Id color
      expect(await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalId.first(), 'color')).toBe(
        'rgb(100, 116, 139)'
      );
      // Dates color
      expect(await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalDates.first(), 'color')).toBe(
        'rgb(100, 116, 139)'
      );
      // Proposal Daily Amount color
      expect(
        await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalAmountHBD.first(), 'color')
      ).toBe('rgb(100, 116, 139)');
      // Proposal Total Amount color
      expect(
        await proposalsPage.getElementCssPropertyValue(
          proposalsPage.proposalAmountHBD.locator('span').first(),
          'color'
        )
      ).toBe('rgb(239, 68, 68)');
      // Proposal Status Badge color
      expect(
        await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalStatusBadge.first(), 'color')
      ).toBe('rgb(239, 68, 68)');
      // Proposal Status tooltip
      await expect(proposalsPage.proposalStatusBadge.first()).toHaveText(/^started/);
      // Creator and/or receiver colors
      if (firstProposalCreatorAPI !== firstProposalReceiverAPI) {
        expect(
          await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalCreator.first(), 'color')
        ).toBe('rgb(239, 68, 68)');
        expect(
          await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalReceiver.first(), 'color')
        ).toBe('rgb(239, 68, 68)');
      } else
        expect(
          await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalCreator.first(), 'color')
        ).toBe('rgb(239, 68, 68)');
      // Vote proposal value color
      expect(
        await proposalsPage.getElementCssPropertyValue(proposalsPage.voteProposalsValue.first(), 'color')
      ).toBe('rgb(0, 0, 0)');
      // Proposal Status tooltip
      await expect(proposalsPage.voteProposalsValue.first()).toHaveAttribute('title', /.+( HP)$/);
      // Vote proposal button icon
      expect(
        await proposalsPage.getElementCssPropertyValue(proposalsPage.voteProposalButtonIcon.first(), 'color')
      ).toBe('rgb(239, 68, 68)');
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('validate styles in proposals list in the dark mode', async ({ page }) => {
    let homePage: HomePage = new HomePage(page);
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();
    // Set Dark Mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    const resListOfProposalsStatusAllAPI = await apiHelper.getListOfProposalsDatabaseAPI(
      [],
      30,
      'by_total_votes',
      'descending',
      'votable'
    );
    const firstProposalCreatorAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].creator;
    const firstProposalReceiverAPI = await resListOfProposalsStatusAllAPI.result.proposals[0].receiver;

    await proposalsPage.page.waitForTimeout(3000);
    if (await proposalsPage.proposalStatusBadge.first().isVisible()) {
      // Title color
      expect(await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalTitle.first(), 'color')).toBe(
        'rgb(239, 68, 68)'
      );
      // Proposal Id color
      expect(await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalId.first(), 'color')).toBe(
        'rgb(100, 116, 139)'
      );
      // Dates color
      expect(await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalDates.first(), 'color')).toBe(
        'rgb(100, 116, 139)'
      );
      // Proposal Daily Amount color
      expect(
        await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalAmountHBD.first(), 'color')
      ).toBe('rgb(100, 116, 139)');
      // Proposal Total Amount color
      expect(
        await proposalsPage.getElementCssPropertyValue(
          proposalsPage.proposalAmountHBD.locator('span').first(),
          'color'
        )
      ).toBe('rgb(254, 202, 202)');
      // Proposal Status Badge color
      expect(
        await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalStatusBadge.first(), 'color')
      ).toBe('rgb(239, 68, 68)');
      // Proposal Status tooltip
      await expect(proposalsPage.proposalStatusBadge.first()).toHaveText(/^started/);
      // Creator and/or receiver colors
      if (firstProposalCreatorAPI !== firstProposalReceiverAPI) {
        expect(
          await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalCreator.first(), 'color')
        ).toBe('rgb(239, 68, 68)');
        expect(
          await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalReceiver.first(), 'color')
        ).toBe('rgb(239, 68, 68)');
      } else
        expect(
          await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalCreator.first(), 'color')
        ).toBe('rgb(239, 68, 68)');
      // Vote proposal value color
      expect(
        await proposalsPage.getElementCssPropertyValue(proposalsPage.voteProposalsValue.first(), 'color')
      ).toBe('rgb(255, 255, 255)');
      // Proposal Status tooltip
      await expect(proposalsPage.voteProposalsValue.first()).toHaveAttribute('title', /.+( HP)$/);
      // Vote proposal button icon
      expect(
        await proposalsPage.getElementCssPropertyValue(proposalsPage.voteProposalButtonIcon.first(), 'color')
      ).toBe('rgb(239, 68, 68)');
    } else {
      await expect(proposalsPage.proposalsBody.locator('main').locator('p').first()).toHaveText(
        "Sorry, I can't show you any proposals right now."
      );
    }
  });

  test('validate styles of filters in proposals list', async ({ page }) => {
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();

    // Filter Status:  color and border
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalsFilterStatus.first(), 'color')
    ).toBe('rgb(0, 0, 0)');
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalsFilterStatus.first(), 'border')
    ).toBe('1px solid rgb(226, 232, 240)');
    // Filter Order by:  color and border
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalsFilterOrderBy.first(), 'color')
    ).toBe('rgb(0, 0, 0)');
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalsFilterOrderBy.first(), 'border')
    ).toBe('1px solid rgb(226, 232, 240)');
    // Sort direction color
    expect(
      await proposalsPage.getElementCssPropertyValue(
        proposalsPage.proposalsFilterDirection.first().locator('svg'),
        'color'
      )
    ).toBe('rgb(239, 68, 68)');
  });

  test('validate styles of filters in proposals list in the dark mode', async ({ page }) => {
    let homePage: HomePage = new HomePage(page);
    let apiHelper: ApiHelper = new ApiHelper(page);

    await proposalsPage.goToProposalsPage();
    // Set Dark Mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Filter Status:  color and border
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalsFilterStatus.first(), 'color')
    ).toBe('rgb(255, 255, 255)');
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalsFilterStatus.first(), 'border')
    ).toBe('1px solid rgb(29, 40, 58)');
    // Filter Order by:  color and border
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalsFilterOrderBy.first(), 'color')
    ).toBe('rgb(255, 255, 255)');
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalsFilterOrderBy.first(), 'border')
    ).toBe('1px solid rgb(29, 40, 58)');
    // Sort direction color
    expect(
      await proposalsPage.getElementCssPropertyValue(
        proposalsPage.proposalsFilterDirection.first().locator('svg'),
        'color'
      )
    ).toBe('rgb(239, 68, 68)');
  });

  // temporary skipped - also does not work in Hive blog
  test.skip('move to the list of voters of the first proposal', async ({ page }) => {
    await proposalsPage.goToProposalsPage();

    const firstProposalId = await proposalsPage.proposalId.first();

    await proposalsPage.voteProposalsDialogTrigger.first().click();
    await expect(proposalsPage.voteProposalDialogList).toBeVisible();
    expect(await proposalsPage.voteProposalDialogList.getByText('Votes on proposal ')).toBeVisible();
    await expect(await proposalsPage.proposalIdOnDialog).toHaveText(await firstProposalId.textContent());
    await expect(await proposalsPage.proposalVoterLinkInDialogList.first()).toBeVisible();
    await proposalsPage.closeVoteProposalDialogList.click();
    await expect(proposalsPage.proposalListItem.first()).toBeVisible();
  });

  // temporary skipped - also does not work in Hive blog
  test.skip('validate styles in the dialog of list of voters of the first proposal in the light mode', async ({
    page
  }) => {
    await proposalsPage.goToProposalsPage();

    const firstProposalId = await proposalsPage.proposalId.first();

    await proposalsPage.voteProposalsDialogTrigger.first().click();
    await expect(proposalsPage.voteProposalDialogList).toBeVisible();
    expect(await proposalsPage.voteProposalDialogList.getByText('Votes on proposal ')).toBeVisible();

    // `Votes on proposal`: color
    expect(
      await proposalsPage.getElementCssPropertyValue(
        proposalsPage.voteProposalDialogList.getByText('Votes on proposal '),
        'color'
      )
    ).toBe('rgb(15, 23, 42)');
    // Proposal Id in the dialog: color
    expect(await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalIdOnDialog, 'color')).toBe(
      'rgb(239, 68, 68)'
    );
    // Voter link in the dialog: color
    expect(
      await proposalsPage.getElementCssPropertyValue(
        proposalsPage.proposalVoterLinkInDialogList.first(),
        'color'
      )
    ).toBe('rgb(239, 68, 68)');
    // Voter values in the dialog: color
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.voterValuesDialog.first(), 'color')
    ).toBe('rgb(100, 116, 139)');
    // Close dialog icon: color
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.closeVoteProposalDialogList, 'color')
    ).toBe('rgb(15, 23, 42)');
    // Close the dialog of voter list
    await proposalsPage.closeVoteProposalDialogList.click();
    await expect(proposalsPage.proposalListItem.first()).toBeVisible();
  });

  // temporary skipped - also does not work in Hive blog
  test.skip('validate styles in the dialog of list of voters of the first proposal in the dark mode', async ({
    page
  }) => {
    let homePage: HomePage = new HomePage(page);

    await proposalsPage.goToProposalsPage();
    // Set Dark Mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    const firstProposalId = await proposalsPage.proposalId.first();

    await proposalsPage.voteProposalsDialogTrigger.first().click();
    await expect(proposalsPage.voteProposalDialogList).toBeVisible();
    expect(await proposalsPage.voteProposalDialogList.getByText('Votes on proposal ')).toBeVisible();

    // Vote proposal dialog: background-color
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.voteProposalDialogList, 'background-color')
    ).toBe('rgb(3, 7, 17)');
    // `Votes on proposal`: color
    expect(
      await proposalsPage.getElementCssPropertyValue(
        proposalsPage.voteProposalDialogList.getByText('Votes on proposal '),
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    // Proposal Id in the dialog: color
    expect(await proposalsPage.getElementCssPropertyValue(proposalsPage.proposalIdOnDialog, 'color')).toBe(
      'rgb(239, 68, 68)'
    );
    // Voter link in the dialog: color
    expect(
      await proposalsPage.getElementCssPropertyValue(
        proposalsPage.proposalVoterLinkInDialogList.first(),
        'color'
      )
    ).toBe('rgb(239, 68, 68)');
    // Voter values in the dialog: color
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.voterValuesDialog.first(), 'color')
    ).toBe('rgb(100, 116, 139)');
    // Close dialog icon: color
    expect(
      await proposalsPage.getElementCssPropertyValue(proposalsPage.closeVoteProposalDialogList, 'color')
    ).toBe('rgb(225, 231, 239)');
    // Close the dialog of voter list
    await proposalsPage.closeVoteProposalDialogList.click();
    await expect(proposalsPage.proposalListItem.first()).toBeVisible();
  });

  // It works on localhost but in CI it cannot move to the new domain page
  test.skip('move to the post page by clicking title of the first proposal', async ({ page }) => {
    await proposalsPage.goToProposalsPage();

    const pagePromise = page.context().waitForEvent('page');

    const titleProposalFirst = await proposalsPage.proposalTitle.first();
    await titleProposalFirst.click();

    // await test.setTimeout(120000);
    const newPage = await pagePromise;
    await newPage.waitForSelector(newPage.locator('[data-testid="article-title"]')['_selector']);
    // console.log('Title of first proposal in the list: ', await titleProposalFirst.textContent());
    expect(await titleProposalFirst.textContent()).toContain(
      await newPage.locator('[data-testid="article-title"]').textContent()
    );
    // console.log('Title of post after clicking the proposal: ', await newPage.locator('[data-testid="article-title"]').textContent());
  });

  // It works on localhost but in CI it cannot move to the new domain page
  test.skip('move to the proposal creator profile page', async ({ page }) => {
    await proposalsPage.goToProposalsPage();

    const pagePromise = page.context().waitForEvent('page');

    const proposalCreator = await proposalsPage.proposalCreator.first();
    const proposalCreatorName = await proposalsPage.proposalCreator.first().textContent();
    await proposalCreator.click();

    const newPage = await pagePromise;

    let reUrl = new RegExp(`http:\/\/\\w+:3000/@${proposalCreatorName}`);
    await expect(newPage.url()).toMatch(reUrl);
  });

  // It works on localhost but in CI it cannot move to the new domain page
  test.skip('move to the proposal receiver profile page', async ({ page }) => {
    await proposalsPage.goToProposalsPage();

    const pagePromise = page.context().waitForEvent('page');

    const proposalReceiver = await proposalsPage.proposalReceiver.first();
    const proposalReceiverName = await proposalsPage.proposalReceiver.first().textContent();
    await proposalReceiver.click();

    const newPage = await pagePromise;

    let reUrl = new RegExp(`http:\/\/\\w+:3000/@${proposalReceiverName}`);
    await expect(newPage.url()).toMatch(reUrl);
  });

  // test('move to the login dialog by clicking vote button', async ({ page }) => {
  //   const loginDialog = new LoginToVoteDialog(page);

  //   await proposalsPage.goToProposalsPage();
  //   await expect(proposalsPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/?/); // https://caddy/ or http://localhost:4000

  //   // Click vote button in the first proposal
  //   await proposalsPage.clickVoteButtonOfFirstProposalItem();
  //   await loginDialog.validateLoginToVoteDialogIsVisible();
  //   await loginDialog.closeLoginDialog();
  // });
});
