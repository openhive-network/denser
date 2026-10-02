import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import { settleAfterLoad } from '../support/wasmRequests';
import { recordFeedRootRequests } from '../support/feedRootRequests';

/**
 * Loading a post never fetches the feed (90 KB+) the header links point at, e.g. as a <Link>
 * prefetch. The fixture build has no base path, so this does not cover assets whose URL misses
 * `/blog` and is redirected to the feed by the integration site's proxy.
 */

test.use({ fixtureTestName: 'postDetail_popover' });

test('NO-FEED-PREFETCH-02: a post page requests no feed while loading', async ({ page, baseURL }) => {
  const feedRootRequests = recordFeedRootRequests(page, baseURL ?? '');
  const postPage = new PostPage(page);

  await page.goto('/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit');
  await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);

  expect(feedRootRequests).toEqual([]);
});
