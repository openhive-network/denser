import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { POST_PATH } from '../support/commentingContext';

/**
 * Comment sort options (§5 CMT-08).
 *
 * Pure client-side sort by query param `?sort=trending|new|votes`. The
 * `comments-section` reads `searchParams.sort` and feeds it into the
 * shared `sorter` (apps/blog/lib/sorter.ts). No broadcast.
 *
 * Reuses the `commenting/` base fixture — no overlay needed.
 */

// `authenticatedUser: {}` matches the observer baked into the recorded
// fixtures (`commenting/` was recorded against the seeded user so SSR
// requests carry observer=guest4test). Without it the param hash on
// bridge.get_post / get_discussion / get_community shifts and replay
// misses.
test.use({ fixtureTestName: 'commenting', authenticatedUser: {} });

test.describe('Comment sort options (§5)', () => {
  test('CMT-08: sort=new reorders the comment list', async ({ page }) => {
    const postPage = new PostPage(page);

    // Default sort (trending → highest payout first).
    await page.goto(POST_PATH, { waitUntil: 'domcontentloaded' });
    const trendingFirst = await postPage.commentListItems
      .first()
      .locator('[data-testid="comment-timestamp-link"]')
      .first()
      .getAttribute('href');
    expect(trendingFirst).toBe('#@sicarius/re-gtg-qux0er');

    // Navigate to ?sort=new — the most recent top-level comment should
    // surface to the top.
    await page.goto(`${POST_PATH}?sort=new`, { waitUntil: 'domcontentloaded' });
    const newFirst = await postPage.commentListItems
      .first()
      .locator('[data-testid="comment-timestamp-link"]')
      .first()
      .getAttribute('href');
    expect(newFirst).toBe('#@intoy.bugoy/re-gtg-qy7ta5');
    expect(newFirst).not.toBe(trendingFirst);
  });
});
