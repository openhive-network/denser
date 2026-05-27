import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  POST_DETAIL_AUTHOR,
  POST_DETAIL_PERMLINK,
  POST_DETAIL_COMMUNITY,
  gotoLoggedIn
} from '../support/postDisplayContext';
import { SUBSCRIBER, ACTION_SET_USER_TITLE } from '../support/communityContext';

/**
 * §10 — COM-10 — Change a user's title from a community post (moderator).
 *
 *   Wire — custom_json id="community", json: ["setUserTitle", { community,
 *          account, title }].
 *   No toast — useUserTitleMutation only invalidates; assert the broadcast +
 *          the dialog closing.
 *   Precondition — the change-title PenTool renders only for a moderator. The
 *          `communityModeratePost` overlay injects guest4test as mod into
 *          list_community_roles over the loggedInPostDetail base.
 *
 * COM-11 (pin) and COM-12 (unpin) live in their own specs
 * (communityPinPost / communityUnpinPost) because they additionally navigate
 * to the community feed to assert the post-pinned-tag, which needs a
 * feed-inclusive fixture in opposite (pinned vs not) states.
 *
 * confirmInBlock IS MANDATORY: setUserTitle runs { observe: true }.
 */

const POST_URL = `/${POST_DETAIL_COMMUNITY}/@${POST_DETAIL_AUTHOR}/${POST_DETAIL_PERMLINK}/`;
const NEW_TITLE = 'COM-10 New Title';

test.use({
  fixtureTestName: 'communityModeratePost',
  authenticatedUser: {}
});

test('COM-10 — Change user title in community', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true,
    // Reflect the new title on refetch — useUserTitleMutation only invalidates
    // postData/discussionData, and the fixture would otherwise return the old
    // title, so the badge assertion below would never see the change.
    userTitleSwap: { account: POST_DETAIL_AUTHOR }
  });
  await gotoLoggedIn(page, POST_URL);

  const post = new PostPage(page);
  // Mod precondition — the change-title PenTool renders only for a moderator.
  await expect(post.changeTitleTrigger).toBeVisible();

  await post.changeAuthorTitle(NEW_TITLE);
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_SET_USER_TITLE,
    payload: {
      community: POST_DETAIL_COMMUNITY,
      account: POST_DETAIL_AUTHOR,
      title: NEW_TITLE
    }
  });

  // No success toast for setUserTitle. The dialog closes on save
  // (handlerOpen(false), before the broadcast), so that alone is a weak signal
  // — the real verification is that the post header's author-title badge now
  // shows the new title (after onSuccess invalidates postData/discussionData
  // and the hot-swapped refetch returns it).
  await expect(post.changeTitleInput).toBeHidden();
  await expect(post.articleAuthorData.first()).toContainText(NEW_TITLE);
});
