import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import { DEFAULT_AVATAR_URL, failAvatarRequests } from '../support/avatarImages';

/**
 * A comment author's avatar that fails to load is swapped to the default avatar (#868). Reuses the
 * postLargeDiscussion recording; its own spec file because the fixture dir is worker-scoped.
 *
 *   AVATAR-FALLBACK-03 – comment avatar is swapped to the default avatar
 */

test.use({ fixtureTestName: 'postLargeDiscussion' });

const POST_PATH = '/communityfork/@hiveio/announcing-the-launch-of-hive-blockchain';

test('AVATAR-FALLBACK-03: comment avatar is swapped to the default avatar', async ({ page }) => {
  await failAvatarRequests(page);
  const postPage = new PostPage(page);
  await page.goto(POST_PATH);

  // The first <img> is the avatar shown from the `sm` breakpoint up, as in the default viewport.
  const avatar = postPage.commentListItems.first().locator('img').first();
  await avatar.scrollIntoViewIfNeeded({ timeout: TIMEOUTS.HYDRATION });
  await expect(avatar).toHaveAttribute('src', DEFAULT_AVATAR_URL, { timeout: TIMEOUTS.HYDRATION });
});
