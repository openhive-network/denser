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
 * Post creation — multiple images + cover picker (§2.1 POST-18).
 *
 * Uploads two images via the editor's hidden file input (the input has
 * `multiple`, so a single setInputFiles call with two buffers walks
 * the editor's onBatchImageUpload path), confirms both URLs land as
 * markdown in the body, then picks the second uploaded image as the
 * cover via the SelectImageList thumbnail buttons. The cover URL is
 * what `transactionService.post` puts in `json_metadata.image[0]` —
 * the first (default) image vs the picked second is the regression
 * target this spec defends.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateMultiImageCover.spec
 */

test.use({
  fixtureTestName: 'postCreateMultiImageCover',
  authenticatedUser: {}
});

const PERMLINK_SLUG = 'post-18-fixture-test-multi-image-post';

test.describe('Post creation — multiple images + cover (§2.1)', () => {
  test('POST-18: cover picker switches json_metadata.image[0] to chosen upload', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    const uploads = await installImageUploadStub(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'POST-18 fixture-test multi image post';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, 'Two images coming up:');

    // Single setInputFiles call with two PNG payloads → editor takes
    // the multi-file branch (onBatchImageUpload).
    await editor.getImageFileInput.setInputFiles([
      { name: 'first.png', mimeType: 'image/png', buffer: TINY_PNG },
      { name: 'second.png', mimeType: 'image/png', buffer: TINY_PNG }
    ]);
    await expect.poll(() => uploads.count(), { timeout: 30_000 }).toBe(2);
    const [firstUrl, secondUrl] = uploads.uploadedUrls;

    // Both URLs must already be in the editor — that's how
    // SelectImageList discovers them (it parses the body's images).
    await expect(editor.getEditorContentTextarea).toContainText(firstUrl);
    await expect(editor.getEditorContentTextarea).toContainText(secondUrl);

    // Pick the second upload as cover. SelectImageItem renders an
    // <img alt="cover img" src="<url>"> inside its <button>; the
    // proxyifyImageSrc shortcut keeps the URL as-is for our /p/
    // synthetic URLs, so we can locate by img[src].
    await page.locator(`button:has(img[src="${secondUrl}"])`).click();

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
      trx: { operations: { value: { body?: string; json_metadata?: string } }[] };
    }).trx.operations[0].value;
    expect(value.body).toContain(firstUrl);
    expect(value.body).toContain(secondUrl);

    // The picked cover lands in json_metadata.image[0] (transactionService
    // builds `images: [image ? image : '']` from the form's selectedImg).
    const metadata = JSON.parse(value.json_metadata ?? '{}') as {
      image?: string[];
    };
    expect(metadata.image, 'json_metadata.image').toEqual([secondUrl]);

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(new RegExp(`${PERMLINK_SLUG}.*pending=1`));
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
