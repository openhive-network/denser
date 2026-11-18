import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';
import { PROPOSALS_PAGE_REST_RESULTS, PROPOSALS_PAGE_RESULTS } from '../support/proposalsApiStub';
import {
  PROPOSAL_VIA_PROXY_VOTER,
  PROPOSAL_WHALE,
  VOTED_PROPOSAL,
  VOTERS_JSON_RPC_RESULTS,
  VOTER_COUNT,
  proposalVoterName
} from '../support/votersApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';

/**
 * The proposals page's voters dialog (support/votersApiStub.ts): every voter of the proposal
 * ranked by weight, with the count, the total and the breakdown bar, 100 rows at a time as the
 * list is scrolled, the search, and the reader's own row highlighted.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(
    undefined,
    { ...PROPOSALS_PAGE_RESULTS, ...VOTERS_JSON_RPC_RESULTS },
    PROPOSALS_PAGE_REST_RESULTS
  );
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

/** Opens the voters of VOTED_PROPOSAL and waits for its first rows. */
const openVoters = async (page: Page, lang: 'en' | 'pl', baseURL: string | undefined) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: lang, url: baseURL }]);
  const proposalsPage = new ProposalsPage(page);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  const trigger = proposalsPage.proposalCard(VOTED_PROPOSAL).getByTestId('vote-proposals-dialog-trigger');
  await expect(trigger).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await trigger.click();
  const dialog = page.getByTestId('vote-proposals-dialog');
  await expect(dialog.getByTestId('voter-row').first()).toBeVisible();
  return dialog;
};

test.describe('Proposal voters dialog', () => {
  test('WALLET-PROPOSAL-VOTERS-01 — the voters by weight, with the count, total, bar and shares, three columns of one-line rows', async ({
    page,
    baseURL
  }) => {
    await page.setViewportSize(DESKTOP);
    const dialog = await openVoters(page, 'en', baseURL);

    await expect(dialog.getByTestId('proposal-id-dialog')).toHaveText(`#${VOTED_PROPOSAL}`);
    await expect(dialog.getByTestId('voters-summary')).toHaveText(new RegExp(`^${VOTER_COUNT} voters · [\\d.]+[KM] HP$`));
    const rows = dialog.getByTestId('voter-row');
    await expect(rows).toHaveCount(100);
    await expect(rows.first().getByTestId('proposal-voter-link-dialog')).toHaveText(PROPOSAL_WHALE);
    await expect(rows.first().getByTestId('voter-values-dialog')).toHaveText(/^[\d.]+K HP \+[\d.]+K proxy$/);
    await expect(rows.first().getByTestId('voter-share')).toHaveText(/^\d+\.\d%$/);
    await expect(rows.nth(1).getByTestId('proposal-voter-link-dialog')).toHaveText(STUB_ACCOUNT);
    await expect(rows.nth(2).getByTestId('proposal-voter-link-dialog')).toHaveText(proposalVoterName(0));

    const segments = dialog.getByTestId('voters-bar-segment');
    await expect(segments.first()).toHaveAttribute('title', /^@stub-proposal-whale · \d+\.\d%$/);
    await segments.first().hover();
    await expect(dialog.getByTestId('voters-bar-label')).toHaveText(/^@stub-proposal-whale · \d+\.\d%$/);

    const lefts = await rows.evaluateAll((items) =>
      items.slice(0, 6).map((item) => Math.round(item.getBoundingClientRect().left))
    );
    expect(new Set(lefts).size).toBe(3);
    const heights = await rows.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
    expect(heights.filter((height) => Math.round(height) !== 40)).toEqual([]);
  });

  test('WALLET-PROPOSAL-VOTERS-02 — scrolling shows 100 rows more each time, and the search filters by name', async ({
    page,
    baseURL
  }) => {
    await page.setViewportSize(DESKTOP);
    const dialog = await openVoters(page, 'en', baseURL);
    const rows = dialog.getByTestId('voter-row');

    await dialog.getByTestId('voters-load-more').scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(200);
    await dialog.getByTestId('voters-load-more').scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(VOTER_COUNT);
    await expect(dialog.getByTestId('voters-load-more')).toHaveCount(0);
    // A voter who set a proxy comes last, with the proxy in place of a weight and no share.
    const viaProxy = rows.last();
    await expect(viaProxy.getByTestId('proposal-voter-link-dialog')).toHaveText(PROPOSAL_VIA_PROXY_VOTER);
    await expect(viaProxy.getByTestId('voter-via-proxy')).toHaveText(`votes via @${PROPOSAL_WHALE}`);
    await expect(viaProxy.getByTestId('voter-share')).toHaveCount(0);

    await dialog.getByTestId('voters-search').fill('PVOTER-24');
    await expect(dialog.getByTestId('proposal-voter-link-dialog')).toHaveText(
      Array.from({ length: 8 }, (_, index) => proposalVoterName(240 + index))
    );
    await dialog.getByTestId('voters-search').fill('nobody-like-this');
    await expect(dialog.getByTestId('voters-empty')).toBeVisible();
  });

  test("WALLET-PROPOSAL-VOTERS-03 — the signed-in reader's own row is highlighted", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await logInAsStubAccount(page, 'posting');
    const dialog = await openVoters(page, 'en', baseURL);

    const own = dialog.locator('[data-testid="voter-row"][data-own]');
    await expect(own).toHaveCount(1);
    await expect(own.getByTestId('proposal-voter-link-dialog')).toHaveText(`${STUB_ACCOUNT} (your vote)`);
  });

  test('WALLET-PROPOSAL-VOTERS-04 — in Polish on a phone the dialog is full screen, one column, nothing sideways', async ({
    page,
    baseURL
  }) => {
    await page.setViewportSize(PHONE);
    const dialog = await openVoters(page, 'pl', baseURL);

    await expect(dialog.getByTestId('voters-summary')).toHaveText(new RegExp(`^${VOTER_COUNT} głosów · [\\d.]+[KM] HP$`));
    await expect(dialog.getByTestId('voter-row').first().getByTestId('voter-values-dialog')).toHaveText(
      /^[\d.]+K HP \+[\d.]+K z proxy$/
    );
    expect((await dialog.boundingBox())?.width).toBe(PHONE.width);
    const lefts = await dialog
      .getByTestId('voter-row')
      .evaluateAll((items) => items.slice(0, 3).map((item) => Math.round(item.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  });
});
