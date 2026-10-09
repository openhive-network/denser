import { test, expect } from '../support/fixture-proxy-test';
import { IMAGES_ORIGIN } from '../support/cardImagePreload';
import { TINY_PNG } from '../support/fixture-auth/image-upload-stub';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { fillPostBody, gotoSubmitLoggedIn } from '../support/postCreationContext';

/**
 * Post creation — preview keeps unchanged images while typing.
 *
 * The live preview re-renders on every keystroke. Replacing the whole
 * preview body recreated every `<img>`, so an image above the cursor
 * reloaded and flashed while the author typed below it. The preview now
 * patches only the changed nodes: typing below the image, and splitting
 * its paragraph by typing above it, must keep its DOM node, requested once.
 *
 * Re-uses the `postCreate` fixture set; the proxied image is routed to a local PNG.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreatePreviewImageStable.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

const IMAGE_MARKDOWN = '![photo](https://example.com/preview-stability-fixture.png)';
// The preview shows body images through the image proxy.
const IMAGE_PROXY_URL = `${IMAGES_ORIGIN}/p/**`;
const LINES_BELOW = ['First line below the photo', 'Second line', '', 'A new paragraph'];
const LAST_LINE = LINES_BELOW[LINES_BELOW.length - 1];
const LINE_ABOVE = 'An introduction above the photo';

test.describe('Post creation — preview image stability', () => {
  test('POST-PREVIEW-IMG-01: typing around an image keeps its preview node', async ({ page }) => {
    const proxiedImageRequests: string[] = [];
    await page.route(IMAGE_PROXY_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG })
    );
    page.on('request', (request) => {
      if (request.url().startsWith(IMAGES_ORIGIN)) proxiedImageRequests.push(request.url());
    });

    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();
    await fillPostBody(page, IMAGE_MARKDOWN);

    const previewImage = editor.getPreviewContainer.locator('img[alt="photo"]');
    await expect(previewImage).toHaveCount(1);
    await expect.poll(() => previewImage.evaluate((img: HTMLImageElement) => img.complete)).toBe(true);
    const imageHandle = await previewImage.elementHandle();
    if (!imageHandle) throw new Error('preview image has no element handle');
    await imageHandle.evaluate((img: HTMLElement) => {
      img.dataset.stabilityMarker = 'original';
    });
    const imageSrc = await imageHandle.evaluate((img: HTMLImageElement) => img.currentSrc);
    const requestsOfImage = () => proxiedImageRequests.filter((url) => url === imageSrc);
    expect(requestsOfImage()).toHaveLength(1);

    for (const line of LINES_BELOW) {
      await page.keyboard.press('Enter');
      if (line) await page.keyboard.type(line);
    }
    await expect(editor.getPreviewContainer).toContainText(LAST_LINE);
    await page.keyboard.press('Control+Home');
    await page.keyboard.type(LINE_ABOVE);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(editor.getPreviewContainer.locator('p', { hasText: LINE_ABOVE })).toBeVisible();

    await expect(previewImage).toHaveCount(1);
    expect(await imageHandle.evaluate((img) => img.isConnected)).toBe(true);
    await expect(previewImage).toHaveAttribute('data-stability-marker', 'original');
    expect(requestsOfImage()).toHaveLength(1);
  });
});
