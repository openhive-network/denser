import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';
import {
  cspOf,
  nonceOf,
  recordCspViolations,
  scriptSrcOf,
  scriptTagsWithoutNonce
} from '../../../../blog/playwright/tests/support/csp';

/**
 * Nonce-based Content-Security-Policy (packages/middleware/lib/csp.ts), as the blog's
 * cspNonce.spec.ts: each page response allows scripts by a fresh nonce, never by 'unsafe-inline'
 * or 'unsafe-eval', and the transfers page and its transfer dialog raise no violation. The API
 * answers come from the stub node (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;
const TRANSFERS_PATH = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

test.describe('Content-Security-Policy — nonce', () => {
  test('WALLET-CSP-01 — each page response has a fresh script nonce, on every server-rendered script', async ({
    request
  }) => {
    const nonces: string[] = [];
    for (let i = 0; i < 2; i++) {
      const response = await request.get(TRANSFERS_PATH);
      expect(response.status()).toBe(200);
      const policy = cspOf(response);
      const scriptSrc = scriptSrcOf(policy);

      expect(scriptSrc).toContain("'strict-dynamic'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
      const nonce = nonceOf(policy) ?? '';
      expect(nonce, policy).toMatch(/^[A-Za-z0-9+/]{16,}={0,2}$/);
      expect(scriptTagsWithoutNonce(await response.text(), nonce)).toEqual([]);
      nonces.push(nonce);
    }
    expect(nonces[0]).not.toBe(nonces[1]);
  });

  test('WALLET-CSP-02 — the transfers page and the transfer dialog raise no CSP violation', async ({
    context,
    page
  }) => {
    // As transferMemoSecret.spec.ts: without a network Chromium reports offline and React Query pauses.
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'onLine', {
        configurable: true,
        get: () => true
      });
    });
    const violations = await recordCspViolations(page);
    await logInAsStubAccount(page);

    await page.goto(TRANSFERS_PATH);
    const menuTrigger = page.getByTestId('wallet-hive-value').getByRole('button');
    const menu = page.getByRole('menu');
    await expect(async () => {
      await menuTrigger.click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });
    await menu.getByText('Transfer', { exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Transfer To Account', exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
