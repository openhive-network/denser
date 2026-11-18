import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startApiStub } from '../support/apiStub';
import { WITNESS_RESULTS } from '../support/witnessApiStub';
import {
  HAFBE_WHALE,
  HAFBE_WITNESS,
  NAMES_ONLY_WITNESS,
  VOTERS_JSON_RPC_RESULTS,
  VOTERS_REST_RESULTS,
  VOTER_COUNT,
  witnessVoterName
} from '../support/votersApiStub';

/**
 * The witness page's voters dialog (support/votersApiStub.ts): a witness's voters by weight from
 * hafbe-api, a page of 100 rows at a time as the list is scrolled, the search, and the voters by
 * name only of a witness hafbe-api does not serve. Nothing asks hafbe-api before the dialog opens.
 */

const HYDRATION_TIMEOUT = 30_000;
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };
const ROW_HEIGHT = 40;

let stub: Server;

test.beforeAll(async () => {
  stub = await startApiStub({
    jsonRpc: { ...WITNESS_RESULTS, 'database_api.list_witness_votes': VOTERS_JSON_RPC_RESULTS['database_api.list_witness_votes'] },
    rest: VOTERS_REST_RESULTS
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

const openWitnessesPage = async (page: Page, lang: 'en' | 'pl', baseURL: string | undefined) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: lang, url: baseURL }]);
  await page.goto(`${WALLET_BASE_PATH}/~witnesses`);
  await expect(page.getByTestId('witness-voters-trigger').first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });
};

const witnessRow = (page: Page, owner: string) =>
  page
    .getByTestId('witness-table-body')
    .locator('tr')
    .filter({ has: page.getByTestId('witness-name-link').getByText(owner, { exact: true }) });

/** Opens the voters of `owner` from its row's "Voters" link and waits for its first rows. */
const openVoters = async (page: Page, owner: string): Promise<Locator> => {
  await witnessRow(page, owner).getByTestId('witness-voters-trigger').click();
  const dialog = page.getByTestId('witness-voters-dialog');
  await expect(dialog.getByTestId('voter-row').first()).toBeVisible();
  return dialog;
};

/** The distinct left edges of the first `count` rows: one per column. */
const columnCount = (rows: Locator, count: number) =>
  rows.evaluateAll(
    (items, n) => new Set(items.slice(0, n).map((item) => Math.round(item.getBoundingClientRect().left))).size,
    count
  );

/** The heights of the rows other than ROW_HEIGHT, i.e. rows that wrapped. */
const rowHeightsOtherThan = (rows: Locator, height: number) =>
  rows.evaluateAll(
    (items, expected) => items.map((item) => item.getBoundingClientRect().height).filter((h) => Math.round(h) !== expected),
    height
  );

/** The weights and shares among the first `count` rows that their column cuts off with an ellipsis or wraps. */
const clippedTexts = (rows: Locator, count: number) =>
  rows.evaluateAll(
    (items, n) =>
      items
        .slice(0, n)
        .flatMap((item) => [
          ...item.querySelectorAll<HTMLElement>('[data-testid="voter-values-dialog"], [data-testid="voter-share"]')
        ])
        .filter((element) => element.scrollWidth > element.clientWidth || element.getClientRects().length > 1)
        .map((element) => element.textContent),
    count
  );

