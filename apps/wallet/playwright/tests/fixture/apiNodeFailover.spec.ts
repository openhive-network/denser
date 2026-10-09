import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { startWalletApiStub } from '../support/walletApiStub';

/**
 * When the browser's selected API node is unreachable, the wallet switches to a node that answers
 * (one of the allowed nodes, here the stub node) and the page loads its data from it. The switch
 * lasts for the browser session only and never overwrites the node the user chose.
 */

const DEAD_NODE = 'http://127.0.0.1:8299';
const HEALTHY_NODE = `http://127.0.0.1:${FIXTURE_API_PORT}`;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.use({ bypassCSP: true });

// See anonymousNoWasm.spec.ts: without a network Chromium would pause every query.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

const readNodeStorage = (page: Page) =>
  page.evaluate(() => ({
    selected: window.localStorage.getItem('node-endpoint'),
    automatic: window.sessionStorage.getItem('auto-node-endpoint')
  }));

test('WALLET-API-FAILOVER-01 — /market loads from another node when the selected one refuses connections', async ({
  context,
  page
}) => {
  const deadNodeRequests: string[] = [];
  await context.addInitScript((node) => {
    window.localStorage.setItem('node-endpoint', JSON.stringify(node));
  }, DEAD_NODE);
  await context.route(`${DEAD_NODE}/**`, (route) => {
    deadNodeRequests.push(route.request().url());
    return route.abort('connectionrefused');
  });

  await page.goto(`${WALLET_BASE_PATH}/market`);
  await expect(page.getByTestId('market-last-price-value')).toContainText('0.250000');

  expect(deadNodeRequests.length).toBeGreaterThan(0);
  expect(await readNodeStorage(page)).toEqual({
    selected: JSON.stringify(DEAD_NODE),
    automatic: JSON.stringify({ replaced: DEAD_NODE, node: HEALTHY_NODE })
  });
});
