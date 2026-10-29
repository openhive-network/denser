import type { Server } from 'node:http';
import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { PROPOSALS_PAYMENTS_PATH, STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';
import { PROPOSALS_PAGE_REST_RESULTS, PROPOSALS_PAGE_RESULTS, STUB_PROPOSALS } from '../support/proposalsApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';

/**
 * Each proposal card's Paid and To pay, from balance-api's proposal payments: one call for the
 * listed proposals, and on nodes without the endpoint (404) the cards as they are without it, after
 * one request that leaves the node's balance-api in use.
 * The stub node (support/proposalsApiStub.ts) has paid #11 30,200 HBD of its 72,800 HBD (200 HBD
 * over 364 days) and the expired #15 1,510 HBD; the upcoming #14 (10 HBD over 151 days) nothing yet.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');
const CORS = { 'access-control-allow-origin': '*' };
const { funded, upcoming, expired } = STUB_PROPOSALS;
const FIXTURE_API_ORIGIN = `http://127.0.0.1:${FIXTURE_API_PORT}`;
/** A REST node selected by the user; not an allowed node, hence `bypassCSP`. */
const SELECTED_REST_NODE = 'http://127.0.0.1:8298';
const DELEGATIONS_PATH = `/balance-api/accounts/${STUB_ACCOUNT}/delegations`;
/** PostgREST's answer for a path its balance-api version does not have. */
const MISSING_ENDPOINT = {
  code: 'PGRST125',
  details: null,
  hint: null,
  message: 'Invalid path specified in request URL'
};
const INCOMING = { delegator: 'stub-delegator', amount: '1650000000000', operation_id: '1', block_num: 100_000_000 };

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

const isApiNode = (url: URL) => url.origin === SELECTED_REST_NODE || url.port === String(FIXTURE_API_PORT);

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

  test.describe('with a selected REST node', () => {
    test.use({ bypassCSP: true });

    test('WALLET-PROPOSALS-PAID-02 — on nodes answering 404 the cards render without Paid and To pay, the endpoint is asked once, nothing is reported and balance-api keeps its node', async ({
      context,
      page
    }) => {
      const reported: string[] = [];
      const failedApiResources: string[] = [];
      const report = (message: ConsoleMessage) => {
        // Chromium's own line for a failed response is not the page's doing; offline, images fail too.
        if (message.text().startsWith('Failed to load resource')) {
          const url = new URL(message.location().url);
          if (isApiNode(url)) failedApiResources.push(url.pathname);
          return;
        }
        if (['error', 'warning'].includes(message.type())) reported.push(`${message.type()}: ${message.text()}`);
      };
      page.on('console', report);
      page.on('pageerror', (error) => reported.push(`pageerror: ${error.message}`));
      const paymentsCalls: string[] = [];
      const delegationsCalls: string[] = [];
      await context.addInitScript((node) => {
        window.localStorage.setItem('rest-node-endpoint', JSON.stringify(node));
      }, SELECTED_REST_NODE);
      // Every node lacks the payments endpoint; only the selected one is asked for the delegations.
      await context.route(isApiNode, async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === PROPOSALS_PAYMENTS_PATH) {
          paymentsCalls.push(url.origin);
          return route.fulfill({ status: 404, json: MISSING_ENDPOINT, headers: CORS });
        }
        if (url.pathname === DELEGATIONS_PATH) delegationsCalls.push(url.origin);
        if (url.origin !== SELECTED_REST_NODE) return route.fallback();
        if (url.pathname === DELEGATIONS_PATH) {
          return route.fulfill({
            json: { outgoing_delegations: [], incoming_delegations: [INCOMING] },
            headers: CORS
          });
        }
        const response = await route.fetch({ url: `${FIXTURE_API_ORIGIN}${url.pathname}${url.search}` });
        return route.fulfill({ response });
      });
      const answered = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' && new URL(response.url()).pathname === PROPOSALS_PAYMENTS_PATH
      );

      const proposalsPage = await openProposals(page);
      expect((await answered).status()).toBe(404);

      const card = proposalsPage.proposalCard(funded);
      await expect(card.getByTestId('proposal-amount')).toBeVisible();
      await expect(card.getByTestId('proposal-remaining-days')).toHaveText('213 days left');
      await expect(page.getByTestId('proposal-paid')).toHaveCount(0);
      await expect(page.getByTestId('proposal-to-pay')).toHaveCount(0);
      await expect(page.getByTestId('error-toast-content')).toHaveCount(0);

      // A proposal not listed before: the 404 is remembered rather than asked again.
      await proposalsPage.statusTab('Expired').click();
      await expect(proposalsPage.proposalCard(expired).getByTestId('proposal-amount')).toBeVisible();
      await expect(page.getByTestId('proposal-paid')).toHaveCount(0);

      await page.evaluate((href) => {
        // App Router exposes its router on `window.next` in every build; a soft navigation keeps the
        // page's JavaScript state, including the node health it learned. It adds the base path itself.
        (window as Window & { next?: { router?: { push: (href: string) => void } } }).next?.router?.push(href);
      }, `/@${STUB_ACCOUNT}/delegations`);
      await expect(page.getByTestId('wallet-incoming-delegation-item')).toContainText(INCOMING.delegator);

      expect(paymentsCalls).toEqual([SELECTED_REST_NODE]);
      expect(delegationsCalls).toEqual([SELECTED_REST_NODE]);
      expect(reported).toEqual([]);
      expect(failedApiResources).toEqual([PROPOSALS_PAYMENTS_PATH]);
    });
  });
});
