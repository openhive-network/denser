import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';

/**
 * The Keys & Permissions info graphic is served from the wallet's base path: a root `/permissions.png`
 * lands outside the wallet and answers with an HTML page. The API answers come from the stub node
 * (support/walletApiStub.ts).
 */

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
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

test.describe('Keys & Permissions graphic', () => {
  test('WALLET-PERMISSIONS-01 — the info graphic loads from the wallet base path', async ({ page }) => {
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/permissions`);

    const graphic = page.getByAltText('Diagram of Hive keys and their permissions');
    await expect(graphic).toHaveAttribute('src', `${WALLET_BASE_PATH}/permissions.png`);
    await expect.poll(() => graphic.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });
});
