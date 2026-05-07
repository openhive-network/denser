import { test } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
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
 * Same UX flow as POST-01; the difference is fixture state: the
 * `postCreate_userWithPosts` overlay variant patches
 * `bridge.get_account_posts` so it returns a non-empty list for
 * guest4test. The submit flow must produce an identical comment_operation
 * regardless of whether the author already has posts — this guards
 * against regressions where UI gating reads from "user has posts" cache
 * (eg. welcome-mat redirects, draft-recovery prompts, etc.).
 *
 * Variant generation:
 *   node playwright/tests/support/fixture-auth/generate-user-with-posts-variant.mjs
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateUserWithPosts.spec
 */

test.use({
  fixtureTestName: 'postCreate_userWithPosts',
  authenticatedUser: {}
});

test.describe('Post creation — user with posts (§2.1)', () => {
  test('POST-02: create post (user already has posts)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
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
  });
});
