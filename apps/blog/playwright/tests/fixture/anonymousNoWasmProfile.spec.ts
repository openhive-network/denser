import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { TIMEOUTS } from '../support/constants';
import { recordWasmRequests, settleAfterLoad } from '../support/wasmRequests';

/**
 * A logged-out reader of a profile never downloads wax's wasm: the header (with its Hive Power)
 * and the profile tabs are rendered from reads alone.
 */

test.use({ fixtureTestName: 'userProfileTabs' });

test('ANON-WASM-03: a profile and its comments tab request no .wasm', async ({ page }) => {
  const wasmRequests = recordWasmRequests(page);
  const profilePage = new ProfilePage(page);

  await profilePage.gotoPostsProfilePage('@hiveio');
  await expect(profilePage.profileHP).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);

  await profilePage.postsMenu.getByRole('link', { name: 'Comments' }).click();
  await expect(page).toHaveURL(/\/@hiveio\/comments/);
  await expect(profilePage.postsMenuActiveTab).toHaveText('Comments');
  await expect(profilePage.profileBlogPostsList).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await page.waitForLoadState('networkidle');

  expect(wasmRequests).toEqual([]);
});
