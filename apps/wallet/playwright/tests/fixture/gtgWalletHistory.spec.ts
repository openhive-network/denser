import { test, expect } from '@playwright/test';
import type { IFixtureProxyHandle } from '../../../../blog/playwright/tests/support/mock-server/fixture-proxy';
import { WALLET_BASE_PATH } from '../support/basePath';
import { WalletPage } from '../support/pages/walletPage';
import { drainMissLabels, isRecordMode, startRecordedApi } from '../support/recordedApi';

/**
 * @gtg's wallet page with its real account history, and the history search by a user that appears
 * in none of it ("No transactions found").
 *
 * The offline equivalent of the @flaky live test in e2e/wallet.spec.ts ("validate searching by
 * unknown user on @gtg wallet page is visible", quarantined in #962), which waited on the live
 * history API. Every read of the page (the server's prefetches and the browser's reads, the
 * account history included) is replayed from `tests/mock/fixtures/gtgWalletHistory/`, recorded
 * against api.hive.blog (see its `_index.json` for when): @gtg's history as it was then.
 * WALLET-HISTORY-03 in accountHistory.spec.ts checks the same search over hand-written operations.
 *
 * Record (needs network): FIXTURE_MODE=record, see support/recordedApi.ts.
 */

const ACCOUNT = 'gtg';
const UNKNOWN_USER = 'unknownuser';
/** The table shows the loaded operations 50 at a time (HISTORY_PAGE_SIZE in history-table.tsx). */
const SHOWN_ROWS = 50;
/** The newest operation of the recorded history page (0010): its HP comes from the recorded globals (0003). */
const NEWEST_ROW = 'Claim rewards: 0.000 HBD and 0.000 HIVE and 48.289 HIVE POWER';
/** The two transfers among the first SHOWN_ROWS recorded operations. */
const RECORDED_TRANSFER = 'Received 0.001 HIVE from hive-grove';

let api: IFixtureProxyHandle;

test.beforeAll(async () => {
  api = await startRecordedApi('gtgWalletHistory');
});

test.afterAll(async () => {
  await api.close();
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

// The miss guard: a request without a recording means the page now reads something the recording
// lacks, and the spec would be checking a page that could not load its data. Re-record.
test.afterEach(async () => {
  const misses = drainMissLabels(api);
  if (!isRecordMode) expect(misses, 'requests with no recording in gtgWalletHistory').toEqual([]);
});

test.describe('Wallet page of @gtg — recorded account history', () => {
  let walletPage: WalletPage;

  test.beforeEach(async ({ page }) => {
    walletPage = new WalletPage(page);
    await page.goto(`${WALLET_BASE_PATH}/@${ACCOUNT}/transfers`);
  });

  test('WALLET-GTG-HISTORY-01 — the history lists the recorded operations of @gtg', async () => {
    const rows = walletPage.walletAccountHistoryRow;
    await expect(rows).toHaveCount(SHOWN_ROWS);
    await expect(walletPage.walletAccountHistoryNoTransactionMsg).toHaveCount(0);
    // Only the amounts are checked: the relative timestamps ("2 hours ago") move with the clock.
    await expect(rows.first()).toContainText(NEWEST_ROW);
    await expect(rows.filter({ hasText: RECORDED_TRANSFER })).toHaveCount(2);
  });

  test('WALLET-GTG-HISTORY-02 — searching by an unknown user shows "No transactions found", and clearing it brings the rows back', async () => {
    await expect(walletPage.walletAccountHistoryRow).toHaveCount(SHOWN_ROWS);

    await walletPage.walletSearchInput.fill(UNKNOWN_USER);
    await expect(walletPage.walletSearchInput).toHaveAttribute('value', UNKNOWN_USER);
    await expect(walletPage.walletAccountHistoryNoTransactionMsg).toHaveText('No transactions found');
    await expect(walletPage.walletAccountHistoryNoTransactionMsg).toHaveCSS('color', 'rgb(252, 165, 165)');
    await expect(walletPage.walletAccountHistoryRow).toHaveCount(0);

    await walletPage.walletSearchInput.fill('');
    await expect(walletPage.walletAccountHistoryRow).toHaveCount(SHOWN_ROWS);
    await expect(walletPage.walletAccountHistoryNoTransactionMsg).toHaveCount(0);
  });
});
