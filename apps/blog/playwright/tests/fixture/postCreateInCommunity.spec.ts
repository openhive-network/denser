import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import {
  POST_AUTHOR,
  POST_COMMUNITY,
  DEFAULT_TAG,
  gotoCommunityNewPostLoggedIn,
  fillPostBody,
  submitPost
} from '../support/postCreationContext';

/**
 * Post creation in a community (§2.1 POST-03).
 *
 * Entry point is the community trending page; clicking
 * "community-new-post-button" links to /submit.html?category=<community>
 * which sets the editor's category to the community id. The produced
 * comment_operation carries `parent_permlink === community id` instead
 * of the first user-typed tag — that's the regression target here
 * (cf. MR !1041 which broke exactly this distinction).
 *
 * Separate fixture set from postCreate/ because the entry route loads
 * the community feed first (different bridge.get_ranked_posts calls),
 * so dedup'ing wouldn't shrink the recording in any meaningful way.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postCreateInCommunity.spec
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateInCommunity.spec
 */

test.use({ fixtureTestName: 'postCreateCommunity', authenticatedUser: {} });

test.describe('Post creation in community (§2.1)', () => {
  test('POST-03: create post via "New Post" in community', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoCommunityNewPostLoggedIn(page);
    const editor = new PostEditorPage(page);

    const title = 'POST-03 fixture-test community post';
    const body = 'POST-03 community body content';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, body);
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);
    await submitPost(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      // Community-pre-selected post: parent_permlink is the community id,
      // not the first tag the user typed.
      parent_author: '',
      parent_permlink: POST_COMMUNITY,
      author: POST_AUTHOR,
      body,
      permlinkPattern: /post-03-fixture-test-community-post$/
    });

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(
      new RegExp(
        `/${POST_COMMUNITY}/@${POST_AUTHOR}/post-03-fixture-test-community-post.*pending=1`
      )
    );
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
