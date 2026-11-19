import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startWalletApiStub } from '../support/walletApiStub';
import {
  REAL_SIZE_PAGE_REST_RESULTS,
  REAL_SIZE_PAGE_RESULTS,
  REAL_SIZE_PROPOSALS,
  STUB_PROPOSALS
} from '../support/proposalsApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';

/**
 * How the proposals page fits its space: on a phone each proposal's title and money lines take one
 * line each, in the short forms ("200 HBD/day", "213d left", "Wypł.", "(22 d.)"), a long title cut
 * short; only a proposal not paid at the moment, whose money line adds its last payment, may take
 * another. The details line shows its author whole, its figures wrapping onto a second line when
 * they do not fit beside it. On a desktop titles show whole, the labels in full, and the search
 * box is wide enough for its whole placeholder. The stub node is support/proposalsApiStub.ts: its
 * REAL_SIZE_PROPOSALS, titles and amounts the size of the live list's, above the seven, with #11's
 * payments as in proposalsPaid.spec.ts.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const PHONE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
const MAX_MEDIAN_ROW_HEIGHT = 95;
const MAX_DETAILS_LINES = 2;
const MIN_ROWS_BELOW_SUMMARY = 4;
const LOCALES = ['en', 'pl'] as const;
const { funded, upcoming, belowLine } = STUB_PROPOSALS;
const { longest } = REAL_SIZE_PROPOSALS;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, REAL_SIZE_PAGE_RESULTS, REAL_SIZE_PAGE_REST_RESULTS);
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
  for (const id of [funded, longest]) {
    await expect(proposalsPage.proposalCard(id).getByTestId('proposal-payments')).toBeVisible({
      timeout: HYDRATION_TIMEOUT
    });
  }
  await expect(proposalsPage.proposalCard(longest).getByTestId('proposal-paid')).toBeVisible();
  await expect(proposalsPage.dhfTotalBudget).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  return proposalsPage;
};

/**
 * Each row's height, the titles and money lines that wrapped, the details lines taking more than
 * MAX_DETAILS_LINES, the authors not shown whole, and how many rows show whole below the summary.
 */
