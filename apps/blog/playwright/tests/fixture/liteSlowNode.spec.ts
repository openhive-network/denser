import type { Request } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * A lite-aware API node that stops answering `lite.*` (the fixture proxy holds every `lite.*`
 * response, so each one times out) while it keeps serving `bridge.*`. Post reads get the lite read
 * budget (LITE_READ_BUDGET_MS in packages/transaction/lib/lite-api.ts), the lookup of the lite node
 * (`lite.get_info`, asked before every read: DENSER_LITE_PROBE_TTL_S=0) included.
 *
 *   LITE-SLOW-01 – /trending renders from bridge.* within the budget plus a normal read, and its
 *                  next page loads from bridge.* with no "Couldn't load more posts"
 *   LITE-SLOW-02 – a did:lite: post, which only lite.* knows, answers the service-unavailable
 *                  boundary (503), not a 404
 *   LITE-SLOW-03 – once the node answers lite.* again, the lite feed lists did:lite: authors
 *
 * Fixtures: `liteSlowNode`, the `litePost` recording (a lite-aware node) with the anonymous
 * /trending page of `homepage` and two next pages added by hand (the second one the end of the feed).
 * Replay:  pnpm --filter @hive/blog test:fixture liteSlowNode
 */

test.use({ fixtureTestName: 'liteSlowNode' });
test.describe.configure({ mode: 'serial' });

/** LITE_READ_BUDGET_MS. */
const LITE_READ_BUDGET_MS = 3_000;
/** What a page may take on top of the budget: its stock reads, all answered at once from the recording. */
const NORMAL_PAGE_MS = 7_000;
const DID_POST_PATH = '/lite-test/@did:lite:lite-smoke-1016/re-lite-test-478380rd5v/';
const LITE_NAME = 'lite-smoke-1016';
const LITE_FEED_PATH = '/created/lite-test';
const POSTS_PER_PAGE = 20;

const rpcMethodOf = (request: Request): string => {
  if (request.method() !== 'POST') return '';
  const body: unknown = request.postDataJSON();
  return typeof body === 'object' && body !== null && 'method' in body && typeof body.method === 'string'
    ? body.method
    : '';
};

const isNextFeedPageRead = (request: Request): boolean =>
  rpcMethodOf(request) === 'bridge.get_ranked_posts' && !(request.postData() ?? '').includes('"start_author":""');

test.describe('lite node stalled past the read budget', () => {
  let releaseLite = () => {};

  test.beforeEach(({ fixtureProxy }) => {
    releaseLite = fixtureProxy.holdResponses((call) => call.method.startsWith('lite.'));
  });

  // The page goes first: a render it starts once lite.* answers again (a link prefetch) would read
  // feeds the recording has no lite.* answer for, and the server would learn the node lacks lite.*.
  test.afterEach(async ({ page }) => {
    await page.close();
    releaseLite();
  });

  test('LITE-SLOW-01: /trending and its next page render from bridge.*', async ({ page }) => {
    const posts = page.getByTestId('post-list-item');

    const startedAt = Date.now();
    const response = await page.goto('/trending', { waitUntil: 'commit' });
    expect(response?.status()).toBe(200);
    await expect(posts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    expect(Date.now() - startedAt).toBeLessThan(LITE_READ_BUDGET_MS + NORMAL_PAGE_MS);
    await expect(posts).toHaveCount(POSTS_PER_PAGE);

    const nextPageRead = page.waitForRequest(isNextFeedPageRead);
    await posts.last().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 100_000);
    await nextPageRead;
    await expect(posts).toHaveCount(2 * POSTS_PER_PAGE, { timeout: LITE_READ_BUDGET_MS + NORMAL_PAGE_MS });
    await expect(page.getByTestId('load-more-error')).toHaveCount(0);
    await expect(page.getByText(enBlog.user_profile.load_more_failed)).toHaveCount(0);
  });

  test('LITE-SLOW-02: a did:lite: post answers the service-unavailable boundary, not a 404', async ({ page }) => {
    const response = await page.goto(DID_POST_PATH);

    expect(response?.status()).toBe(503);
    await expect(page.getByRole('heading', { name: 'Service Temporarily Unavailable' })).toBeVisible();
  });
});

test('LITE-SLOW-03: once the node answers lite.* again, the lite feed lists did:lite: authors', async ({ page }) => {
  const postAuthor = page.getByTestId('post-author').first();

  await page.goto(LITE_FEED_PATH);

  await expect(postAuthor).toHaveText(LITE_NAME);
  await expect(postAuthor).toHaveAttribute('href', /\/@did:lite:/);
});
