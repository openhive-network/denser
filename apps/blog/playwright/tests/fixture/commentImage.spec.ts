import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  POST_AUTHOR,
  POST_PERMLINK,
  OWN_COMMENT_AUTHOR,
  OWN_COMMENT_TOP_LEVEL_PERMLINK,
  gotoPostLoggedIn,
  ownCommentEditButton,
  typeIntoReplyEditor,
  submitReply
} from '../support/commentingContext';

/**
 * Comment with image — edit + add picture (§5 CMT-06).
 *
 * Image upload flow: editor toolbar → hidden `input[name="images"]` →
 * `onImageUpload` → `signer.signChallenge` (offline ECDSA, works with
 * the seeded WIF) → POST to `https://images.hive.blog/<owner>/<sig>` →
 * response `{url}` → markdown `![name](url)` inserted at cursor.
 *
 * We stub the upload endpoint so the flow stays offline. Once markdown
 * is inserted, the next `Post` click broadcasts a `comment_operation`
 * whose body contains the stub URL — proving the image-edit pipeline
 * end-to-end without touching real infrastructure.
 *
 * Reuses `commenting_ownTopLevel/` overlay (own comment with
 * payout_at far-future).
 */

test.use({
  fixtureTestName: 'commenting_ownTopLevel',
  authenticatedUser: {}
});

const STUB_IMAGE_URL = 'https://images.hive.blog/stub/cmt-06-test.jpg';

// 67-byte 1x1 white PNG — smallest valid image the upload pipeline
// (sharp/jimp resize step) can ingest without throwing on dimensions.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

test.describe('Comment with image — edit (§5)', () => {
  test('CMT-06: edit own comment and insert an image', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);

    // Stub the image-upload endpoint. POST /<owner>/<sig> → canned URL.
    await page.route('https://images.hive.blog/**', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: STUB_IMAGE_URL })
      });
    });

    await gotoPostLoggedIn(page);

    const postPage = new PostPage(page);
    const editBtn = ownCommentEditButton(
      postPage,
      OWN_COMMENT_TOP_LEVEL_PERMLINK
    );
    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click({ force: true });

    // Edit mode preloads the existing body. Clear it so the resulting
    // broadcast has a deterministic body (just the image markdown).
    const newBody = 'CMT-06 edit: ';
    await typeIntoReplyEditor(page, newBody, { clearFirst: true });

    // Hidden file input next to the toolbar — Playwright can drive it
    // even though it's `display: none`. Triggers `inputImageHandler` →
    // signs → fetches our stub → inserts markdown at cursor.
    const fileInput = page
      .getByTestId('reply-editor')
      .locator('input[name="images"]');
    await fileInput.setInputFiles({
      name: 'cmt-06-test.jpg',
      mimeType: 'image/jpeg',
      buffer: TINY_PNG
    });

    // Wait for markdown insertion. The CM textContent will contain the
    // stub URL once `insertText` dispatches the change.
    const cm = page.getByTestId('reply-editor').locator('.cm-content').first();
    await expect(cm).toContainText(STUB_IMAGE_URL, { timeout: 15000 });

    await submitReply(page);

    await broadcast.waitForCount(1);
    const op = (broadcast.calls[0].params as {
      trx: { operations: { value: { body: string } }[] };
    }).trx.operations[0].value;
    expect(op.body).toContain(STUB_IMAGE_URL);
    expect(op.body).toMatch(/!\[[^\]]*\]\(/); // markdown image syntax

    expectCommentOperation(broadcast.calls[0], {
      parent_author: POST_AUTHOR,
      parent_permlink: POST_PERMLINK,
      author: OWN_COMMENT_AUTHOR,
      permlink: OWN_COMMENT_TOP_LEVEL_PERMLINK
    });
  });
});
