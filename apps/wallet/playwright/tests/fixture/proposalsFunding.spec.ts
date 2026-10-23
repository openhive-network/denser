import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';
import { PROPOSALS_PAGE_RESULTS, STUB_PROPOSALS } from '../support/proposalsApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';
import { WCAG_AA_TEXT_CONTRAST, textContrast } from '../support/contrast';

/**
 * The proposals page's DHF information: the fund's budget, the line between the proposals its next
 * round of payouts funds and the rest, each proposal's progress, the voters button, the status tabs
 * and the search, and the contrast of its text in dark mode. The stub node
 * (support/proposalsApiStub.ts) funds #11, the stabilizer's #12 and the return proposal #0.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const { funded, stabilizer, returnProposal, belowLine, upcoming, expired, burn } = STUB_PROPOSALS;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, PROPOSALS_PAGE_RESULTS);
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  await page.clock.setFixedTime(NOW);
});

/** Opens the proposals page and waits for its list and the DHF summary. */
const openProposals = async (page: Page) => {
  const proposalsPage = new ProposalsPage(page);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  await expect(proposalsPage.proposalCard(funded)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await expect(proposalsPage.dhfTotalBudget).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  return proposalsPage;
};

test.describe('Proposals page DHF funding', () => {
  test('WALLET-PROPOSALS-DHF-01 — the summary shows the daily funded amount, the stabilizer apart, and the budgets', async ({
    page
  }) => {
    const proposalsPage = await openProposals(page);

    await expect(proposalsPage.dhfDailyFunded).toHaveText('200.000 HBD');
    await expect(proposalsPage.dhfStabilizer).toHaveText('150.000 HBD');
    await expect(proposalsPage.dhfMaxDailyBudget).toHaveText('500.000 HBD');
    await expect(proposalsPage.dhfTotalBudget).toHaveText('50,000.000 HBD');
    const faqLink = proposalsPage.dhfSummary.getByRole('link', { name: 'Read more in the FAQ' });
    await expect(faqLink).toHaveAttribute('href', /\/faq\.html#What_is_the_Decentralized_Hive_Fund__DHF$/);
  });

  test('WALLET-PROPOSALS-DHF-02 — in vote order the funding line follows the last funded proposal, the return proposal', async ({
    page
  }) => {
    const proposalsPage = await openProposals(page);

    expect(await proposalsPage.listedProposalIds()).toEqual([
      funded,
      stabilizer,
      returnProposal,
      belowLine,
      upcoming,
      burn
    ]);
    await expect(proposalsPage.fundingLine).toHaveCount(1);
    await expect(
      page.locator(`[data-proposal-id="${returnProposal}"] + [data-testid="proposals-funding-line"]`)
    ).toBeVisible();
    await expect(proposalsPage.fundingLine).toContainText('Funded in the next round');
    await expect(proposalsPage.fundingLine).toContainText('Not funded in the next round');
    await expect(proposalsPage.proposalFundingBadge).toHaveCount(0);
    await expect(proposalsPage.proposalReturnNote).toHaveCount(1);
    await expect(
      proposalsPage.proposalCard(returnProposal).getByTestId('proposal-return-note')
    ).toBeVisible();
  });

  test('WALLET-PROPOSALS-DHF-03 — each card shows its post and an active proposal its remaining days', async ({
    page
  }) => {
    const proposalsPage = await openProposals(page);

    const card = proposalsPage.proposalCard(funded);
    await expect(card.getByTestId('proposal-remaining-days')).toHaveText('213 days left');
    await expect(card.getByTestId('proposal-post-link')).toHaveText(
      `@${STUB_ACCOUNT}/stub-proposal-${funded}`
    );
    await expect(card.getByTestId('proposal-post-link')).toHaveAttribute(
      'href',
      new RegExp(`/@${STUB_ACCOUNT}/stub-proposal-${funded}$`)
    );
    await expect(proposalsPage.proposalCard(upcoming).getByTestId('proposal-remaining-days')).toHaveCount(0);
  });

  test('WALLET-PROPOSALS-DHF-04 — the vote total is a named button that shows the exact HP and opens the voters with Enter', async ({
    page
  }) => {
    const proposalsPage = await openProposals(page);

    const button = proposalsPage.proposalCard(funded).getByTestId('vote-proposals-dialog-trigger');
    await expect(button).toHaveAccessibleName(
      new RegExp(`^[\\d.]+[KMTP]? HP, show the voters of proposal #${funded}$`)
    );
    await expect(button.getByTestId('vote-proposal-value')).toHaveText(/^[\d.]+[KMTP]? HP$/);
    await button.focus();
    await expect(button).toBeFocused();
    await expect(proposalsPage.voteProposalValueTooltip.first()).toHaveText(
      /^Show voters \([\d,]+\.\d{2} HP\)$/
    );

    await page.keyboard.press('Enter');
    await expect(proposalsPage.voteProposalDialogList).toBeVisible();
    await expect(proposalsPage.proposalIdOnDialog).toHaveText(`#${funded}`);
    await expect(proposalsPage.proposalVoterLinkInDialogList.first()).toContainText(STUB_ACCOUNT);
  });

  test('WALLET-PROPOSALS-DHF-05 — the status tabs and the search filter the list', async ({ page }) => {
    const proposalsPage = await openProposals(page);
    await expect(proposalsPage.statusTab('Votable')).toHaveAttribute('aria-selected', 'true');

    await proposalsPage.statusTab('Upcoming').click();
    await expect(proposalsPage.statusTab('Upcoming')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([upcoming]);

    await proposalsPage.statusTab('Expired').click();
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([expired]);

    await proposalsPage.statusTab('Expired').press('ArrowLeft');
    await expect(proposalsPage.statusTab('Upcoming')).toBeFocused();
    await proposalsPage.statusTab('Active').click();
    await expect
      .poll(() => proposalsPage.listedProposalIds())
      .toEqual([funded, stabilizer, returnProposal, belowLine, burn]);

    await proposalsPage.proposalsSearch.fill('STABILIZER');
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([stabilizer]);
    // Out of the vote-ordered list the line gives way to badges.
    await expect(proposalsPage.fundingLine).toHaveCount(0);
    await expect(proposalsPage.proposalCard(stabilizer).getByTestId('proposal-funding-badge')).toHaveText(
      'funded'
    );

    await proposalsPage.proposalsSearch.fill('stub-bob');
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([belowLine]);
    await expect(proposalsPage.proposalCard(belowLine).getByTestId('proposal-funding-badge')).toHaveText(
      'not funded'
    );

    await proposalsPage.proposalsSearch.fill('nothing like this');
    await expect(page.getByTestId('proposals-no-search-results')).toBeVisible();

    await proposalsPage.proposalsSearch.fill('');
    await expect(proposalsPage.fundingLine).toHaveCount(1);
  });

  test('WALLET-PROPOSALS-DHF-06 — in another order each active proposal carries a funded or not funded badge', async ({
    page
  }) => {
    const proposalsPage = await openProposals(page);

    await proposalsPage.proposalsFilterOrderBy.click();
    await page.getByRole('option', { name: 'Creator', exact: true }).click();
    await expect(proposalsPage.fundingLine).toHaveCount(0);

    const badge = (proposalId: number) =>
      proposalsPage.proposalCard(proposalId).getByTestId('proposal-funding-badge');
    await expect(badge(funded)).toHaveText('funded');
    await expect(badge(stabilizer)).toHaveText('funded');
    await expect(badge(returnProposal)).toHaveText('funded');
    await expect(badge(belowLine)).toHaveText('not funded');
    await expect(badge(burn)).toHaveText('not funded');
    await expect(badge(upcoming)).toHaveCount(0);
  });
});

/** Every visible text of the proposals page body: its color and the background colors behind it, innermost first. */
const collectTexts = (page: Page) =>
  page.getByTestId('proposals-body').evaluate((body) => {
    const texts: { where: string; text: string; color: string; backgrounds: string[] }[] = [];
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      const text = node.textContent?.trim();
      if (!element || !text || !element.checkVisibility()) continue;
      const backgrounds: string[] = [];
      for (let layer: Element | null = element; layer; layer = layer.parentElement) {
        backgrounds.push(getComputedStyle(layer).backgroundColor);
      }
      const where = element.closest('[data-testid]')?.getAttribute('data-testid') ?? element.tagName;
      texts.push({ where, text, color: getComputedStyle(element).color, backgrounds });
    }
    const search = body.querySelector<HTMLInputElement>('[data-testid="proposals-search"]');
    if (search) {
      const backgrounds: string[] = [];
      for (let layer: Element | null = search; layer; layer = layer.parentElement) {
        backgrounds.push(getComputedStyle(layer).backgroundColor);
      }
      const placeholder = { color: getComputedStyle(search, '::placeholder').color, backgrounds };
      texts.push({ where: 'proposals-search', text: search.placeholder, ...placeholder });
    }
    return texts;
  });

/** The texts of the page below WCAG AA contrast, described for the failure message. */
const lowContrastTexts = async (page: Page) =>
  (await collectTexts(page))
    .map((text) => ({ ...text, contrast: textContrast(text.color, text.backgrounds) }))
    .filter(({ contrast }) => contrast < WCAG_AA_TEXT_CONTRAST)
    .map(({ where, text, color, contrast }) => `${where} "${text}" ${color}: ${contrast.toFixed(2)}`);

test.describe('Proposals page in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('WALLET-PROPOSALS-DHF-07 — every text of the cards, the filter bar and the summary reaches 4.5:1', async ({
    page
  }) => {
    const proposalsPage = await openProposals(page);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    expect(await lowContrastTexts(page)).toEqual([]);

    // The funding badges show in other orders.
    await proposalsPage.proposalsFilterOrderBy.click();
    await page.getByRole('option', { name: 'Creator', exact: true }).click();
    await expect(proposalsPage.proposalFundingBadge.first()).toBeVisible();
    expect(await lowContrastTexts(page)).toEqual([]);
  });
});
