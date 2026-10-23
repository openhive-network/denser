import type { Server } from 'node:http';
import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { PROPOSALS_PAYMENTS_PATH, startWalletApiStub } from '../support/walletApiStub';
import { PROPOSALS_PAGE_REST_RESULTS, PROPOSALS_PAGE_RESULTS, STUB_PROPOSALS } from '../support/proposalsApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';

/**
 * Each proposal card's Paid and To pay, from balance-api's proposal payments: one call for the
 * listed proposals, and on a node without the endpoint (404) the cards as they are without it.
 * The stub node (support/proposalsApiStub.ts) has paid #11 30,200 HBD of its 72,800 HBD (200 HBD
 * over 364 days) and the expired #15 1,510 HBD; the upcoming #14 (10 HBD over 151 days) nothing yet.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const CORS = { 'access-control-allow-origin': '*' };
const { funded, upcoming, expired } = STUB_PROPOSALS;

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

const isPaymentsRequest = (url: URL) =>
  url.port === String(FIXTURE_API_PORT) && url.pathname === PROPOSALS_PAYMENTS_PATH;

/** Records the proposal ids of each payments call the browser makes. */
const recordPaymentsCalls = (page: Page) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && isPaymentsRequest(url)) calls.push(url.searchParams.get('proposal-ids') ?? '');
  });
  return calls;
};

/** Opens the proposals page and waits for its list. */
const openProposals = async (page: Page) => {
  const proposalsPage = new ProposalsPage(page);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  await expect(proposalsPage.proposalCard(funded)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  return proposalsPage;
};

test.describe('Proposals page payments', () => {
  test('WALLET-PROPOSALS-PAID-01 — cards show Paid and, until a proposal expires, To pay, from one bulk call', async ({
    page
  }) => {
    const calls = recordPaymentsCalls(page);
    const proposalsPage = await openProposals(page);

    const card = proposalsPage.proposalCard(funded);
    await expect(card.getByTestId('proposal-paid')).toHaveText('Paid 30.20K HBD');
    await expect(card.getByTestId('proposal-paid').locator('[title]')).toHaveAttribute('title', '30,200.00 HBD');
    await expect(card.getByTestId('proposal-to-pay')).toHaveText('To pay 42.60K HBD');
    await expect(proposalsPage.proposalCard(upcoming).getByTestId('proposal-paid')).toHaveText('Paid 0.00 HBD');
    await expect(proposalsPage.proposalCard(upcoming).getByTestId('proposal-to-pay')).toHaveText(
      'To pay 1.51K HBD'
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].split(',').map(Number).sort((a, b) => a - b)).toEqual(
      [...(await proposalsPage.listedProposalIds())].sort((a, b) => a - b)
    );

    await proposalsPage.statusTab('Expired').click();
    const expiredCard = proposalsPage.proposalCard(expired);
    await expect(expiredCard.getByTestId('proposal-paid')).toHaveText('Paid 1.51K HBD');
    await expect(expiredCard.getByTestId('proposal-to-pay')).toHaveCount(0);
    // Only the expired proposal was not known yet.
    expect(calls).toEqual([calls[0], String(expired)]);
  });

  test('WALLET-PROPOSALS-PAID-02 — on a node answering 404 the cards render without Paid and To pay, and nothing is reported', async ({
    page
  }) => {
    const reported: string[] = [];
    const report = (message: ConsoleMessage) => {
      // Chromium's own line for the 404 response is not the page's doing.
      if (message.text().startsWith('Failed to load resource')) return;
      if (['error', 'warning'].includes(message.type())) reported.push(`${message.type()}: ${message.text()}`);
    };
    page.on('console', report);
    page.on('pageerror', (error) => reported.push(`pageerror: ${error.message}`));
    await page.route(
      (url) => isPaymentsRequest(url),
      (route) => route.fulfill({ status: 404, json: { code: 'PGRST', message: 'Not found' }, headers: CORS })
    );
    const answered = page.waitForResponse(
      (response) => response.request().method() === 'GET' && isPaymentsRequest(new URL(response.url()))
    );

    const proposalsPage = await openProposals(page);
    expect((await answered).status()).toBe(404);

    const card = proposalsPage.proposalCard(funded);
    await expect(card.getByTestId('proposal-amount')).toBeVisible();
    await expect(card.getByTestId('proposal-remaining-days')).toHaveText('213 days left');
    await expect(page.getByTestId('proposal-paid')).toHaveCount(0);
    await expect(page.getByTestId('proposal-to-pay')).toHaveCount(0);
    await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
    expect(reported).toEqual([]);
  });
});
