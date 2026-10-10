import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { settleAfterLoad } from '../support/wasmRequests';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { cspOf, nonceOf, recordCspViolations, scriptSrcOf, scriptTagsWithoutNonce } from '../support/csp';

/**
 * Nonce-based Content-Security-Policy (packages/middleware/lib/csp.ts).
 *
 * Every page response allows scripts by a nonce of its own, never by 'unsafe-inline' or
 * 'unsafe-eval', and every <script> the server renders carries that nonce; the trending feed
 * then loads and hydrates, and the sign-in dialog opens and validates, without a single violation.
 * cspPost, cspProfile and cspEditor check the other pages with their own recordings.
 *
 * CSP-01 checks a production build: `next dev` (the dev stack) adds 'unsafe-eval' for React's
 * dev build, so it fails there by design.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- cspNonce.spec
 */

test.use({ fixtureTestName: 'homeMainPage' });

test.describe('Content-Security-Policy — nonce', () => {
  test('CSP-01: each page response has a fresh script nonce, on every server-rendered script', async ({
    request
  }) => {
    const nonces: string[] = [];
    for (let i = 0; i < 2; i++) {
      const response = await request.get('/trending');
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

  test('CSP-02: the trending feed loads with no CSP violation', async ({ page }) => {
    const violations = await recordCspViolations(page);

    await page.goto('/trending');
    await expect(page.getByTestId('post-list-item').first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await settleAfterLoad(page);

    expect(violations, violations.join('\n')).toEqual([]);
  });

  test('CSP-03: the sign-in dialog opens and validates with no CSP violation', async ({ page }) => {
    const violations = await recordCspViolations(page);
    const homePage = new HomePage(page);
    const loginForm = new LoginForm(page);

    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.loginBtn).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await homePage.loginBtn.click();
    await expect(loginForm.usernameInput).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await loginForm.usernameInput.fill('ak');
    await expect(loginForm.usernameErrorMessage).toHaveText('Account name should be longer.');
    // Not networkidle: the dialog starts hb-auth's worker, whose request stays open.
    await page.evaluate(() => new Promise((resolve) => window.requestIdleCallback(resolve, { timeout: 5_000 })));

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
