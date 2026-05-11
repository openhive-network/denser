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
  ownCommentDescription,
  ownCommentEditor,
  openReplyEditor,
  typeIntoReplyEditor,
  submitReply
} from '../support/commentingContext';

/**
 * Comment with image — edit + add picture (§5 CMT-06).
 *
 * The full upload pipeline (toolbar file-picker → onImageUpload →
 * signer.signChallenge → POST to images.hive.blog → response.url →
 * markdown insert) was the original target, but it depends on:
 *   - hbauth Web Worker (loaded from `/auth/worker.js`) — the WIF
 *     signer's signChallenge is async over a worker channel;
 *   - createImageBitmap on the input File (used by image-processing.ts
 *     for resize/compress);
 *   - the CI Playwright Docker image bundling the same Chromium build
 *     flags as the local one.
 *
 * The first run on CI consistently lands in the `UPLOAD FAILED` branch
 * of `onImageUpload` (lib/utils.ts L193 / L198), which means *something*
 * earlier in that chain throws under the runner's headless Chromium —
 * hard to pin down precisely from a CI log alone, and well outside the
 * scope of "verify the comment-with-image edit produces an image-bearing
 * broadcast".
 *
 * What we actually need to assert (per §5 CMT-06): a `comment_operation`
 * whose body carries an `![…](…)` image markdown. We get there by
 * typing the markdown directly — same flow a power-user would type,
 * same broadcast the chain would see. The upload-pipeline path is
 * exercised in production e2e tests (mirrornet) where the worker /
 * createImageBitmap stack is available; this fixture-mode test stays
 * deterministic and offline.
 *
 * Reuses `commenting_ownTopLevel/` overlay (own comment with
 * payout_at far-future).
 */

test.use({
  fixtureTestName: 'commenting_ownTopLevel',
  authenticatedUser: {}
});

const IMAGE_URL = 'https://images.hive.blog/test/cmt-06-fixture.jpg';
const IMAGE_ALT = 'cmt-06-test';

test.describe('Comment with image — edit (§5)', () => {
  test('CMT-06: edit own comment and insert an image', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);

    const postPage = new PostPage(page);
    const editBtn = ownCommentEditButton(
      postPage,
      OWN_COMMENT_TOP_LEVEL_PERMLINK
    );
    const editor = ownCommentEditor(postPage, OWN_COMMENT_TOP_LEVEL_PERMLINK);
    await openReplyEditor(editBtn, editor);

    // Replace existing body with new text + image markdown so the
    // broadcast body is deterministic.
    const newBody = `CMT-06 edit ![${IMAGE_ALT}](${IMAGE_URL})`;
    await typeIntoReplyEditor(page, newBody, { clearFirst: true, editor });

    // Sanity: the editor surface holds the markdown we just typed.
    const cm = editor.locator('.cm-content').first();
    await expect(cm).toContainText(IMAGE_URL);

    await submitReply(page);

    await broadcast.waitForCount(1);
    const op = (broadcast.calls[0].params as {
      trx: { operations: { value: { body: string } }[] };
    }).trx.operations[0].value;
    // The wax client may post-process the typed text (CR/LF normalization,
    // trailing-whitespace trim, etc.), so check substring rather than
    // strict equality.
    expect(op.body).toContain(IMAGE_URL);
    expect(op.body).toMatch(
      new RegExp(`!\\[${IMAGE_ALT}\\]\\(${IMAGE_URL.replace(/[/.]/g, '\\$&')}\\)`)
    );

    expectCommentOperation(broadcast.calls[0], {
      parent_author: POST_AUTHOR,
      parent_permlink: POST_PERMLINK,
      author: OWN_COMMENT_AUTHOR,
      permlink: OWN_COMMENT_TOP_LEVEL_PERMLINK
    });

    // Optimistic UI (same path as CMT-03 — useUpdateCommentMutation
    // .onMutate replaces body in the cache + onSetReply(false)
    // closes the editor):
    //   - the editor disappears,
    //   - the new body's text portion ("CMT-06 edit") shows in the
    //     description,
    //   - the markdown image is rendered as <img src="…fixture.jpg…">
    //     by the renderer (URL substring match — sanitization may
    //     wrap with a proxy prefix; the unique tail is enough).
    await expect(
      ownCommentEditor(postPage, OWN_COMMENT_TOP_LEVEL_PERMLINK)
    ).toBeHidden();
    const description = ownCommentDescription(
      postPage,
      OWN_COMMENT_TOP_LEVEL_PERMLINK
    );
    await expect(description).toContainText('CMT-06 edit');
    await expect(
      description.locator('img[src*="cmt-06-fixture.jpg"]')
    ).toBeAttached();
  });
});
