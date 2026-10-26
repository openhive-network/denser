import type { Server } from 'node:http';
import { test, expect, type Page, type Request } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { startWalletApiStub } from '../support/walletApiStub';
import {
  PROPOSALS_PAGE_REST_RESULTS,
  SEARCH_EXTRA_PROPOSALS,
  SEARCH_PAGE_RESULTS,
  SEARCH_PROPOSALS,
  SEARCH_TERM,
  STUB_PROPOSALS
} from '../support/proposalsApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';

/**
 * Each status tab's listing is read whole, in one `list_proposals` call; the list renders its first
 * proposals and reveals the rest on scroll, and the search filters the whole listing without
 * another call. The stub node (support/proposalsApiStub.ts, SEARCH_PAGE_RESULTS) has more votable
 * proposals than the list renders at first; "Keychain" is in the subject of one rendered at first
 * and of one past them.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const FIRST_PAGE_SIZE = 30;
const { onFirstPage, pastFirstPage } = SEARCH_PROPOSALS;
const { funded, stabilizer, returnProposal, belowLine, upcoming, burn } = STUB_PROPOSALS;
/** The votable listing in vote order: the stub's votable proposals, then the extra ones. */
const VOTABLE_IN_VOTE_ORDER = [
  funded,
  stabilizer,
  returnProposal,
  belowLine,
  upcoming,
  burn,
  ...Array.from({ length: SEARCH_EXTRA_PROPOSALS }, (_, index) => 100 + index)
];

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

/** Opens the proposals page and waits for the first proposals of the votable listing. */
const openProposals = async (page: Page) => {
  const proposalsPage = new ProposalsPage(page);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  await expect(proposalsPage.proposalCard(STUB_PROPOSALS.funded)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await expect(proposalsPage.proposalListItem).toHaveCount(FIRST_PAGE_SIZE);
  await expect(proposalsPage.proposalCard(pastFirstPage)).toHaveCount(0);
  return proposalsPage;
};

test.describe('Proposals search', () => {
  test('WALLET-PROPOSALS-SEARCH-01 — a search finds a proposal past the rendered ones, from the one call that read the whole listing', async ({
    page
  }) => {
    const calls = recordVotableListCalls(page);
    const proposalsPage = await openProposals(page);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ limit: 1000 });
    expect(calls[0]).not.toHaveProperty('last_id');

    await proposalsPage.proposalsSearch.pressSequentially(SEARCH_TERM);
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([onFirstPage, pastFirstPage]);

    await proposalsPage.proposalsSearch.pressSequentially(' for mobile');
    await expect.poll(() => proposalsPage.listedProposalIds()).toEqual([pastFirstPage]);
    await proposalsPage.proposalsSearch.fill('');
    await expect(proposalsPage.proposalListItem).toHaveCount(FIRST_PAGE_SIZE);
    await proposalsPage.proposalsSearch.pressSequentially('community work 13');
    await expect
      .poll(() => proposalsPage.listedProposalIds())
      .toEqual([130, 131, 132, 133, 134, 135, 136, 137, 138]);

    await proposalsPage.proposalsSearch.fill('nothing like this');
    await expect(page.getByTestId('proposals-no-search-results')).toHaveText(
      'No proposal matches your search.'
    );
    expect(calls).toHaveLength(1);
  });

  test('WALLET-PROPOSALS-SEARCH-02 — scrolling reveals the rest of the listing in order, each proposal once, without another call', async ({
    page
  }) => {
    const calls = recordVotableListCalls(page);
    const proposalsPage = await openProposals(page);
    expect(await proposalsPage.listedProposalIds()).toEqual(VOTABLE_IN_VOTE_ORDER.slice(0, FIRST_PAGE_SIZE));

    await expect
      .poll(async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return proposalsPage.proposalListItem.count();
      })
      .toBe(VOTABLE_IN_VOTE_ORDER.length);
    expect(await proposalsPage.listedProposalIds()).toEqual(VOTABLE_IN_VOTE_ORDER);
    expect(calls).toHaveLength(1);
  });
});