const measureRows = (page: Page, maxDetailsLines: number) =>
  page.evaluate((maxLines) => {
    // How many lines a line's figures take: one more for each that starts below the one before
    const lineCount = (line: Element) => {
      const lineHeight = parseFloat(getComputedStyle(line).lineHeight);
      const tops = [...line.children]
        .filter((child) => child.checkVisibility())
        .map((child) => child.getBoundingClientRect().top)
        .sort((a, b) => a - b);
      return 1 + tops.filter((top, index) => index > 0 && top - tops[index - 1] >= lineHeight / 2).length;
    };
    const label = (row: Element, element: Element) =>
      `#${row.getAttribute('data-proposal-id')} "${element.textContent}"`;
    const summaryBottom =
      document.querySelector('[data-testid="dhf-summary"]')?.getBoundingClientRect().bottom ?? 0;
    const rows = [...document.querySelectorAll('[data-testid="proposal-list-item"]')];
    const wrapped = rows.flatMap((row) =>
      [...row.querySelectorAll('[data-testid="proposal-payments"]')]
        // A proposal not paid at the moment adds its last payment, a fourth figure that may wrap
        .filter((line) => !line.querySelector('[data-testid="proposal-last-paid"]') && lineCount(line) > 1)
        .map((line) => label(row, line))
    );
    const tallDetails = rows.flatMap((row) =>
      [...row.querySelectorAll('[data-testid="proposal-details"]')]
        .filter((line) => lineCount(line) > maxLines)
        .map((line) => label(row, line))
    );
    // Shown whole: not empty, not cut short with an ellipsis and not past the screen's edge
    const clippedAuthors = rows
      .map((row) => [row, row.querySelector('[data-testid="proposal-author"]')] as const)
      .filter(([, author]) => {
        if (!author?.textContent?.trim()) return true;
        const box = author.getBoundingClientRect();
        return author.scrollWidth > author.clientWidth || box.left < 0 || box.right > window.innerWidth;
      })
      .map(([row, author]) => `#${row.getAttribute('data-proposal-id')} "${author?.textContent ?? ''}"`);
    const wrappedTitles = rows.flatMap((row) =>
      [...row.querySelectorAll('[data-testid="proposal-title"]')]
        .filter(
          (title) =>
            title.getBoundingClientRect().height > parseFloat(getComputedStyle(title).lineHeight) * 1.5
        )
        .map((title) => label(row, title))
    );
    return {
      heights: rows.map((row) => row.getBoundingClientRect().height),
      wrapped,
      tallDetails,
      clippedAuthors,
      wrappedTitles,
      wholeBelowSummary: rows.filter((row) => {
        const box = row.getBoundingClientRect();
        return box.top >= summaryBottom && box.bottom <= window.innerHeight;
      }).length
    };
  }, maxDetailsLines);

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test.describe('Proposal rows on a phone', () => {
  test.use({ viewport: PHONE_VIEWPORT });

  for (const locale of LOCALES) {
    test(`WALLET-PROPOSALS-FIT-01 — in ${locale} every author shows whole, the title and money lines take one line each`, async ({
      page,
      baseURL
    }) => {
      await openProposals(page, locale, baseURL);

      const { heights, wrapped, tallDetails, clippedAuthors, wrappedTitles, wholeBelowSummary } =
        await measureRows(page, MAX_DETAILS_LINES);
      expect(clippedAuthors).toEqual([]);
      expect(tallDetails).toEqual([]);
      expect(wrapped).toEqual([]);
      expect(wrappedTitles).toEqual([]);
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

    await expect(details.getByTestId('proposal-amount')).toHaveText('200 HBD/day');
    await expect(details.getByText('213d left', { exact: true })).toBeVisible();
    await expect(details.getByTestId('proposal-remaining-days')).toBeHidden();
    await expect(
      proposalsPage.proposalCard(upcoming).getByTestId('proposal-details').getByText(/^starts in \d+d$/)
    ).toBeVisible();
  });

  test('WALLET-PROPOSALS-FIT-04 — in pl a long title is cut short before its id and the labels and unfunded days are short', async ({
    page,
    baseURL
  }) => {
    const proposalsPage = await openProposals(page, 'pl', baseURL);
    const card = proposalsPage.proposalCard(longest);
    const subject = card.getByTestId('proposal-title').locator('span').first();

    expect(await subject.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await expect(card.getByTestId('proposal-id')).toBeInViewport();
    const linkTitle = await card.getByTestId('proposal-post-link').getAttribute('title');
    expect(linkTitle?.split('\n')).toContain(await subject.textContent());
    await expect(card.getByTestId('proposal-paid')).toHaveText('Wypł. 651,7K', { useInnerText: true });
    await expect(card.getByTestId('proposal-unfunded')).toHaveText('Niesfin. 41,8K (22 d.)', {
      useInnerText: true
    });
    await expect(card.getByTestId('proposal-up-to-left')).toHaveText('Jeszcze maks. 693,5K', {
      useInnerText: true
    });
    await expect(proposalsPage.proposalCard(belowLine).getByTestId('proposal-unfunded')).toHaveText(
      'Niesfin. 7,55K (nigdy)',
      { useInnerText: true }
    );
  });

  test('WALLET-PROPOSALS-FIT-06 — in en a proposal never paid says so in short', async ({ page, baseURL }) => {
    const proposalsPage = await openProposals(page, 'en', baseURL);

    await expect(proposalsPage.proposalCard(belowLine).getByTestId('proposal-unfunded')).toHaveText(
      'Unfunded 7.55K (never)',
      { useInnerText: true }
    );
    await expect(proposalsPage.proposalCard(belowLine).getByTestId('proposal-author')).toHaveText('by stub-bob');
  });
});

test.describe('Proposal rows on a desktop', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('WALLET-PROPOSALS-FIT-05 — in pl a long title shows whole and the labels in full', async ({
    page,
    baseURL
  }) => {
    const proposalsPage = await openProposals(page, 'pl', baseURL);
    const card = proposalsPage.proposalCard(longest);

    expect(
      await card
        .getByTestId('proposal-title')
        .locator('span')
        .first()
        .evaluate((subject) => getComputedStyle(subject).display)
    ).toBe('inline');
    await expect(card.getByTestId('proposal-paid')).toHaveText('Wypłacono 651,7K HBD', {
      useInnerText: true
    });
    await expect(card.getByTestId('proposal-unfunded')).toHaveText('Niesfinansowane 41,8K HBD (22 dni)', {
      useInnerText: true
    });
    await expect(card.getByTestId('proposal-up-to-left')).toHaveText('Jeszcze maks. 693,5K HBD');
    await expect(proposalsPage.proposalCard(belowLine).getByTestId('proposal-unfunded')).toHaveText(
      'Niesfinansowane 7,55K HBD (nigdy nie finansowana)',
      { useInnerText: true }
    );
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
