import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { serveImages } from '../support/bodyImages';
import { PostPage } from '../support/pages/postPage';
import {
  gotoPostLoggedIn,
  openReplyEditor,
  postReplyTrigger,
  typeIntoReplyEditor,
  submitReply,
  findCommentCardByBody
} from '../support/commentingContext';

/**
 * Comment body images: capped at 400 px high without losing their aspect ratio.
 *
 *   01 – A portrait image in a comment keeps its proportions under the height cap
 */

test.use({ fixtureTestName: 'commenting', authenticatedUser: {} });

// A portrait image, taller than the comment height cap: the shape that got squashed.
const IMAGE_WIDTH = 652;
const IMAGE_HEIGHT = 971;
const COMMENT_IMAGE_MAX_HEIGHT = 400;
// Resizable (not GIF/SVG, not proxied yet), so it renders with a srcset like an uploaded image.
const IMAGE_URL = 'https://images.hive.blog/DQmQbRRrtoTFPZA9QmDRjvswPtaGuXrWXje1WHp9CeeGbV2/portrait.png';

test.describe('Comment body images (fixture-based)', () => {
  test('COMMENT-IMG-01: a portrait image in a comment keeps its proportions under the height cap', async ({
    page
  }) => {
    await serveImages(page, { width: IMAGE_WIDTH, height: IMAGE_HEIGHT });
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);

    await openReplyEditor(postReplyTrigger(page), page.getByTestId('reply-editor'));
    const text = 'COMMENT-IMG-01 portrait image';
    await typeIntoReplyEditor(page, `${text}\n\n![portrait](${IMAGE_URL})`);
    await submitReply(page);
    await broadcast.waitForCount(1);

    const image = findCommentCardByBody(new PostPage(page), text).locator('img[alt="portrait"]');
    await expect(image).toHaveAttribute('srcset', /\d+w/);
    await expect
      .poll(async () => {
        const box = await image.boundingBox();
        return box ? box.width / box.height : 0;
      })
      .toBeCloseTo(IMAGE_WIDTH / IMAGE_HEIGHT, 2);
    expect((await image.boundingBox())?.height).toBeCloseTo(COMMENT_IMAGE_MAX_HEIGHT, 0);
  });
});
