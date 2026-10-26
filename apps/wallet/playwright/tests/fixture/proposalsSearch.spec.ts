import type { Server } from 'node:http';
import { test, expect, type Page, type Request, type Route } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { startWalletApiStub } from '../support/walletApiStub';
import {
  PROPOSALS_PAGE_REST_RESULTS,
  SEARCH_PAGE_RESULTS,
  SEARCH_PROPOSALS,
  SEARCH_TERM,
  STUB_PROPOSALS
} from '../support/proposalsApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';

/**
 * The proposals search covers the whole listing of the status tab, not only the pages loaded so
 * far: the first search of a listing loads the rest of it in one call, and what is typed after
 * filters that. The stub node (support/proposalsApiStub.ts, SEARCH_PAGE_RESULTS) has more votable
 * proposals than the first page holds; "Keychain" is in the subject of one on it and one past it.
 */

const HYDRATION_TIMEOUT = 30_000;
/** React Query's three retries of a failed read, 1 + 2 + 4 s apart, with room to spare. */
const RETRIES_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const FIRST_PAGE_SIZE = 30;
const { onFirstPage, pastFirstPage } = SEARCH_PROPOSALS;

interface ListProposalsCall {
  status?: string;
  limit?: number;
  last_id?: number;
}

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, SEARCH_PAGE_RESULTS, PROPOSALS_PAGE_REST_RESULTS);
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

/** The params of the request's `database_api.list_proposals` call of the votable listing, if it is one. */
const votableListCall = (request: Request): ListProposalsCall | undefined => {
  if (request.method() !== 'POST' || new URL(request.url()).port !== String(FIXTURE_API_PORT))
    return undefined;
  const body: unknown = request.postDataJSON();
  const calls = Array.isArray(body) ? body : [body];
  for (const call of calls) {
    if (call?.method !== 'database_api.list_proposals') continue;
    const params: ListProposalsCall = call.params ?? {};
    if (params.status === 'votable') return params;
  }
  return undefined;
};

/** Records the params of each call for the votable listing the browser makes. */
const recordVotableListCalls = (page: Page) => {
  const calls: ListProposalsCall[] = [];
  page.on('request', (request) => {
    const call = votableListCall(request);
    if (call) calls.push(call);
  });
  return calls;
};

/** Routes the calls for the rest of the votable listing (limit above a page) to `handler`. */
const routeRestOfListing = (page: Page, handler: (route: Route) => Promise<void>) =>
  page.route(
    (url) => url.port === String(FIXTURE_API_PORT),
    async (route) => {
      const call = votableListCall(route.request());
      if (call && (call.limit ?? 0) > FIRST_PAGE_SIZE) return handler(route);
      return route.fallback();
    }
  );

/** Opens the proposals page and waits for the first page of the votable listing. */
const openProposals = async (page: Page) => {
  const proposalsPage = new ProposalsPage(page);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  await expect(proposalsPage.proposalCard(STUB_PROPOSALS.funded)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await expect(proposalsPage.proposalListItem).toHaveCount(FIRST_PAGE_SIZE);
  await expect(proposalsPage.proposalCard(pastFirstPage)).toHaveCount(0);
  return proposalsPage;
};

test.describe('Proposals search', () => {
  test('WALLET-PROPOSALS-SEARCH-01 — a search finds a proposal past the loaded page, with one more call however much is typed', async ({
    page
  }) => {
    const calls = recordVotableListCalls(page);
    const proposalsPage = await openProposals(page);
    const lastLoaded = (await proposalsPage.listedProposalIds()).at(-1);
    expect(calls).toHaveLength(1);

    await proposalsPage.proposalsSearch.pressSequentially(SEARCH_TERM);
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([onFirstPage, pastFirstPage]);
    expect(calls).toHaveLength(2);
    // The rest starts at the last loaded proposal, the cursor of the next page.
    expect(calls[1]).toMatchObject({ limit: 1000, last_id: lastLoaded });

    await proposalsPage.proposalsSearch.pressSequentially(' for mobile');
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([pastFirstPage]);
    await proposalsPage.proposalsSearch.fill('');
    await expect(proposalsPage.proposalListItem).toHaveCount(FIRST_PAGE_SIZE);
    await proposalsPage.proposalsSearch.pressSequentially('community work 13');
    await expect
      .poll(() => proposalsPage.listedProposalIds())
      .toEqual([130, 131, 132, 133, 134, 135, 136, 137, 138]);
    expect(calls).toHaveLength(2);
  });

  test('WALLET-PROPOSALS-SEARCH-02 — while the rest of the listing loads the page says so, not that nothing matches', async ({
    page
  }) => {
    let release = () => {};
    const released = new Promise<void>((resolve) => (release = resolve));
    await routeRestOfListing(page, async (route) => {
      await released;
      await route.fallback();
    });
    const proposalsPage = await openProposals(page);

    await proposalsPage.proposalsSearch.fill(SEARCH_TERM);
    await expect(page.getByTestId('proposals-search-loading')).toHaveText('Searching all proposals…');
    await expect(page.getByTestId('proposals-no-search-results')).toHaveCount(0);
    await expect(proposalsPage.proposalListItem).toHaveCount(0);

    release();
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([onFirstPage, pastFirstPage]);
    await expect(page.getByTestId('proposals-search-loading')).toHaveCount(0);
    await expect(page.getByTestId('proposals-search-incomplete')).toHaveCount(0);
  });

  test('WALLET-PROPOSALS-SEARCH-03 — when the rest of the listing fails to load, the loaded proposals are searched and the results called incomplete', async ({
    page
  }) => {
    await routeRestOfListing(page, (route) => route.fulfill({ status: 503, body: 'unavailable' }));
    const proposalsPage = await openProposals(page);

    await proposalsPage.proposalsSearch.fill(SEARCH_TERM);
    await expect(page.getByTestId('proposals-search-incomplete')).toHaveText(
      'Not every proposal could be loaded, so the results may be incomplete.',
      { timeout: RETRIES_TIMEOUT }
    );
    expect(await proposalsPage.listedProposalIds()).toEqual([onFirstPage]);

    await proposalsPage.proposalsSearch.fill('nothing like this');
    await expect(page.getByTestId('proposals-no-search-results')).toHaveText(
      'No proposal matches your search.'
    );
  });
});