test.describe('Witness voters dialog', () => {
  test('WALLET-WITNESS-VOTERS-01 — the Voters link shows the count, the total, the bar and one-line rows by weight in three columns', async ({
    page,
    baseURL
  }) => {
    const hafbeRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/hafbe-api/')) hafbeRequests.push(request.url());
    });
    await page.setViewportSize(DESKTOP);
    await openWitnessesPage(page, 'en', baseURL);
    expect(hafbeRequests).toEqual([]);

    const dialog = await openVoters(page, HAFBE_WITNESS);
    await expect(dialog.getByTestId('witness-id-dialog')).toHaveText(`@${HAFBE_WITNESS}`);
    await expect(dialog.getByRole('heading')).toHaveText(`Votes for witness @${HAFBE_WITNESS}`);
    await expect(dialog.getByTestId('voters-summary')).toHaveText(new RegExp(`^${VOTER_COUNT} voters · [\\d.]+M HP$`));

    const rows = dialog.getByTestId('voter-row');
    await expect(rows).toHaveCount(100);
    const whale = rows.first();
    await expect(whale.getByTestId('proposal-voter-link-dialog')).toHaveText(HAFBE_WHALE);
    await expect(whale.getByTestId('voter-values-dialog')).toHaveText(/^[\d.]+M HP \+[\d.]+M proxy$/);
    await expect(whale.getByTestId('voter-values-dialog')).toHaveAttribute('title', /^[\d,]+\.\d{3} HP own \+ [\d,]+\.\d{3} HP proxied$/);
    await expect(whale.getByTestId('voter-share')).toHaveText('40.0%');
    await expect(rows.nth(1).getByTestId('proposal-voter-link-dialog')).toHaveText(witnessVoterName(1));
    await expect(rows.nth(1).getByTestId('voter-values-dialog')).toHaveText(/^[\d.]+K HP$/);

    const segments = dialog.getByTestId('voters-bar-segment');
    await expect(segments.first()).toHaveAttribute('title', `@${HAFBE_WHALE} · 40.0%`);
    await expect(segments.last()).toHaveAttribute('title', /^\d+ others · [\d.]+%$/);
    await segments.last().hover();
    await expect(dialog.getByTestId('voters-bar-label')).toHaveText(/^\d+ others · [\d.]+%$/);

    expect(await columnCount(rows, 6)).toBe(3);
    expect(await rowHeightsOtherThan(rows, ROW_HEIGHT)).toEqual([]);
    expect(hafbeRequests).toHaveLength(1);
  });

  test('WALLET-WITNESS-VOTERS-02 — scrolling to the end loads the next pages until every voter is listed', async ({
    page,
    baseURL
  }) => {
    await page.setViewportSize(DESKTOP);
    await openWitnessesPage(page, 'en', baseURL);
    const dialog = await openVoters(page, HAFBE_WITNESS);
    const rows = dialog.getByTestId('voter-row');
    await expect(rows).toHaveCount(100);

    await dialog.getByTestId('voters-load-more').scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(200);
    await dialog.getByTestId('voters-load-more').scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(VOTER_COUNT);
    await expect(dialog.getByTestId('voters-load-more')).toHaveCount(0);
    await expect(rows.last().getByTestId('proposal-voter-link-dialog')).toHaveText(witnessVoterName(VOTER_COUNT - 1));
  });

  test('WALLET-WITNESS-VOTERS-03 — the search filters the loaded voters and finds a named voter not loaded yet', async ({
    page,
    baseURL
  }) => {
    await page.setViewportSize(DESKTOP);
    await openWitnessesPage(page, 'en', baseURL);
    const dialog = await openVoters(page, HAFBE_WITNESS);
    const names = dialog.getByTestId('proposal-voter-link-dialog');

    await dialog.getByTestId('voters-search').fill('voter-05');
    await expect(names).toHaveText(Array.from({ length: 10 }, (_, index) => witnessVoterName(50 + index)));

    const notLoaded = witnessVoterName(240);
    await dialog.getByTestId('voters-search').fill(`@${notLoaded}`);
    await expect(names).toHaveText([notLoaded]);
    await expect(dialog.getByTestId('voter-share')).toHaveText(['<0.1%']);

    await dialog.getByTestId('voters-search').fill('nobody-like-this');
    await expect(dialog.getByTestId('voters-empty')).toHaveText('No voter matches the search.');
  });

  test('WALLET-WITNESS-VOTERS-04 — without hafbe-api the voters are listed by name, with the note and without the bar', async ({
    page,
    baseURL
  }) => {
    await page.setViewportSize(DESKTOP);
    await openWitnessesPage(page, 'en', baseURL);
    const dialog = await openVoters(page, NAMES_ONLY_WITNESS);

    await expect(dialog.getByTestId('voters-weights-unavailable')).toBeVisible();
    await expect(dialog.getByTestId('voters-breakdown-bar')).toHaveCount(0);
    await expect(dialog.getByTestId('voters-summary')).toHaveText('100+ voters');
    const rows = dialog.getByTestId('voter-row');
    await expect(rows).toHaveCount(100);
    await expect(rows.first()).toHaveText('stub-name-000');
    await expect(dialog.getByTestId('voter-share')).toHaveCount(0);

    await dialog.getByTestId('voters-load-more').scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(200);
    await dialog.getByTestId('voters-load-more').scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(VOTER_COUNT);
    await expect(dialog.getByTestId('voters-summary')).toHaveText(`${VOTER_COUNT} voters`);
  });

  test('WALLET-WITNESS-VOTERS-05 — in Polish on a phone the vote total opens the dialog full screen, one column, nothing sideways', async ({
    page,
    baseURL
  }) => {
    await page.setViewportSize(PHONE);
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL }]);
    await page.goto(`${WALLET_BASE_PATH}/~witnesses`);
    const trigger = witnessRow(page, HAFBE_WITNESS).getByTestId('witness-voters-trigger-phone');
    await expect(trigger).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await trigger.click();

    const dialog = page.getByTestId('witness-voters-dialog');
    const rows = dialog.getByTestId('voter-row');
    await expect(rows).toHaveCount(100);
    await expect(dialog.getByRole('heading')).toHaveText(`Głosy na świadka @${HAFBE_WITNESS}`);
    await expect(dialog.getByTestId('voters-summary')).toHaveText(new RegExp(`^${VOTER_COUNT} głosów · [\\d.]+M HP$`));
    await expect(rows.first().getByTestId('voter-values-dialog')).toHaveText(/^[\d.]+M HP \+[\d.]+M z proxy$/);
    expect((await dialog.boundingBox())?.width).toBe(PHONE.width);
    expect(await columnCount(rows, 3)).toBe(1);
    expect(await rowHeightsOtherThan(rows, ROW_HEIGHT)).toEqual([]);
    const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
  for (const lang of ['en', 'pl'] as const) {
    test(`WALLET-WITNESS-VOTERS-06 — in ${lang} at 1280 px the largest weights fit their column without an ellipsis`, async ({
      page,
      baseURL
    }) => {
      await page.setViewportSize(DESKTOP);
      await openWitnessesPage(page, lang, baseURL);
      const dialog = await openVoters(page, HAFBE_WITNESS);
      const rows = dialog.getByTestId('voter-row');
      await expect(rows).toHaveCount(100);

      expect(await columnCount(rows, 6)).toBe(3);
      expect(await clippedTexts(rows, 60)).toEqual([]);
      expect(await rowHeightsOtherThan(rows, ROW_HEIGHT)).toEqual([]);
    });
  }
});
