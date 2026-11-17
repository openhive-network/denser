import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startApiStub } from '../support/apiStub';
import { STUB_WITNESSES, WITNESS_RESULTS, stubWitness } from '../support/witnessApiStub';

/**
 * The desktop price-feed and version cells of the witness table fit their columns at 1280 px with the
 * longest narrow relative times a feed shows ("10 mies. temu", "11mo ago", years), in Polish and
 * English. The test image has only one narrow sans font, so each cell is also measured with extra
 * letter spacing, standing in for the wider system fonts readers have (DejaVu Sans, Noto Sans).
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-11-04T12:00:00Z');
const DAY_MS = 86_400_000;
/** About 19 % wider text, more than DejaVu Sans is over the test image's Liberation Sans. */
const WIDER_FONT_LETTER_SPACING = '0.1em';

/** Feed ages in days, oldest month counts first: 10 and 11 months, then 2 years. */
const FEED_AGES_IN_DAYS = [310, 340, 740];
const EXPECTED_TIMES = {
  pl: ['10 mies. temu', '11 mies. temu', /^2 (l\.|lata) temu$/],
  en: ['10mo ago', '11mo ago', '2y ago']
} as const;

/** Zoneless, as the node returns it. */
const feedDate = (days: number) => new Date(NOW.getTime() - days * DAY_MS).toISOString().slice(0, 19);

let stub: Server;

test.beforeAll(async () => {
  stub = await startApiStub({
    jsonRpc: {
      ...WITNESS_RESULTS,
      'database_api.list_witnesses': () => ({
        witnesses: STUB_WITNESSES.map((entry, index) => ({
          ...stubWitness(entry, index),
          last_hbd_exchange_update: feedDate(FEED_AGES_IN_DAYS[index])
        }))
      })
    }
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.use({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

/** The cells of `testId` whose content is wider than the cell, as "text: content/cell". */
const overflowingCells = (page: Page, testId: string) =>
  page
    .getByTestId(testId)
    .evaluateAll((cells) =>
      cells
        .filter((cell) => cell.scrollWidth > cell.clientWidth)
        .map((cell) => `${cell.textContent}: ${cell.scrollWidth}/${cell.clientWidth}`)
    );

const rowHeights = (page: Page) =>
  page
    .getByTestId('witness-table-body')
    .locator('tr')
    .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));

const expectCellsToFit = async (page: Page) => {
  expect(await overflowingCells(page, 'witness-price-feed-cell')).toEqual([]);
  expect(await overflowingCells(page, 'witness-version')).toEqual([]);
};

for (const lang of ['pl', 'en'] as const) {
  test(`WALLET-WITNESSES-WIDTH-01 — the longest ${lang} price-feed times fit their column at 1280 px`, async ({
    page,
    context,
    baseURL
  }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: lang, url: baseURL }]);
    await page.clock.setFixedTime(NOW);
    await page.goto(`${WALLET_BASE_PATH}/~witnesses`);

    const cells = page.getByTestId('witness-price-feed-cell');
    await expect(cells.locator('time')).toHaveText([...EXPECTED_TIMES[lang]], { timeout: HYDRATION_TIMEOUT });
    const heights = await rowHeights(page);

    await expectCellsToFit(page);

    await page.addStyleTag({
      content: `[data-testid="witness-table-body"] td { letter-spacing: ${WIDER_FONT_LETTER_SPACING}; }`
    });
    await expectCellsToFit(page);
    // The wider text does not wrap a row onto another line
    expect(await rowHeights(page)).toEqual(heights);
  });
}
