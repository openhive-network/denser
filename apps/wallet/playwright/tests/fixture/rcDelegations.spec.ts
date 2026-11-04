import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { installBroadcastInterceptor, type InterceptedBroadcast } from '../support/broadcastInterceptor';
import {
  STUB_ACCOUNT,
  STUB_DELEGATEE,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * /@account/delegations shows each outgoing RC delegation (amount, delegatee, Revoke) as one row of
 * the one-column Resource Credits table: each amount and the total below them sit centred under its
 * heading, the delegatee and Revoke inside the same column, and nothing of it in the HIVE POWER
 * column. Revoke asks in a dialog first and broadcasts one `delegate_rc` of zero RC once confirmed.
 * The other reads come
 * from the stub node (support/walletApiStub.ts); the RC delegations call is answered by each test
 * through `page.route`, the broadcast and `verify_authority` by the interceptor.
 */

const RC_DELEGATIONS_METHOD = 'rc_api.list_rc_direct_delegations';
const RC_DELEGATEE = 'stub-rc-delegatee';
const RC_DELEGATION = { from: STUB_ACCOUNT, to: RC_DELEGATEE, delegated_rc: 200_000_000 };
const HYDRATION_TIMEOUT = 30_000;
/** Randomly generated, of no account. */
const POSTING_WIF = '5JSTSDF5nUcChE6SeyWG28ktUevv1Bg6rUnmueRQw2cxyGqE4oT';
const PHONE_VIEWPORT = { width: 375, height: 812 };

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

const delegationsPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/delegations`;

const rcHeader = (page: Page) =>
  page.getByTestId('wallet-rc-delegations').getByRole('columnheader', { name: 'Resource Credits' });

/** `element` lies horizontally within the Resource Credits column header. */
const expectWithinRcHeader = async (page: Page, element: Locator) => {
  const [header, rect] = await Promise.all([box(rcHeader(page)), box(element)]);
  expect(rect.x).toBeGreaterThanOrEqual(header.x - 1);
  expect(rect.x + rect.width).toBeLessThanOrEqual(header.x + header.width + 1);
};

/** `cell` lies horizontally within the Resource Credits column header, centred under its heading. */
const expectUnderRcHeader = async (page: Page, cell: Locator) => {
  await expectWithinRcHeader(page, cell);
  const headingCentre = await centreX(page.getByRole('heading', { name: 'Resource Credits' }));
  const textCentre = await cell.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    return text.x + text.width / 2;
  });
  expect(Math.abs(textCentre - headingCentre)).toBeLessThanOrEqual(1);
};

/** The total sits below the RC rows, in the Resource Credits column. */
const expectTotalUnderRcHeader = async (page: Page) => {
  const rcColumn = page.getByTestId('wallet-rc-delegations');
  const total = rcColumn.getByTestId('wallet-rc-delegations-total');
  const body = rcColumn.locator('tbody');
  const bodyBox = await box(body);
  expect((await box(total)).y).toBeGreaterThanOrEqual(bodyBox.y + bodyBox.height);
  await expectUnderRcHeader(page, total);
};

/** The `[name, payload]` JSON of the one `custom_json_operation` an RC revoke broadcasts. */
const rcCustomJson = (call: InterceptedBroadcast) => {
  const trx = (call.params as { trx?: { operations?: { type?: string; value?: Record<string, unknown> }[] } })
    .trx;
  expect(trx?.operations).toHaveLength(1);
  const operation = trx?.operations?.[0];
  expect(operation?.type).toBe('custom_json_operation');
  expect(operation?.value).toMatchObject({ id: 'rc', required_auths: [], required_posting_auths: [STUB_ACCOUNT] });
  return JSON.parse(String(operation?.value?.json));
};

/** Opens the revoke dialog of the RC delegation to RC_DELEGATEE, logged in as STUB_ACCOUNT with its posting key. */
const openRcRevokeDialog = async (page: Page) => {
  await logInAsStubAccount(page, 'posting');
  await storeStubAccountKey(page, 'posting', POSTING_WIF);
  await routeRcDelegations(page, [RC_DELEGATION]);
  await page.goto(delegationsPage);

  const revoke = page.getByTestId('wallet-rc-delegation-item').getByRole('button', { name: 'Revoke' });
  const dialog = page.getByRole('dialog', {
    name: `Are you sure you want to revoke RC delegation to @${RC_DELEGATEE}?`
  });
  await expect(async () => {
    await revoke.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return dialog;
};

/** The amount of the RC row centred under the heading, its delegatee and Revoke in the same column. */
const expectRcRowInRcColumn = async (page: Page) => {
  const row = page.getByTestId('wallet-rc-delegation-item');
  await expectUnderRcHeader(page, row.getByTestId('wallet-rc-delegation-amount'));
  await expectWithinRcHeader(page, row.getByTestId('wallet-rc-delegation-delegatee'));
  await expectWithinRcHeader(page, row.getByRole('button', { name: 'Revoke' }));
};

/** The HIVE POWER column's right edge, from the row of the stub's HP delegation. */
const hivePowerColumnRight = async (page: Page) => {
  const rect = await box(page.getByTestId('wallet-delegation-item'));
  return rect.x + rect.width;
};

test.describe('Wallet RC delegations', () => {
  test('WALLET-RC-DELEGATIONS-01 — an RC delegation and the total render in the Resource Credits column', async ({
    page
  }) => {
    await routeRcDelegations(page, [RC_DELEGATION]);

    await page.goto(delegationsPage);

    const rcColumn = page.getByTestId('wallet-rc-delegations');
    const rcRows = page.getByTestId('wallet-rc-delegation-item');
    await expect(rcRows).toHaveCount(1);
    await expect(rcRows.nth(0).getByTestId('wallet-rc-delegation-amount')).toHaveText('0.20bil');
    await expect(rcRows.nth(0).getByTestId('wallet-rc-delegation-delegatee')).toHaveText(`@${RC_DELEGATEE}`);
    await expect(rcColumn.getByTestId('wallet-rc-delegations-total')).toHaveText('total: 0.20bil');
    await expect(page.getByTestId('wallet-delegation-item')).toContainText(STUB_DELEGATEE);

    expect((await box(rcRows.nth(0).getByRole('cell'))).x).toBeGreaterThanOrEqual(
      await hivePowerColumnRight(page)
    );
    await expectUnderRcHeader(page, rcRows.nth(0).getByTestId('wallet-rc-delegation-amount'));
    await expectTotalUnderRcHeader(page);
  });

  test('WALLET-RC-DELEGATIONS-02 — with no RC delegations the notice and a zero total stay in the Resource Credits column', async ({
    page
  }) => {
    await routeRcDelegations(page, []);

    await page.goto(delegationsPage);

    const rcColumn = page.getByTestId('wallet-rc-delegations');
    await expect(rcColumn).toContainText('No delegations found');
    await expect(rcColumn.getByTestId('wallet-rc-delegations-total')).toHaveText('total: 0.00bil');
    await expect(page.getByTestId('wallet-rc-delegation-item')).toHaveCount(0);
    await expect(page.getByTestId('wallet-delegation-item')).toContainText(STUB_DELEGATEE);

    await expectTotalUnderRcHeader(page);
  });

  test('WALLET-RC-DELEGATIONS-03 — on a phone the RC amount and the total sit under the Resource Credits header', async ({
    page
  }) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    await routeRcDelegations(page, [RC_DELEGATION]);

    await page.goto(delegationsPage);

    const amount = page.getByTestId('wallet-rc-delegation-item').getByTestId('wallet-rc-delegation-amount');
    await expect(amount).toHaveText('0.20bil');
    await expectUnderRcHeader(page, amount);
    await expectTotalUnderRcHeader(page);
  });

  for (const [width, viewport] of [
    ['desktop', { width: 1280, height: 900 }],
    ['phone', PHONE_VIEWPORT]
  ] as const) {
    test(`WALLET-RC-DELEGATIONS-06 — on ${width} the owner's RC row keeps its delegatee and Revoke in the Resource Credits column`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await logInAsStubAccount(page, 'posting');
      await routeRcDelegations(page, [RC_DELEGATION]);

      await page.goto(delegationsPage);

      await expect(
        page.getByTestId('wallet-rc-delegation-item').getByRole('button', { name: 'Revoke' })
      ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
      await expectRcRowInRcColumn(page);
      await expectTotalUnderRcHeader(page);
    });
  }

  test('WALLET-RC-DELEGATIONS-04 — confirming the revoke dialog broadcasts one delegate_rc of zero RC', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openRcRevokeDialog(page);
    await expect(dialog.getByRole('textbox').nth(1)).toHaveValue(RC_DELEGATEE);
    await expect(dialog.getByRole('textbox').nth(2)).toHaveValue('0.20bil');
    expect(broadcasts.calls).toHaveLength(0);

    await dialog.getByRole('button', { name: 'Ok' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    const [name, payload] = rcCustomJson(broadcasts.calls[0]);
    expect(name).toBe('delegate_rc');
    expect(payload).toMatchObject({ from: STUB_ACCOUNT, delegatees: [RC_DELEGATEE] });
    expect(String(payload.max_rc)).toBe('0');
  });

  test('WALLET-RC-DELEGATIONS-05 — cancelling the revoke dialog broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openRcRevokeDialog(page);

    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });
});
