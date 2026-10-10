import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { TIMEOUTS } from '../support/constants';
import { settleAfterLoad } from '../support/wasmRequests';
import { recordCspViolations } from '../support/csp';

/**
 * A profile, and the client-side navigation to one of its tabs, raise no Content-Security-Policy
 * violation (see cspNonce.spec.ts).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- cspProfile.spec
 */

test.use({ fixtureTestName: 'userProfileTabs' });

test('CSP-04: a profile and its comments tab raise no CSP violation', async ({ page }) => {
  const violations = await recordCspViolations(page);
  const profilePage = new ProfilePage(page);

  await profilePage.gotoPostsProfilePage('@hiveio');
  await expect(profilePage.profileHP).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);

  await profilePage.postsMenu.getByRole('link', { name: 'Comments' }).click();
  await expect(page).toHaveURL(/\/@hiveio\/comments/);
  await expect(profilePage.profileBlogPostsList).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await page.waitForLoadState('networkidle');

  expect(violations, violations.join('\n')).toEqual([]);
});
