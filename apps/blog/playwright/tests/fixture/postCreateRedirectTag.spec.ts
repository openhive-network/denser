import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import {
  POST_AUTHOR,
  DEFAULT_TAG,
  fillPostBody,
  gotoSubmitLoggedIn,
  submitPost
} from '../support/postCreationContext';

/**
 * Post creation — redirect URL for non-community post (§2.1 POST-17).
 *
 * After a non-community ("My blog") submit the app navigates to the new
 * post under the category it was broadcast with: the comment operation's
 * `parent_permlink`, i.e. the first tag. The form's `category` field is
 * the literal `'blog'` for "My blog", and building the URL from it gave
 * `/blog/@user/...` (`/blog/blog/@user/...` under a `/blog` base path),
 * hive/denser#1215.
 *
 * What this spec proves (the regression target):
 *  - The redirect is `/{first tag}/@{user}/{permlink}?pending=1`.
 *  - The destination renders the new post — the optimistic React-Query
 *    cache (seeded by usePostMutation.onMutate before the broadcast)
 *    feeds the post page so it short-circuits the
 *    PendingIndexingMessage branch and renders the article body.
 *
 * Re-uses the existing `postCreate` fixture set.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateRedirectTag.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

test.describe('Post creation — non-community redirect URL (§2.1)', () => {
  test('POST-17: post submit redirects to /{first tag}/@{user}/{permlink}?pending=1', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    // Reuse POST-01's title so the recorded bridge.get_post_header is
    // already in the postCreate base — no new fixture entries required.
    const title = 'POST-01 fixture-test post';
    const body = 'POST-17 body content for redirect verification';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, body);
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);
    await submitPost(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: DEFAULT_TAG,
      author: POST_AUTHOR,
      body,
      permlinkPattern: /post-01-fixture-test-post$/
    });

    await expect(editor.getPostSubmittedToast).toBeVisible();
    // The post is broadcast under its first tag, so that is its category
    // in the URL — not the form's 'blog' placeholder for "My blog".
    await page.waitForURL(
      new RegExp(`/${DEFAULT_TAG}/@${POST_AUTHOR}/post-01-fixture-test-post.*pending=1`)
    );
    expect(new URL(page.url()).pathname).not.toContain('/blog/@');
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
