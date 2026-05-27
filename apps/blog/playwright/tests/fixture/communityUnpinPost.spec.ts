import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { gotoLoggedIn } from '../support/postDisplayContext';
import {
  SUBSCRIBER,
  MOD_COMMUNITY_TAG,
  PIN_POST_AUTHOR,
  PIN_POST_PERMLINK,
  ACTION_UNPIN_POST,
  TOAST_UNPINNED
} from '../support/communityContext';

/**
 * §10 — COM-12 — Unpin a post, then verify the pinned tag is gone on the feed.
 *
 *   Wire — custom_json id="community", json: ["unpinPost", { community,
 *          account, permlink }] + toast.
 *   Feed — after unpinning, /trending/<community> no longer shows the post's
 *          "Pinned" tag. The communityUnpinPost overlay grants guest4test mod
 *          (for the unpin button) AND clears stats.is_pinned on the post in
 *          get_ranked_posts (representing the post-unpin chain state, since the
 *          broadcast can't reach the SSR feed in fixtures).
 *
 * confirmInBlock IS MANDATORY (unpin runs { observe: true }).
 */

const POST_URL = `/${MOD_COMMUNITY_TAG}/@${PIN_POST_AUTHOR}/${PIN_POST_PERMLINK}/`;
const FEED_URL = `/trending/${MOD_COMMUNITY_TAG}`;

test.use({
  fixtureTestName: 'communityUnpinPost',
  authenticatedUser: {}
});

test('COM-12 — Unpin post; pinned tag gone on the community feed', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoLoggedIn(page, POST_URL);

  const post = new PostPage(page);
  await expect(post.unpinButton).toBeVisible();

  await post.unpinButton.click();
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_UNPIN_POST,
    payload: {
      community: MOD_COMMUNITY_TAG,
      account: PIN_POST_AUTHOR,
      permlink: PIN_POST_PERMLINK
    }
  });
  await expect(page.getByText(TOAST_UNPINNED, { exact: true })).toBeVisible();

  // Community main feed no longer renders the post as pinned.
  await gotoLoggedIn(page, FEED_URL);
  const community = new CommunitiesPage(page);
  await expect(community.pinnedTagForPermlink(PIN_POST_PERMLINK)).toHaveCount(0);
  // The post is still in the feed, just no longer pinned.
  await expect(community.getFirstPostListItem).toBeVisible();
});
