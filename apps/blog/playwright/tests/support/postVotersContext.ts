import type { Locator, Page } from '@playwright/test';
import { expect } from './fixture-proxy-test';
import { PostPage } from './pages/postPage';

/**
 * Shared setup for the specs on the "+N after payout" line of the post voters list. They replay
 * `postDetail_votesCounted`, where bridge.get_post's stats.total_votes equals the 5 rows the
 * recorded database_api.list_votes returns, or one of its overlays that add rows dated after the
 * post's payout: `postDetail_voteAfterPayout` (one) and `postDetail_votesAfterPayout` (two).
 */
const POST_URL = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';

const COUNTED_VOTES = 5;

/** Opens the post footer voters list from the keyboard and waits for it to load. */
export async function openPostVoters(page: Page): Promise<Locator> {
  const postPage = new PostPage(page);
  await page.goto(POST_URL, { waitUntil: 'load' });
  await postPage.waitForPostHydration();
  const votesTrigger = page
    .locator('[data-testid="author-data-post-footer"]')
    .getByRole('button', { name: `${COUNTED_VOTES} votes, show voters` });
  await votesTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(postPage.postVoterList.getByRole('link')).toHaveCount(COUNTED_VOTES);
  return postPage.postVoterList;
}
