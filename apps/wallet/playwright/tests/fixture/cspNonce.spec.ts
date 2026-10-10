import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { LoginForm } from '../support/pages/loginForm';
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
 * or 'unsafe-eval', and the transfers page, its transfer dialog and the sign-in dialog raise no
 * violation. The API answers come from the stub node (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;
const TRANSFERS_PATH = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`;
const MARKET_PATH = `${WALLET_BASE_PATH}/market`;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As transferMemoSecret.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
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

  test('WALLET-CSP-02 — the transfers page and the transfer dialog raise no CSP violation', async ({ page }) => {
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

  test('WALLET-CSP-03 — the sign-in dialog opens and validates with no CSP violation', async ({ page }) => {
    const violations = await recordCspViolations(page);
    const loginForm = new LoginForm(page);

    await page.goto(MARKET_PATH);
    await expect(async () => {
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });
    await expect(loginForm.usernameInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await loginForm.usernameInput.fill('ak');
    await expect(loginForm.usernameErrorMessage).toHaveText('Account name should be longer.');
    // Not networkidle: the dialog starts hb-auth's worker, whose request stays open.
    await page.evaluate(() => new Promise((resolve) => window.requestIdleCallback(resolve, { timeout: 5_000 })));

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
