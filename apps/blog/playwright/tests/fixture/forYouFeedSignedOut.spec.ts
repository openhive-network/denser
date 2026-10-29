import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { clickUntilOpen } from '../support/uiPrimitives';
import { serveFypFeed } from '../support/fypApiStub';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * The For You feed (`/for-you`) for a signed-out reader, with FYP_API_URL set (see
 * forYouFeed.spec.ts): the feed is personal, so the sort is not offered and the route asks to sign
 * in, while the selector on /for-you still names the page.
 *
 * Fixtures: reuses `homeMainPage`, the anonymous trending feed.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- forYouFeedSignedOut
 */

test.use({ fixtureTestName: 'homeMainPage' });

test.describe('For You feed — signed out', () => {
  test('FYP-04 — no For You sort, and /for-you names itself and shows the sign-in prompt instead of a feed', async ({
    page
  }) => {
    const feedRequests = await serveFypFeed(page, []);
    const homePage = new HomePage(page);

    await page.goto('/trending');
    await clickUntilOpen(homePage.getFilterPosts, homePage.getFilterPostsList);
    await expect(page.getByRole('option')).toHaveText(['Trending', 'Hot', 'New', 'Payouts', 'Muted']);

    await page.goto('/for-you');
    const prompt = page.getByTestId('for-you-sign-in');
    await expect(prompt).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(prompt).toContainText(enBlog.for_you_feed.sign_in_prompt);
    await expect(homePage.getFilterPosts).toHaveText(enBlog.select_sort.posts_sort.for_you);
    await clickUntilOpen(homePage.getFilterPosts, homePage.getFilterPostsList);
    await expect(page.getByRole('option', { disabled: false })).toHaveText([
      'Trending',
      'Hot',
      'New',
      'Payouts',
      'Muted'
    ]);
    await page.keyboard.press('Escape');
    await prompt.getByTestId('for-you-sign-in-button').click();
    await expect(page.getByTestId('login-dialog')).toBeVisible();

    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(0);
    expect(feedRequests).toEqual([]);
  });
});
