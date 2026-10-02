import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { TIMEOUTS } from '../support/constants';
import { settleAfterLoad } from '../support/wasmRequests';
import { recordFeedRootRequests } from '../support/feedRootRequests';

/**
 * Loading a profile never fetches the feed (64 KB+) the header links point at, e.g. as a <Link>
 * prefetch. The fixture build has no base path, so this does not cover assets whose URL misses
 * `/blog` and is redirected to the feed by the integration site's proxy.
 */

test.use({ fixtureTestName: 'userProfileTabs' });

test('NO-FEED-PREFETCH-01: a profile page requests no feed while loading', async ({ page, baseURL }) => {
  const feedRootRequests = recordFeedRootRequests(page, baseURL ?? '');
  const profilePage = new ProfilePage(page);

  await profilePage.gotoProfilePage('@hiveio');
  await expect(profilePage.profileHP).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);

  expect(feedRootRequests).toEqual([]);
});
