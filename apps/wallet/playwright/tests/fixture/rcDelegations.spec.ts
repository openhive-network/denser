import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { STUB_ACCOUNT, STUB_DELEGATEE, startWalletApiStub } from '../support/walletApiStub';

/**
 * /@account/delegations shows each outgoing RC delegation (amount, delegatee) as one row of the
 * Resource Credits table, with its total below that table and centred under its heading, and
 * nothing of it in the HIVE POWER column. The other reads come from the stub node (support/walletApiStub.ts); the RC delegations
 * call is answered by each test through `page.route`.
 */

const RC_DELEGATIONS_METHOD = 'rc_api.list_rc_direct_delegations';
const RC_DELEGATEE = 'stub-rc-delegatee';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.use({ locale: 'en-US', viewport: { width: 1280, height: 900 } });

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

/** Answers the browser's RC delegations call with `delegations`; every other call reaches the stub node. */
const routeRcDelegations = async (page: Page, delegations: unknown[]) => {
  await page.route(
    (url) => url.port === String(FIXTURE_API_PORT),
    async (route) => {
      const request = route.request();
      const body = request.method() === 'POST' ? request.postDataJSON() : undefined;
      if (body?.method !== RC_DELEGATIONS_METHOD) return route.fallback();
      await route.fulfill({
        json: { jsonrpc: '2.0', result: { rc_direct_delegations: delegations }, id: body.id },
        headers: { 'access-control-allow-origin': '*' }
      });
    }
  );
};

const box = async (locator: Locator) => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('element is not rendered');
  return rect;
};

const centreX = async (locator: Locator) => {
  const rect = await box(locator);
  return rect.x + rect.width / 2;
};

/** The total sits below the RC table, outside it, centred under the Resource Credits heading. */
const expectTotalUnderRcTable = async (page: Page) => {
  const rcColumn = page.getByTestId('wallet-rc-delegations');
  const total = rcColumn.getByTestId('wallet-rc-delegations-total');
  const table = rcColumn.locator('table');
  await expect(table.getByTestId('wallet-rc-delegations-total')).toHaveCount(0);
  const tableBox = await box(table);
  expect((await box(total)).y).toBeGreaterThanOrEqual(tableBox.y + tableBox.height);
  const headingCentre = await centreX(rcColumn.getByRole('heading', { name: 'Resource Credits' }));
  expect(Math.abs((await centreX(total)) - headingCentre)).toBeLessThanOrEqual(1);
};

/** The HIVE POWER column's right edge, from the row of the stub's HP delegation. */
const hivePowerColumnRight = async (page: Page) => {
  const rect = await box(page.getByTestId('wallet-delegation-item'));
  return rect.x + rect.width;
};

const delegationsPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/delegations`;

test.describe('Wallet RC delegations', () => {
  test('WALLET-RC-DELEGATIONS-01 — an RC delegation and the total render in the Resource Credits column', async ({
    page
  }) => {
    await routeRcDelegations(page, [{ from: STUB_ACCOUNT, to: RC_DELEGATEE, delegated_rc: 200_000_000 }]);

    await page.goto(delegationsPage);

    const rcColumn = page.getByTestId('wallet-rc-delegations');
    const rcRows = page.getByTestId('wallet-rc-delegation-item');
    await expect(rcRows).toHaveCount(1);
    await expect(rcRows.nth(0).getByRole('cell').nth(0)).toHaveText('0.2bil');
    await expect(rcRows.nth(0).getByRole('cell').nth(1)).toHaveText(`@${RC_DELEGATEE}`);
    await expect(rcColumn.getByTestId('wallet-rc-delegations-total')).toHaveText('total: 0.2bil');
    await expect(page.getByTestId('wallet-delegation-item')).toContainText(STUB_DELEGATEE);

    expect((await box(rcRows.nth(0).getByRole('cell').nth(0))).x).toBeGreaterThanOrEqual(
      await hivePowerColumnRight(page)
    );
    await expectTotalUnderRcTable(page);
  });

  test('WALLET-RC-DELEGATIONS-02 — with no RC delegations the notice and a zero total stay in the Resource Credits column', async ({
    page
  }) => {
    await routeRcDelegations(page, []);

    await page.goto(delegationsPage);

    const rcColumn = page.getByTestId('wallet-rc-delegations');
    await expect(rcColumn).toContainText('No delegations found');
    await expect(rcColumn.getByTestId('wallet-rc-delegations-total')).toHaveText('total: 0.0bil');
    await expect(page.getByTestId('wallet-rc-delegation-item')).toHaveCount(0);
    await expect(page.getByTestId('wallet-delegation-item')).toContainText(STUB_DELEGATEE);

    await expectTotalUnderRcTable(page);
  });
});
