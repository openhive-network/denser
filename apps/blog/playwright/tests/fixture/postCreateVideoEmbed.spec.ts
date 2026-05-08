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
 * Post creation — embedded YouTube video (§2.1 POST-10).
 *
 * Pasting a YouTube URL into the body should:
 *   1) live-render as an embed in the side-by-side preview
 *      (`<div class="youtube-facade" data-youtube-id="...">` from
 *      packages/renderer YoutubeEmbedder)
 *   2) round-trip the URL verbatim through the broadcast — the renderer
 *      transforms only at render time, the stored markdown body stays
 *      as the raw URL.
 *
 * No upload involved → re-uses the existing `postCreate` fixture set.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateVideoEmbed.spec
 */

test.use({ fixtureTestName: 'postCreateVideo', authenticatedUser: {} });

const VIDEO_ID = 'dQw4w9WgXcQ';
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
const PERMLINK_SLUG = 'post-10-fixture-test-video-post';

test.describe('Post creation — video embed (§2.1)', () => {
  test('POST-10: YouTube URL renders as embed in preview and survives broadcast', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'POST-10 fixture-test video post';
    const body = `Watch this: ${VIDEO_URL}`;

    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, body);
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    // Preview renders the embed facade as soon as the URL is typed.
    await expect(
      editor.getPreviewContainer.locator(
        `div.youtube-facade[data-youtube-id="${VIDEO_ID}"]`
      )
    ).toBeVisible();

    await submitPost(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: DEFAULT_TAG,
      author: POST_AUTHOR,
      // Body is stored verbatim — only the renderer turns the URL into
      // an embed.
      body,
      permlinkPattern: new RegExp(`${PERMLINK_SLUG}$`)
    });

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(new RegExp(`${PERMLINK_SLUG}.*pending=1`));
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});
