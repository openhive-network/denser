import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import {
  expectSingleNamedResponsesLink,
  expectSingleTabStop,
  readResponsesCount
} from '../support/responsesCounter';

/**
 * RESP-A11Y-02 – the post footer's responses counter is one link to this post's #comments, named
 * with the count, a single Tab stop, and its tooltip opens on keyboard focus.
 *
 * Reuses the `postDetail` recording.
 */

test.use({ fixtureTestName: 'postDetail' });

const POST_PATH = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit';

test('RESP-A11Y-02: post footer responses counter is a single named link to #comments', async ({ page }) => {
  const postPage = new PostPage(page);
  await page.goto(`${POST_PATH}/`, { waitUntil: 'domcontentloaded' });
  const link = postPage.commentResponse;
  await expect(link).toBeVisible({ timeout: 30000 });

  await expectSingleNamedResponsesLink(link, await readResponsesCount(link));
  await expect(link).toHaveAttribute('href', new RegExp(`${POST_PATH}#comments$`));

  await link.focus();
  await expect(page.getByTestId('post-footer-response-tooltip')).toBeVisible();
  await expectSingleTabStop(page, link);
});
