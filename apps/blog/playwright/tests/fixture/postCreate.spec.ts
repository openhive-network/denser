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
 * Post creation — basic, no community (§2.1 POST-01, POST-06).
 *
 * POST-01: top-level post (title + body + tag) by a logged-in user with
 * no existing posts (`guest4test`). Validates TX-01: comment_operation
 * with parent_author='', parent_permlink=<first tag>, author=<voter>,
 * body matches what was typed, permlink derived from the title.
 *
 * POST-06: same flow plus a custom post summary; additionally asserts
 * that the summary lands in `json_metadata.description`.
 *
 * Both share the `postCreate` fixture set — neither submits anything
 * the other relies on.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postCreate.spec
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreate.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

test.describe('Post creation — basic (§2.1)', () => {
  test('POST-01: create post (user without posts)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'POST-01 fixture-test post';
    const body = 'POST-01 fixture-test body content';
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
      // createPermlink slugifies the title; if the seeded user already
      // owns a post with that slug a base58 noise prefix is prepended.
      // Matching by trailing slug keeps the assert robust either way.
      permlinkPattern: /post-01-fixture-test-post$/
    });

    // confirmInBlock makes WorkerBee see the broadcast land in a
    // synthetic block; mutateAsync resolves and the success path runs.
    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(/post-01-fixture-test-post.*pending=1/);
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });

  test('POST-06: create post with custom summary', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'POST-06 fixture-test summary post';
    const body = 'POST-06 body content';
    const summary = 'Custom excerpt for POST-06';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, body);
    await editor.getPostSummaryInput.fill(summary);
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);
    await submitPost(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: DEFAULT_TAG,
      author: POST_AUTHOR,
      body,
      permlinkPattern: /post-06-fixture-test-summary-post$/
    });

    // Summary travels via json_metadata.summary (transactionService.post
    // builds `jsonMetadata: { summary, app: 'hive.blog/0.9' }` — the
    // `description` field that the optimistic UI cache uses lives only
    // in the React-Query state, never in the broadcast). The existing
    // expectCommentOperation only validates the textual fields, so we
    // reach into the captured op to assert the metadata round-trip.
    const op = (broadcast.calls[0].params as {
      trx: { operations: { value: { json_metadata?: string } }[] };
    }).trx.operations[0].value;
    const metadata = JSON.parse(op.json_metadata ?? '{}') as {
      summary?: string;
    };
    expect(metadata.summary, 'json_metadata.summary').toBe(summary);

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(/post-06-fixture-test-summary-post.*pending=1/);
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
