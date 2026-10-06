import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';

/**
 * A post with hundreds of replies renders one page of comments (#1040).
 *
 * The recording is @hiveio/announcing-the-launch-of-hive-blockchain: 981 replies, 525 of them
 * top-level, and no `post_id` on the discussion entries (current hivemind omits it).
 *
 *   LARGE-DISC-01 – server HTML holds at most one page of comments plus the pagination controls
 *   LARGE-DISC-02 – the hydrated page shows one page; another page loads on demand
 */

test.use({ fixtureTestName: 'postLargeDiscussion' });

const POST_PATH = '/communityfork/@hiveio/announcing-the-launch-of-hive-blockchain';
const MAX_COMMENTS_PER_PAGE = 50;
const MAX_HTML_BYTES = 1024 * 1024;
const COMMENT_ITEM_MARKUP = /data-testid="comment-list-item"/g;
const HYDRATION_ERROR = /Minified React error #(418|423|425|421|422)\b|hydrat|did not match/i;

test('LARGE-DISC-01: server HTML holds one page of comments and the pagination controls', async ({ page }) => {
  const response = await page.request.get(POST_PATH);
  expect(response.status()).toBe(200);
  const html = await response.text();

  const commentItems = html.match(COMMENT_ITEM_MARKUP)?.length ?? 0;
  expect(commentItems).toBeGreaterThan(0);
  expect(commentItems).toBeLessThanOrEqual(MAX_COMMENTS_PER_PAGE);
  expect(html).toContain('data-testid="comments-pagination"');
  expect(Buffer.byteLength(html)).toBeLessThan(MAX_HTML_BYTES);
});

test('LARGE-DISC-02: the hydrated page shows one page and loads the next on demand', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && HYDRATION_ERROR.test(msg.text())) hydrationErrors.push(msg.text());
  });
  const postPage = new PostPage(page);

  await page.goto(POST_PATH);
  await expect(postPage.commentsPagination).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  const firstPageCount = await postPage.commentListItems.count();
  expect(firstPageCount).toBeGreaterThan(0);
  expect(firstPageCount).toBeLessThanOrEqual(MAX_COMMENTS_PER_PAGE);
  await expect(postPage.commentsPagination.getByRole('button', { name: '1', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
  const firstPageFirstComment = await postPage.commentCardsHeadersTimeStampLink.first().getAttribute('href');

  await postPage.commentsPagination.getByRole('button', { name: '2', exact: true }).click();

  await expect(postPage.commentsPagination.getByRole('button', { name: '2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
    { timeout: TIMEOUTS.HYDRATION }
  );
  await expect(postPage.commentCardsHeadersTimeStampLink.first()).not.toHaveAttribute(
    'href',
    firstPageFirstComment ?? ''
  );
  const secondPageCount = await postPage.commentListItems.count();
  expect(secondPageCount).toBeGreaterThan(0);
  expect(secondPageCount).toBeLessThanOrEqual(MAX_COMMENTS_PER_PAGE);
  expect(hydrationErrors).toEqual([]);
});
