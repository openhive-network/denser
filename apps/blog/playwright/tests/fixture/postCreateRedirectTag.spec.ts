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
 * Wiki POST-17 reads "After creating post with category, verify redirect
 * to created/new tag page". The actual code (use-post-form-actions.ts)
 * builds `/${postParams.category}/@${username}/${permlink}?pending=1`
 * where `postParams.category` is the FORM's category field — for a
 * non-community submit that field defaults to `'blog'` (from the form's
 * defaultValues). It is NOT the user-typed first tag, and the URL is
 * the post page, not a tag-feed list page. So neither the "tag" nor
 * the "list" interpretation in the wiki phrasing matches the code.
 *
 * What this spec proves (the regression target):
 *  - The post-submit redirect URL composition is intact:
 *    `/{form.category}/@{user}/{permlink}?pending=1` with form.category
 *    defaulting to `'blog'` for a non-community submit.
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
  test('POST-17: post submit redirects to /{form.category}/@{user}/{permlink}?pending=1', async ({
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
    // form.category defaults to 'blog' for a non-community submit, so
    // the URL prefix is `/blog/`, not the user-typed first tag.
    await page.waitForURL(
      new RegExp(`/blog/@${POST_AUTHOR}/post-01-fixture-test-post.*pending=1`)
    );
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
