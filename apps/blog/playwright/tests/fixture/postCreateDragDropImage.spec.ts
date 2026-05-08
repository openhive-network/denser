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
 * Post creation with a drag-and-drop image (§2.1 POST-09).
 *
 * Same end-state as POST-08 (markdown image inserted into body) but a
 * different UX path: the editor's wrapper div has `onDrop={dropHandler}`
 * which calls `onImageDrop(dataTransfer, ...)`. We synthesize a
 * DataTransfer with a single PNG file in the page context and dispatch
 * `drop` on the editor container — the wrapper div listens for drop
 * events on its CodeMirror child via bubbling.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateDragDropImage.spec
 */

test.use({ fixtureTestName: 'postCreateImageDrop', authenticatedUser: {} });

const PERMLINK_SLUG = 'post-09-fixture-test-drag-drop-post';

test.describe('Post creation — drag & drop image (§2.1)', () => {
  test('POST-09: dropped image file is uploaded and inserted as markdown', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    const uploads = await installImageUploadStub(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'POST-09 fixture-test drag drop post';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, 'Body before drop:');

    // Build a DataTransfer in the browser context with our PNG bytes,
    // then dispatch `drop` on the editor — bubbles up to the wrapper
    // div whose onDrop handler runs onImageDrop.
    const pngBase64 = TINY_PNG.toString('base64');
    const dataTransfer = await page.evaluateHandle(
      ({ b64, name, mimeType }) => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const file = new File([bytes], name, { type: mimeType });
        const dt = new DataTransfer();
        dt.items.add(file);
        return dt;
      },
      { b64: pngBase64, name: 'dropped.png', mimeType: 'image/png' }
    );
    await editor.getEditorContent.dispatchEvent('drop', { dataTransfer });

    await expect.poll(() => uploads.count(), { timeout: 15_000 }).toBe(1);
    const expectedImageUrl = uploads.uploadedUrls[0];
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
    const value = (broadcast.calls[0].params as {
      trx: { operations: { value: { body?: string } }[] };
    }).trx.operations[0].value;
    expect(value.body).toContain(expectedImageUrl);

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(new RegExp(`${PERMLINK_SLUG}.*pending=1`));
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
