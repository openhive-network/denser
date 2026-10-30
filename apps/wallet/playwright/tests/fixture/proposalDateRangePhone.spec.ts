import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';

/**
 * A proposal's date range, written with the full month names, fits the proposal card on a phone:
 * the stub node's one proposal runs from September to September, the longest month name in
 * Spanish and English, and the page does not scroll sideways.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-10-30T00:00:00Z');
const SUBJECT = 'September to September proposal';
const PHONE_WIDTHS = [320, 375];
const LOCALES = ['es', 'en'];

const septemberProposal = {
  id: 21,
  proposal_id: 21,
  creator: STUB_ACCOUNT,
  receiver: STUB_ACCOUNT,
  start_date: '2026-09-29T00:00:00',
  end_date: '2027-09-29T00:00:00',
  daily_pay: { amount: '100000', precision: 3, nai: '@@000000013' },
  subject: SUBJECT,
  permlink: 'september-proposal',
  total_votes: '50000000000000000',
  status: 'active'
};

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    'database_api.list_proposals': () => ({ proposals: [septemberProposal] })
  });
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

test.describe('Proposal date range on phones', () => {
  for (const width of PHONE_WIDTHS) {
    for (const locale of LOCALES) {
      test.describe(`${width}px, ${locale}`, () => {
        test.use({ viewport: { width, height: 800 } });

        test(`WALLET-PROPOSAL-DATE-02 — at ${width}px in ${locale} the date range stays inside the card`, async ({
          page,
          baseURL
        }) => {
          await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL }]);
          await page.goto(`${WALLET_BASE_PATH}/proposals`);
          await expect(page.getByTestId('proposal-title')).toContainText(SUBJECT, { timeout: HYDRATION_TIMEOUT });

          const date = page.getByTestId('proposal-date');
          // The long, genitive-capable month form stays
          await expect(date).toContainText(locale === 'es' ? 'septiembre' : 'September');

          const card = page.getByTestId('proposal-list-item');
          const dateBox = await date.boundingBox();
          const cardBox = await card.boundingBox();
          expect(dateBox).not.toBeNull();
          expect(cardBox).not.toBeNull();
          if (!dateBox || !cardBox) return;
          expect(dateBox.x + dateBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);

          const { scrollWidth, innerWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth
          }));
          expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
        });
      });
    }
  }
});
