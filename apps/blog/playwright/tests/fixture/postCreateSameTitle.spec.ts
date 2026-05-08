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
 * Post creation — duplicate title produces a unique permlink (§2.1 POST-05).
 *
 * Precondition: a post by `guest4test` with permlink
 * `post-05-fixture-test-same-title-post` already exists. The
 * `postCreate_titleAlreadyExists` overlay variant patches
 * `bridge.get_post_header` for that author/permlink so it returns a
 * successful response (with `category` truthy) instead of the usual
 * "post does not exist" error. createPermlink then prepends a base58
 * noise prefix (4-7 lowercase alphanumeric chars + `-`) to keep the
 * new permlink unique.
 *
 * The noise prefix is random per submission, so the assertion uses a
 * regex that anchors to the bare slug suffix.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postCreateSameTitle.spec
 *          (then patch bridge.get_post_header response from error to
 *           success and re-add `base: 'postCreate'` to its _index.json)
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateSameTitle.spec
 */

test.use({
  fixtureTestName: 'postCreate_titleAlreadyExists',
  authenticatedUser: {}
});

const PERMLINK_SLUG = 'post-05-fixture-test-same-title-post';

test.describe('Post creation — duplicate title (§2.1)', () => {
  test('POST-05: same title produces a noise-prefixed permlink', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'POST-05 fixture-test same title post';
    const body = 'POST-05 body content for duplicate-title scenario';
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
      // Anchored to slug suffix so the random noise prefix doesn't
      // break the assertion. Noise = base58(randomBuffer(4)) →
      // toLowerCase → 4-7 [a-z0-9] chars + '-'.
      permlinkPattern: new RegExp(`^[a-z0-9]{1,12}-${PERMLINK_SLUG}$`)
    });

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(
      new RegExp(`[a-z0-9]+-${PERMLINK_SLUG}.*pending=1`)
    );
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
