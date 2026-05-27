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
  ACTION_PIN_POST,
  TOAST_PINNED
} from '../support/communityContext';

/**
 * §10 — COM-11 — Pin a post, then verify it shows pinned on the community feed.
 *
 *   Wire — custom_json id="community", json: ["pinPost", { community, account,
 *          permlink }] + toast.
 *   Feed — after pinning, /trending/<community> shows the post with the
 *          "Pinned" tag (post-list-item.tsx, post.stats.is_pinned). The
 *          communityPinPost overlay grants guest4test mod (for the pin button);
 *          the feed already has gtg/hive-hardfork-28 pinned in the recording.
 *
 * The broadcast can't propagate to the SSR feed in fixtures, so the feed's
 * pinned state is the recorded chain state — the assertion verifies the
 * community page renders that post as pinned. confirmInBlock IS MANDATORY
 * (pin runs { observe: true }).
 */

const POST_URL = `/${MOD_COMMUNITY_TAG}/@${PIN_POST_AUTHOR}/${PIN_POST_PERMLINK}/`;
const FEED_URL = `/trending/${MOD_COMMUNITY_TAG}`;

test.use({
  fixtureTestName: 'communityPinPost',
  authenticatedUser: {}
});

test('COM-11 — Pin post; it shows pinned on the community feed', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoLoggedIn(page, POST_URL);

  const post = new PostPage(page);
  await expect(post.pinButton).toBeVisible();

  await post.pinButton.click();
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_PIN_POST,
    payload: {
      community: MOD_COMMUNITY_TAG,
      account: PIN_POST_AUTHOR,
      permlink: PIN_POST_PERMLINK
    }
  });
  await expect(page.getByText(TOAST_PINNED, { exact: true })).toBeVisible();

  // Community main feed shows the post with the "Pinned" tag.
  await gotoLoggedIn(page, FEED_URL);
  const community = new CommunitiesPage(page);
  await expect(community.pinnedTagForPermlink(PIN_POST_PERMLINK)).toBeVisible();
});
