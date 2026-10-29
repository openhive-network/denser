import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { TIMEOUTS } from '../support/constants';
import { gotoLoggedIn } from '../support/postDisplayContext';
import { asFypPage, recordedRankedPosts, serveFollowLists, serveFypFeed } from '../support/fypApiStub';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * Signing out on the For You feed (`/for-you`): the feed is personal and the signed-out sort
 * selector has no For You option, so the sign-out itself takes the reader to Trending, and /for-you
 * never shows an empty selector meanwhile. Opening `/for-you` signed out is
 * forYouFeedSignedOut.spec.ts.
 *
 * Fixtures: `forYouSignOut`, the logged-in feeds with the anonymous Trending page's reads added.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- forYouFeedSignOut
 */

test.use({ fixtureTestName: 'forYouSignOut', authenticatedUser: {} });

const FEED = asFypPage(recordedRankedPosts('loggedInHomeFeeds', '0001-bridge.get_ranked_posts.json'));
const TRENDING_LABEL = 'Trending';

type BlankSelectorWatch = { __blankForYouSelector: boolean };

/**
 * Records, in `window.__blankForYouSelector`, whether any frame shows /for-you with an empty sort
 * selector. The page is never reloaded, so the watch spans the client-side navigation.
 */
async function watchForBlankForYouSelector(page: Page): Promise<void> {
  await page.evaluate(() => {
    const watch = window as unknown as BlankSelectorWatch;
    watch.__blankForYouSelector = false;
    const check = () => {
      const filter = document.querySelector('[data-testid="posts-filter"]');
      if (window.location.pathname.endsWith('/for-you') && !filter?.textContent?.trim()) {
        watch.__blankForYouSelector = true;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

const sawBlankForYouSelector = (page: Page) =>
  page.evaluate(() => (window as unknown as BlankSelectorWatch).__blankForYouSelector);

test.describe('For You feed — signing out', () => {
  test('FYP-07 — signing out on For You goes to Trending, with the Trending sort selected and no blank selector', async ({ page }) => {
    await serveFollowLists(page, {});
    await serveFypFeed(page, [FEED]);
    const homePage = new HomePage(page);
    await gotoLoggedIn(page, '/for-you');
    await expect(homePage.getFilterPosts).toHaveText(enBlog.select_sort.posts_sort.for_you, {
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    await homePage.profileAvatarButton.click();
    await watchForBlankForYouSelector(page);
    await new ProfileUserMenu(page).logoutLink.click();

    await expect(homePage.loginBtn).toBeVisible();
    await expect(page).toHaveURL(/\/trending$/);
    await expect(homePage.getFilterPosts).toHaveText(TRENDING_LABEL);
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(page.getByTestId('for-you-sign-in')).toHaveCount(0);
    expect(await sawBlankForYouSelector(page)).toBe(false);
  });
});
