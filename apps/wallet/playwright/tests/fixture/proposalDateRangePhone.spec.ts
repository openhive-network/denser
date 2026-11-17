import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';

/**
 * On a phone a proposal's row leaves its date range, written with the full month names, to its
 * title's tooltip text, and nothing in it makes the page scroll sideways: the stub node's one
 * proposal runs from September to September, the longest month name in Spanish and English.
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

        test(`WALLET-PROPOSAL-DATE-02 — at ${width}px in ${locale} the date range is in the title text and the row stays inside the page`, async ({
          page,
          baseURL
        }) => {
          await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL }]);
          await page.goto(`${WALLET_BASE_PATH}/proposals`);
          await expect(page.getByTestId('proposal-title')).toContainText(SUBJECT, { timeout: HYDRATION_TIMEOUT });

          await expect(page.getByTestId('proposal-date')).toBeHidden();
          // The long, genitive-capable month form stays
          await expect(page.getByTestId('proposal-post-link')).toHaveAttribute(
            'title',
            new RegExp(locale === 'es' ? '29 de septiembre de 2026' : 'September 29, 2026')
          );

          const cardBox = await page.getByTestId('proposal-list-item').boundingBox();
          expect(cardBox).not.toBeNull();
          if (!cardBox) return;
          expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(width);

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
