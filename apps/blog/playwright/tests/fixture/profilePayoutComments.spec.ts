import fs from 'fs';
import path from 'path';
import type { Locator } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { CommentViewPage } from '../support/pages/commentViewPage';
import { TIMEOUTS } from '../support/constants';

/**
 * Profile Payouts tab — a pending comment ("RE:" card) and the links on its card.
 *
 * Every link on the card (timestamp, title, description, response count) must
 * open the comment's own page, which shows the "viewing a single comment's
 * thread" context box for it.
 *
 * Fixtures: `profilePayoutComments` is an additive overlay on `userProfileTabs`
 * (@hiveio's profile reads). Its Payouts response is patched to hold one
 * pending comment copied verbatim from a recorded discussion, and the comment's
 * page is composed from the same recording (see its `_index.json`), so it can
 * only be replayed.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- profilePayoutComments
 */

test.use({ fixtureTestName: 'profilePayoutComments' });
test.skip(isRecordMode, 'replay-only: the profilePayoutComments corpus is composed from other recordings');

const PROFILE = '@hiveio';
const PAYOUT_RECORDING = path.resolve(
  __dirname,
  '..',
  'mock',
  'fixtures',
  'profilePayoutComments',
  '0001-bridge.get_account_posts.json'
);

interface IRecordedComment {
  author: string;
  permlink: string;
  category: string;
  title: string;
  body: string;
  children: number;
  url: string;
}

const [comment]: IRecordedComment[] = JSON.parse(fs.readFileSync(PAYOUT_RECORDING, 'utf-8')).response.result;
const COMMENT_PATH = `/${comment.category}/@${comment.author}/${comment.permlink}`;
const BODY_OPENING = comment.body.split('.')[0];

const CARD_LINKS: { name: string; caseId: string; locate: (card: Locator) => Locator }[] = [
  { name: 'timestamp', caseId: '02', locate: (card) => card.getByTestId('post-card-timestamp') },
  { name: 'title', caseId: '03', locate: (card) => card.getByTestId('post-title').getByRole('link') },
  { name: 'description', caseId: '04', locate: (card) => card.getByTestId('post-description') },
  { name: 'response count', caseId: '05', locate: (card) => card.getByTestId('post-card-response-link') }
];

test.describe('Profile Payouts tab — pending comment card', () => {
  let profilePage: ProfilePage;
  let commentCard: Locator;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    await profilePage.gotoPostsPayoutsProfilePage(PROFILE);
    commentCard = profilePage.postBlogItem.filter({ hasText: comment.title });
  });

  test('PAYOUT-RECOMMENT-01 — the card shows the comment author, title, summary and response count', async () => {
    await expect(profilePage.postsMenuActiveTab).toHaveText('Payouts');
    await expect(commentCard).toHaveCount(1);

    await expect(commentCard.getByTestId('post-card-avatar')).toHaveAttribute('href', `/@${comment.author}`);
    await expect(commentCard.getByTestId('post-author')).toHaveText(comment.author);
    await expect(commentCard.getByTestId('post-card-timestamp')).toHaveAttribute('href', COMMENT_PATH);
    await expect(commentCard.getByTestId('post-title')).toHaveText(comment.title);
    await expect(commentCard.getByTestId('post-description')).toContainText(BODY_OPENING);
    await expect(commentCard.getByTestId('post-card-response-link')).toHaveText(String(comment.children));
    // Comments can't be reblogged, so their card has no reblog control.
    await expect(commentCard.getByTestId('post-card-reblog')).toHaveCount(0);
  });

  for (const { name, caseId, locate } of CARD_LINKS) {
    test(`PAYOUT-RECOMMENT-${caseId} — the card's ${name} opens the comment's thread`, async ({ page }) => {
      const commentViewPage = new CommentViewPage(page);

      await locate(commentCard).click();

      await expect(page).toHaveURL((url) => url.pathname.replace(/\/$/, '') === COMMENT_PATH);
      await expect(commentViewPage.getReArticleTitle).toHaveText(comment.title, {
        timeout: TIMEOUTS.HYDRATION
      });
      await expect(commentViewPage.getViewFullContext).toHaveAttribute('href', comment.url);
      await expect(page.getByText(BODY_OPENING).first()).toBeVisible();
    });
  }
});
