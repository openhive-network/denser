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
  fillPostBody,
  gotoCommunityNewPostLoggedIn,
  submitPost
} from '../support/postCreationContext';

/**
 * Post creation — redirect to community namespace (§2.1 POST-16).
 *
 * Wiki POST-16 reads "After creating post in community, verify redirect
 * to community post list". The actual code redirects to
 * `/{community}/@{user}/{permlink}?pending=1` — to the new post's page
 * within the community URL namespace, NOT to `/trending/{community}`.
 * The "redirect to list" interpretation isn't implemented and may be a
 * wiki TODO. See postCreateRedirectTag.spec.ts for the same caveat on
 * POST-17.
 *
 * What this spec proves:
 *  - Post-submit redirect lands in the *community* URL namespace
 *    (parent_permlink → URL prefix). POST-03 already covers the
 *    broadcast side (parent_permlink = community id); this spec covers
 *    the destination URL.
 *  - The destination renders the new post (optimistic cache feeds the
 *    community-namespaced post route).
 *
 * Re-uses the existing `postCreateCommunity` fixture set.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateRedirectCommunity.spec
 */

test.use({ fixtureTestName: 'postCreateCommunity', authenticatedUser: {} });

test.describe('Post creation — community-namespace redirect (§2.1)', () => {
  test('POST-16: community-post submit redirects to /{community}/@{user}/{permlink}?pending=1', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoCommunityNewPostLoggedIn(page);
    const editor = new PostEditorPage(page);

    // Reuse POST-03's title so the recorded bridge.get_post_header is
    // already in the postCreateCommunity base.
    const title = 'POST-03 fixture-test community post';
    const body = 'POST-16 body content for community-redirect verification';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, body);
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);
    await submitPost(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
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
