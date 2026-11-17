import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startWalletApiStub } from '../support/walletApiStub';
import { PROPOSALS_PAGE_REST_RESULTS, PROPOSALS_PAGE_RESULTS, STUB_PROPOSALS } from '../support/proposalsApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';

/**
 * How the proposals page fits its space: on a phone each proposal's details and money lines take one
 * line each, in the short forms ("200 HBD/day", "213d left"), so a row stays about 80 px tall; only a
 * proposal not paid at the moment, whose money line adds its last payment, may take another. On a
 * desktop the search box is wide enough for its whole placeholder. The stub node is
 * support/proposalsApiStub.ts, with #11's payments as in proposalsPaid.spec.ts.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const PHONE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
const MAX_MEDIAN_ROW_HEIGHT = 90;
const MIN_ROWS_BELOW_SUMMARY = 4;
const LOCALES = ['en', 'pl'] as const;
const { funded, upcoming } = STUB_PROPOSALS;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, PROPOSALS_PAGE_RESULTS, PROPOSALS_PAGE_REST_RESULTS);
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

const openProposals = async (page: Page, locale: string, baseURL: string | undefined) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL }]);
  const proposalsPage = new ProposalsPage(page);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  await expect(proposalsPage.proposalCard(funded).getByTestId('proposal-payments')).toBeVisible({
    timeout: HYDRATION_TIMEOUT
  });
  await expect(proposalsPage.dhfTotalBudget).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  return proposalsPage;
};

/** Each row's height, the details and money lines that wrapped, and how many rows show whole below the summary. */
const measureRows = (page: Page) =>
  page.evaluate(() => {
    // A line's figures wrap onto another line when one of them starts below the first
    const isOneLine = (line: Element) => {
      const tops = [...line.children]
        .filter((child) => child.checkVisibility())
        .map((child) => child.getBoundingClientRect().top);
      return Math.max(...tops) - Math.min(...tops) < parseFloat(getComputedStyle(line).lineHeight) / 2;
    };
    const summaryBottom =
      document.querySelector('[data-testid="dhf-summary"]')?.getBoundingClientRect().bottom ?? 0;
    const rows = [...document.querySelectorAll('[data-testid="proposal-list-item"]')];
    const wrapped = rows.flatMap((row) =>
      [...row.querySelectorAll('[data-testid="proposal-details"], [data-testid="proposal-payments"]')]
        // A proposal not paid at the moment adds its last payment, a fourth figure that may wrap
        .filter((line) => !line.querySelector('[data-testid="proposal-last-paid"]') && !isOneLine(line))
        .map((line) => `#${row.getAttribute('data-proposal-id')} "${line.textContent}"`)
    );
    return {
      heights: rows.map((row) => row.getBoundingClientRect().height),
      wrapped,
      wholeBelowSummary: rows.filter((row) => {
        const box = row.getBoundingClientRect();
        return box.top >= summaryBottom && box.bottom <= window.innerHeight;
      }).length
    };
  });

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test.describe('Proposal rows on a phone', () => {
  test.use({ viewport: PHONE_VIEWPORT });

  for (const locale of LOCALES) {
    test(`WALLET-PROPOSALS-FIT-01 — in ${locale} the details and money lines take one line each`, async ({
      page,
      baseURL
    }) => {
      await openProposals(page, locale, baseURL);

      const { heights, wrapped, wholeBelowSummary } = await measureRows(page);
      expect(wrapped).toEqual([]);
      expect(median(heights), `row heights ${heights.join(', ')}`).toBeLessThanOrEqual(MAX_MEDIAN_ROW_HEIGHT);
      expect(wholeBelowSummary).toBeGreaterThanOrEqual(MIN_ROWS_BELOW_SUMMARY);
    });
  }

  test('WALLET-PROPOSALS-FIT-02 — the daily pay drops its zero cents and the days are short, the desktop forms hidden', async ({
    page,
    baseURL
  }) => {
    const proposalsPage = await openProposals(page, 'en', baseURL);
    const details = proposalsPage.proposalCard(funded).getByTestId('proposal-details');

    await expect(details.getByText('200 HBD/day', { exact: true })).toBeVisible();
    await expect(details.getByText('213d left', { exact: true })).toBeVisible();
    await expect(details.getByTestId('proposal-amount')).toBeHidden();
    await expect(details.getByTestId('proposal-remaining-days')).toBeHidden();
    await expect(
      proposalsPage.proposalCard(upcoming).getByTestId('proposal-details').getByText(/^starts in \d+d$/)
    ).toBeVisible();
  });
});

test.describe('Proposals search on a desktop', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  for (const locale of LOCALES) {
    test(`WALLET-PROPOSALS-FIT-03 — in ${locale} the search box shows its whole placeholder`, async ({
      page,
      baseURL
    }) => {
      const proposalsPage = await openProposals(page, locale, baseURL);
      await expect(proposalsPage.proposalCard(funded).getByTestId('proposal-remaining-days')).toBeVisible();

      const { placeholderWidth, contentWidth } = await proposalsPage.proposalsSearch.evaluate(
        (input: HTMLInputElement) => {
          const style = getComputedStyle(input);
          const span = document.createElement('span');
          span.style.font = style.font;
          span.style.letterSpacing = style.letterSpacing;
          span.style.whiteSpace = 'pre';
          span.style.position = 'absolute';
          span.textContent = input.placeholder;
          document.body.append(span);
          const width = span.getBoundingClientRect().width;
          span.remove();
          return {
            placeholderWidth: width,
            contentWidth: input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
          };
        }
      );
      expect(placeholderWidth).toBeLessThanOrEqual(contentWidth);
    });
  }
});
