import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';

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
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'postDetail' });

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
});
