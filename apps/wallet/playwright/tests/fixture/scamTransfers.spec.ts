import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub, stubTransfer } from '../support/walletApiStub';

/**
 * Incoming transfers from known scam accounts (the shared bad-actor list) and from the accounts the
 * viewer muted are hidden from the account history behind one "Show" line that says which of the
 * two they came from; the transfers the account sent to them stay listed.
 */

const OPERATIONS_URL = new RegExp(`/hivemind-api/accounts/${STUB_ACCOUNT}/operations\\?`);
/** On packages/ui/config/lists/bad-actor-list.ts */
const BAD_ACTOR = 'appreciatorr';
const NORMAL_SENDER = 'normal-sender';
const MUTED_SENDER = 'muted-sender';
const SCAM_MEMO = 'Claim your airdrop at https://phishing.example';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    'bridge.get_follow_list': () => [
      { name: MUTED_SENDER, blacklist_description: '', muted_list_description: '' }
    ]
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

const transferToBadActor = () => {
  const transfer = stubTransfer({ from: STUB_ACCOUNT, operationId: '104' });
  return { ...transfer, op: { ...transfer.op, value: { ...transfer.op.value, to: BAD_ACTOR } } };
};

const routeOperations = (page: Page, operations: unknown[]) =>
  page.route(OPERATIONS_URL, (route) =>
    route.fulfill({
      json: {
        total_operations: operations.length,
        total_pages: 1,
        block_range: { from: 1, to: 100_000_000 },
        operations_result: operations
      },
      headers: { 'access-control-allow-origin': '*' }
    })
  );

const historyRows = (page: Page) => page.getByTestId('wallet-account-history-row');
const hiddenNotice = (page: Page) => page.getByTestId('wallet-account-history-scam-hidden');
const noticeText = (page: Page) => page.getByTestId('wallet-account-history-scam-hidden-text');
const showHidden = (page: Page) => page.getByTestId('wallet-account-history-scam-show').click();

test.describe('Wallet account history from scam accounts', () => {
  test('WALLET-SCAM-01 — an incoming transfer from a bad actor is hidden behind Show, an outgoing one to it is not', async ({
    page
  }) => {
    await routeOperations(page, [
      stubTransfer({ from: BAD_ACTOR, operationId: '101', memo: SCAM_MEMO }),
      stubTransfer({ from: NORMAL_SENDER, operationId: '102', memo: 'thanks' }),
      transferToBadActor()
    ]);

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    await expect(historyRows(page)).toHaveCount(2);
    await expect(historyRows(page).first()).toContainText(`from ${NORMAL_SENDER}`);
    await expect(historyRows(page).last()).toContainText(`to ${BAD_ACTOR}`);
    await expect(noticeText(page)).toHaveText('1 transfer from known scam accounts hidden');
    await expect(page.getByText(SCAM_MEMO)).toHaveCount(0);

    await showHidden(page);

    await expect(historyRows(page)).toHaveCount(3);
    const scamRow = historyRows(page).filter({ hasText: `from ${BAD_ACTOR}` });
    await expect(scamRow).toContainText(SCAM_MEMO);
    await expect(hiddenNotice(page)).toHaveCount(0);
  });

  test('WALLET-SCAM-02 — logged in, transfers from bad actors and muted accounts are hidden and counted apart', async ({
    page
  }) => {
    await logInAsStubAccount(page);
    await routeOperations(page, [
      stubTransfer({ from: MUTED_SENDER, operationId: '201', memo: SCAM_MEMO }),
      stubTransfer({ from: BAD_ACTOR, operationId: '202' }),
      stubTransfer({ from: BAD_ACTOR, operationId: '203' }),
      stubTransfer({ from: NORMAL_SENDER, operationId: '204' })
    ]);

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    await expect(noticeText(page)).toHaveText(
      '3 transfers hidden (2 from known scam accounts, 1 from accounts you muted)'
    );
    await expect(historyRows(page)).toHaveCount(1);
    await expect(historyRows(page)).toContainText(`from ${NORMAL_SENDER}`);

    await showHidden(page);

    await expect(historyRows(page)).toHaveCount(4);
    await expect(historyRows(page).filter({ hasText: `from ${MUTED_SENDER}` })).toContainText(SCAM_MEMO);
    await expect(hiddenNotice(page)).toHaveCount(0);
  });

  test('WALLET-SCAM-03 — logged in, transfers only from muted accounts are not called scam', async ({
    page
  }) => {
    await logInAsStubAccount(page);
    await routeOperations(page, [
      stubTransfer({ from: MUTED_SENDER, operationId: '301', memo: SCAM_MEMO }),
      stubTransfer({ from: MUTED_SENDER, operationId: '302' }),
      stubTransfer({ from: NORMAL_SENDER, operationId: '303' })
    ]);

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    await expect(noticeText(page)).toHaveText('2 transfers from accounts you muted hidden');
    await expect(historyRows(page)).toHaveCount(1);

    await showHidden(page);

    await expect(historyRows(page)).toHaveCount(3);
    await expect(historyRows(page).filter({ hasText: `from ${MUTED_SENDER}` })).toHaveCount(2);
    await expect(hiddenNotice(page)).toHaveCount(0);
  });
});
