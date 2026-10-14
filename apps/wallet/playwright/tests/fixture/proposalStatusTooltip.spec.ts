import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_PROPOSAL_SUBJECT, startWalletApiStub } from '../support/walletApiStub';

/**
 * The status tooltip of a proposal on the proposals page reads in the wallet's language, with the
 * relative start and end times inside the sentence. The stub node's one proposal is active from
 * 2026-01-01 to 2027-01-01; the clock is fixed between the two so it has started and not finished.
 */

const HYDRATION_TIMEOUT = 30_000;
const NOW = new Date('2026-06-01T00:00:00Z');

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
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

/** Opens the proposals page in `locale` and hovers the proposal's status badge; resolves with the tooltip. */
const openStatusTooltip = async (page: Page, baseURL: string | undefined, locale: string) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL }]);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  await expect(page.getByTestId('proposal-title')).toContainText(STUB_PROPOSAL_SUBJECT, {
    timeout: HYDRATION_TIMEOUT
  });
  const tooltip = page.getByRole('tooltip');
  await expect(async () => {
    await page.mouse.move(0, 0);
    await page.getByTestId('proposal-status-badge').hover();
    await expect(tooltip).toBeAttached({ timeout: 2000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return tooltip;
};

test.describe('Proposal status tooltip', () => {
  test('WALLET-PROPOSAL-TOOLTIP-01 — in English the tooltip says when the proposal started and finishes', async ({
    page,
    baseURL
  }) => {
    const tooltip = await openStatusTooltip(page, baseURL, 'en');

    await expect(page.getByTestId('proposal-status-badge')).toHaveText('started');
    await expect(tooltip).toHaveText(/^Started \d+ months? ago and finishes in \d+ months?$/);
  });

  test('WALLET-PROPOSAL-TOOLTIP-02 — in Polish the tooltip and its relative times are Polish', async ({
    page,
    baseURL
  }) => {
    const tooltip = await openStatusTooltip(page, baseURL, 'pl');

    await expect(page.getByTestId('proposal-status-badge')).toHaveText('rozpoczęta');
    await expect(tooltip).toHaveText(/^Rozpoczęta \d+ miesi\S+ temu, kończy się za \d+ miesi\S+$/);
  });

  test('WALLET-PROPOSAL-DATE-01 — the proposal dates are written in the format of the wallet language', async ({
    page,
    baseURL
  }) => {
    await openStatusTooltip(page, baseURL, 'pl');
    await expect(page.getByTestId('proposal-date')).toContainText('1 sty 2026 - 1 sty 2027');

    await openStatusTooltip(page, baseURL, 'en');
    await expect(page.getByTestId('proposal-date')).toContainText('Jan 1, 2026 - Jan 1, 2027');
  });
});
