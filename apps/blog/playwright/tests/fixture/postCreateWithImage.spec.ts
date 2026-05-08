import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import {
  installImageUploadStub,
  TINY_PNG
} from '../support/fixture-auth/image-upload-stub';
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
 * Post creation with an uploaded image (§2.1 POST-08).
 *
 * Drives the editor's hidden file input directly (`setInputFiles`)
 * rather than clicking the toolbar button — clicking would open the
 * native OS file dialog, which Playwright can't populate. The
 * `installImageUploadStub` helper page-routes the imagehoster POST
 * (`images.hive.blog/<owner>/<sig>`) to a deterministic synthetic URL,
 * so the editor's onImageUpload pipeline (processImageForUpload →
 * uploadImg → insertText) completes without network and produces a
 * predictable markdown image tag in the body.
 *
 * Asserts:
 *   - exactly one upload was intercepted
 *   - the body contains a markdown image whose URL is the stub URL
 *   - TX-01 carries that body verbatim
 *   - the destination post page renders the title (optimistic cache)
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postCreateWithImage.spec
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateWithImage.spec
 */

test.use({ fixtureTestName: 'postCreateImage', authenticatedUser: {} });

const PERMLINK_SLUG = 'post-08-fixture-test-image-upload-post';

test.describe('Post creation with uploaded image (§2.1)', () => {
  test('POST-08: image-button upload inserts markdown image into body', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    const uploads = await installImageUploadStub(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'POST-08 fixture-test image upload post';
    await editor.getPostTitleInput.fill(title);

    // Type a placeholder body so we can verify the image is inserted
    // alongside text content, not as the entire body.
    await fillPostBody(page, 'Post body before upload.');

    // Drive the upload via the hidden input (clicking the toolbar
    // button opens the OS file dialog).
    await editor.getImageFileInput.setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: TINY_PNG
    });

    // Wait for the stub to record the upload — onImageUpload is async
    // (FileReader → processImageForUpload → uploadImg → insertText).
    await expect.poll(() => uploads.count(), { timeout: 15_000 }).toBe(1);
    const expectedImageUrl = uploads.uploadedUrls[0];

    // The editor inserts ` ![<filename>](<url>) ` after the cursor.
    // Confirm the URL is now in the editor's content (the textContent
    // is the source markdown CodeMirror is editing).
    await expect(editor.getEditorContentTextarea).toContainText(expectedImageUrl);

    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);
    await submitPost(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: DEFAULT_TAG,
      author: POST_AUTHOR,
      permlinkPattern: new RegExp(`${PERMLINK_SLUG}$`)
    });

    // Body verbatim contains the synthetic URL produced by the stub —
    // the editor's onImageUpload inserted ` ![<filename>](<url>) ` into
    // the markdown buffer. (json_metadata.image is the *cover* image
    // slot, populated only via the cover picker — see POST-18.)
    const value = (broadcast.calls[0].params as {
      trx: { operations: { value: { body?: string } }[] };
    }).trx.operations[0].value;
    expect(value.body, 'comment.body should contain the uploaded image URL')
      .toContain(expectedImageUrl);

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(new RegExp(`${PERMLINK_SLUG}.*pending=1`));
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
