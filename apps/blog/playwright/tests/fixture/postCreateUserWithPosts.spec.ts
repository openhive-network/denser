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
  gotoSubmitLoggedIn,
  fillPostBody,
  submitPost
} from '../support/postCreationContext';

/**
 * Post creation — user with existing posts (§2.1 POST-02).
 *
 * Same UX flow as POST-01; the precondition is "user already has
 * posts". The submit flow today does not fetch `bridge.get_account_posts`
 * for the editor surface, so the only fixture-level difference between
 * POST-01 and POST-02 is the unique `bridge.get_post_header` lookup
 * driven by POST-02's distinct title (used by createPermlink for slug
 * uniqueness). The overlay variant `postCreate_userWithPosts` carries
 * exactly that one file and inherits everything else from postCreate.
 *
 * If the editor surface starts to gate on "user has posts" state in
 * the future (welcome-mat, first-time-poster prompt, etc.), extend the
 * overlay with a patched `bridge.get_account_posts` for guest4test.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postCreateUserWithPosts.spec
 *          (writes to postCreate_userWithPosts/; afterwards trim files
 *          identical to postCreate/ and re-add `base: 'postCreate'` +
 *          `overlayFiles: [...]` to its _index.json)
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateUserWithPosts.spec
 */

test.use({
  fixtureTestName: 'postCreate_userWithPosts',
  authenticatedUser: {}
});

test.describe('Post creation — user with posts (§2.1)', () => {
  test('POST-02: create post (user already has posts)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'POST-02 fixture-test post';
    const body = 'POST-02 fixture-test body content';
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
      permlinkPattern: /post-02-fixture-test-post$/
    });

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(/post-02-fixture-test-post.*pending=1/);
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
