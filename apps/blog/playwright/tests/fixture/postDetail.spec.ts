import fs from 'fs';
import path from 'path';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import {
  MAX_ABOVE_ARTICLE_SHIFT,
  MOBILE_VIEWPORT,
  collectAboveArticleLayoutShifts,
  observeAboveArticleLayoutShifts
} from '../support/layoutShift';

/**
 * Post Detail fixture tests — Section 1.3 of the Test Plan:
 * "Page View Verification (Anonymous & Logged In User)"
 *
 * Covers ANON-POST-01 through ANON-POST-07:
 *   01 – Post detail page loads (title, author, body, payout, comments)
 *   02 – Post metadata (avatar, reputation, timestamp, tags)
 *   03 – Vote panel (upvote/downvote buttons visible)
 *   04 – Comments section renders
 *   05 – Share/reblog icons visible
 *   06 – Pending-indexing banner
 *   07 – Non-existent post → 404
 *   08 – No layout shift above the article on a phone viewport
 *   09 – No roles/votes requests after load; voter list loads when opened
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'postDetail' });

const POST_RECORDING = path.resolve(__dirname, '..', 'mock', 'fixtures', 'postDetail', '0001-bridge.get_post.json');
const DEFERRED_RPC_METHODS = ['bridge.list_community_roles', 'database_api.list_votes'];

function recordedTotalVotes(): number {
  const raw: { response: { result: { stats: { total_votes: number } } } } = JSON.parse(
    fs.readFileSync(POST_RECORDING, 'utf-8')
  );
  return raw.response.result.stats.total_votes;
}

test.describe('Post Detail tests (fixture-based)', () => {
  const community = 'hive-160391';
  const author = 'gtg';
  const permlink = 'hive-hardfork-25-jump-starter-kit';

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  // ── ANON-POST-01: Post detail page loads ─────────────────────────────

  test('ANON-POST-01: post detail page loads with title, author, body, payout and comments', async ({
    page
  }) => {
    await page.goto(`/${community}/@${author}/${permlink}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await expect(postPage.articleTitle).toBeVisible();
    await expect(postPage.articleAuthorData).toBeVisible();
    await expect(postPage.articleBody).toBeVisible();
    await expect(postPage.footerPayouts).toBeVisible();
    await expect(postPage.commentListLocator.first()).toBeVisible();
  });

  // ── ANON-POST-02: Post metadata ──────────────────────────────────────

  test('ANON-POST-02: post metadata shows avatar, reputation, timestamp and tags', async ({
    page
  }) => {
    await page.goto(`/${community}/@${author}/${permlink}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    // Author avatar in the header area
    await expect(postPage.authorHeaderAvatar).toBeVisible();

    // Author reputation
    await expect(postPage.authorHeaderReputation).toBeVisible();

    // Timestamp in the post footer
    await expect(postPage.postFooterTimestamp).toBeVisible();

    // Tags / hashtags
    await expect(postPage.hashtagsPosts).toBeVisible();
  });

  // ── ANON-POST-03: Vote panel ─────────────────────────────────────────

  test('ANON-POST-03: upvote and downvote buttons are visible', async ({ page }) => {
    await page.goto(`/${community}/@${author}/${permlink}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await expect(postPage.upvoteButton).toBeVisible();
    await expect(postPage.downvoteButton).toBeVisible();
  });

  // ── ANON-POST-04: Comments section ───────────────────────────────────

  test('ANON-POST-04: comments section renders with at least one comment', async ({ page }) => {
    await page.goto(`/${community}/@${author}/${permlink}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await expect(postPage.commentListLocator.first()).toBeVisible();

    const commentCount = await postPage.commentListItems.count();
    expect(commentCount).toBeGreaterThan(0);
  });

  // ── ANON-POST-05: Share / reblog icons ───────────────────────────────

  test('ANON-POST-05: share and reblog icons are visible', async ({ page }) => {
    await page.goto(`/${community}/@${author}/${permlink}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    // Share button (link icon in footer)
    await expect(postPage.sharePostBtn).toBeVisible();

    // Reblog icon in footer
    await expect(postPage.footerReblogIcon).toBeVisible();
  });

  // ── ANON-POST-06: Pending-indexing banner ────────────────────────────

  test('ANON-POST-06: pending-indexing banner is visible when pending flag is present', async ({
    page
  }) => {
    // Navigate to a non-existent permlink with ?pending=1 — the server
    // skips the 404 and renders the PendingIndexingMessage component instead.
    await page.goto(`/${community}/@${author}/does-not-exist-pending-test?pending=1`, {
      waitUntil: 'domcontentloaded'
    });

    await expect(postPage.pendingIndexingMessage).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  });

  // ── ANON-POST-07: Non-existent post → 404 ───────────────────────────

  test('ANON-POST-07: non-existent post renders 404 page', async ({ page }) => {
    await page.goto(`/${community}/@${author}/this-post-does-not-exist-xyz/`, {
      waitUntil: 'domcontentloaded'
    });

    await expect(postPage.notFoundPage).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(postPage.notFoundHeading).toHaveText('404');
  });

  // ── ANON-POST-08: No layout shift above the article ──────────────────

  test.describe('on a phone viewport', () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test('ANON-POST-08: header above the article does not shift after hydration', async ({ page }) => {
      await observeAboveArticleLayoutShifts(page);
      await page.goto(`/${community}/@${author}/${permlink}/`, { waitUntil: 'domcontentloaded' });
      await expect(postPage.articleBody).toBeVisible();

      const { score, shifts } = await collectAboveArticleLayoutShifts(page);
      expect(score, shifts.join('\n')).toBeLessThan(MAX_ABOVE_ARTICLE_SHIFT);
    });
  });

  // ── ANON-POST-09: Roles and votes rendered from the server ───────────

  test('ANON-POST-09: no roles or votes request after load, voter list loads when opened', async ({
    page
  }) => {
    const deferredRequests: string[] = [];
    page.on('request', (request) => {
      const body = request.postData() ?? '';
      deferredRequests.push(...DEFERRED_RPC_METHODS.filter((method) => body.includes(`"${method}"`)));
    });

    await page.goto(`/${community}/@${author}/${permlink}/`, { waitUntil: 'load' });
    await postPage.waitForPostHydration();
    await page.waitForLoadState('networkidle');

    expect(deferredRequests).toEqual([]);
    await expect(postPage.postFooterVotes).toHaveText(`${recordedTotalVotes()} votes`);

    const listVotes = page.waitForRequest((request) =>
      (request.postData() ?? '').includes('"database_api.list_votes"')
    );
    await postPage.postFooterVotes.click();
    await listVotes;
    await expect(postPage.postVoterList.locator('li').first()).toBeVisible();
  });
});
