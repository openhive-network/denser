import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { useHivemindRestStub } from '../support/hivemindRestSpec';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';

/**
 * The post page reads its whole discussion from hivemind's REST GET
 * `/posts/{author}/{permlink}/discussion` (HIVEMIND_REST_NODES), on the server and in the browser,
 * as hivemindRest.spec.ts checks for feeds. The recording is the 981-reply
 * @hiveio/announcing-the-launch-of-hive-blockchain (postLargeDiscussion.spec.ts), so the comments
 * span many pages: each page must show the same comments as over JSON-RPC.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- hivemindRestDiscussion
 */

test.use({ fixtureTestName: 'postLargeDiscussion' });
test.describe.configure({ mode: 'serial' });

const POST_PATH = '/communityfork/@hiveio/announcing-the-launch-of-hive-blockchain';
const DISCUSSION_REQUEST =
  '/hivemind-api/posts/hiveio/announcing-the-launch-of-hive-blockchain/discussion?observer=hive.blog';

const rest = useHivemindRestStub();

/** The link of each comment the page shows, which names the comment. */
const shownComments = (page: Page): Promise<(string | null)[]> =>
  new PostPage(page).commentCardsHeadersTimeStampLink.evaluateAll((links) =>
    links.map((link) => link.getAttribute('href'))
  );

test.describe('server HTML', () => {
  test.use({ javaScriptEnabled: false });

  test("HIVEMIND-REST-06 — a post's first comments page renders the same from /discussion", async ({ page }) => {
    const firstPage = async (url: string) => {
      const response = await page.goto(url);
      expect(response?.status(), url).toBe(200);
      await expect(new PostPage(page).commentsPagination).toBeVisible();
      return shownComments(page);
    };

    const overJsonRpc = await firstPage(POST_PATH);
    expect(rest.requests, 'the server without HIVEMIND_REST_NODES makes no REST request').toEqual([]);
    const overRest = await firstPage(`${rest.restBaseURL}${POST_PATH}`);

    expect(overJsonRpc.length).toBeGreaterThan(0);
    expect(overRest).toEqual(overJsonRpc);
    expect(rest.servedRestRequests()).toContain(DISCUSSION_REQUEST);
  });
});

test('HIVEMIND-REST-07 — the browser reads the next comments page from /discussion', async ({ page }) => {
  await rest.readFromRestInBrowser(page);
  const secondPage = async (url: string) => {
    const postPage = new PostPage(page);
    await page.goto(url);
    await expect(postPage.commentsPagination).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    const firstPageComments = await shownComments(page);
    // The server's reads are done: what reaches the stub from here on is the browser's.
    rest.requests.length = 0;

    await postPage.commentsPagination.getByRole('button', { name: '2', exact: true }).click();

    await expect(postPage.commentsPagination.getByRole('button', { name: '2', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
      { timeout: TIMEOUTS.HYDRATION }
    );
    await expect(postPage.commentCardsHeadersTimeStampLink.first()).not.toHaveAttribute(
      'href',
      firstPageComments[0] ?? ''
    );
    return shownComments(page);
  };

  const overJsonRpc = await secondPage(POST_PATH);
  expect(rest.requests, 'a browser without HIVEMIND_REST_NODES makes no REST request').toEqual([]);
  const overRest = await secondPage(`${rest.restBaseURL}${POST_PATH}`);

  expect(overJsonRpc.length).toBeGreaterThan(0);
  expect(overRest).toEqual(overJsonRpc);
  expect(rest.servedRestRequests()).toContain(DISCUSSION_REQUEST);
});
