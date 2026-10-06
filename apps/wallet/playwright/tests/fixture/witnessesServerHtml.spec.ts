import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_WITNESSES, startWitnessApiStub } from '../support/witnessApiStub';

/**
 * The witness list is part of the server HTML: with JavaScript off, the table already holds a row
 * per witness, in vote order, with the owners' witness descriptions. The API answers come from
 * the stub node (support/witnessApiStub.ts).
 */

test.use({ javaScriptEnabled: false });

let stub: Server;

test.beforeAll(async () => {
  stub = await startWitnessApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.describe('Witnesses server HTML', () => {
  test('WALLET-WITNESSES-SSR-01 — the witness rows are rendered on the server', async ({ page }) => {
    await page.goto(`${WALLET_BASE_PATH}/~witnesses`);

    const body = page.getByTestId('witness-table-body');
    const rows = body.locator('tr');
    await expect(rows).toHaveCount(STUB_WITNESSES.length);
    await expect(body.getByTestId('witness-name-link')).toHaveText(STUB_WITNESSES.map(({ owner }) => owner));
    await expect(rows.first().getByTestId('witness-votes-received')).toContainText('HP');
    await expect(rows.first().getByTestId('witness-price-feed')).toHaveText('$0.250');
    for (const { description } of STUB_WITNESSES) {
      await expect(body).toContainText(description);
    }
    await expect(body).not.toContainText('Loading');
  });

  test('WALLET-WITNESSES-SSR-02 — the table has fixed column widths', async ({ page }) => {
    await page.goto(`${WALLET_BASE_PATH}/~witnesses`);

    await expect(page.locator('table:has([data-testid="witness-table-body"])')).toHaveCSS('table-layout', 'fixed');
  });
});
