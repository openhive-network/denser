import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { settleAfterLoad } from '../support/wasmRequests';
import { recordCspViolations } from '../support/csp';

/**
 * A post page, and the author card it loads on demand, raise no Content-Security-Policy
 * violation (see cspNonce.spec.ts).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- cspPost.spec
 */

test.use({ fixtureTestName: 'postDetail_popover' });

test('CSP-03: a post page and the author popover card raise no CSP violation', async ({ page }) => {
  const violations = await recordCspViolations(page);

  await page.goto('/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit');
  await expect(page.getByTestId('article-title')).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);

  await page.getByTestId('author-name-link').first().click();
  await expect(page.getByTestId('user-popover-card-content')).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(violations, violations.join('\n')).toEqual([]);
});
