import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';

/**
 * A proposal's duration on the proposals page carries its number of days in every plural form:
 * the stub node's one proposal runs for a single day, from 2026-09-29 to 2026-09-30.
 */

const HYDRATION_TIMEOUT = 30_000;
const ONE_DAY_PROPOSAL_SUBJECT = 'One-day stub proposal';

const oneDayProposal = {
  id: 7,
  proposal_id: 7,
  creator: STUB_ACCOUNT,
  receiver: STUB_ACCOUNT,
  start_date: '2026-09-29T00:00:00',
  end_date: '2026-09-30T00:00:00',
  daily_pay: { amount: '110000', precision: 3, nai: '@@000000013' },
  subject: ONE_DAY_PROPOSAL_SUBJECT,
  permlink: 'one-day-stub-proposal',
  total_votes: '50000000000000000',
  status: 'active'
};

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    'database_api.list_proposals': () => ({ proposals: [oneDayProposal] })
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

const openProposalsPage = async (page: Page, baseURL: string | undefined, locale: string) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL }]);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  await expect(page.getByTestId('proposal-title')).toContainText(ONE_DAY_PROPOSAL_SUBJECT, {
    timeout: HYDRATION_TIMEOUT
  });
};

test('WALLET-PROPOSAL-DURATION-01 — a one-day proposal shows its duration with the number of days', async ({
  page,
  baseURL
}) => {
  await openProposalsPage(page, baseURL, 'pl');
  await expect(page.getByTestId('proposal-date')).toContainText('(1 dzień)');

  await openProposalsPage(page, baseURL, 'en');
  await expect(page.getByTestId('proposal-date')).toContainText('(1 day)');
});
