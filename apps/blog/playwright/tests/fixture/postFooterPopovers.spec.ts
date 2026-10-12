import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * The payout breakdown and the voters list are reachable from the keyboard: Tab focuses their
 * triggers, Enter opens them, Esc closes them and returns focus to the trigger. Mouse hover still
 * opens them.
 *
 * Fixture set: `postDetail_footerPopovers` overlays `postDetail_popover` with the feed history
 * the payout breakdown reads.
 */

test.use({ fixtureTestName: 'postDetail_footerPopovers' });

const POST_URL = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';

test.describe('Post footer payout and voters popovers', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
    await page.goto(POST_URL, { waitUntil: 'load' });
    await postPage.waitForPostHydration();
    await page.waitForLoadState('networkidle');
  });

  test('FOOTER-POPOVER-01: payout and votes are in the Tab order, Enter opens, Esc closes back to the trigger', async ({
    page
  }) => {
    const footerStats = page.locator('[data-testid="author-data-post-footer"]');
    const payoutTrigger = footerStats.getByRole('button', { name: 'Payout $148.90, show breakdown' });
    const votesTrigger = footerStats.getByRole('button', { name: '589 votes, show voters' });

    await payoutTrigger.focus();
    await page.keyboard.press('Tab');
    await expect(votesTrigger).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(payoutTrigger).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(postPage.footerPayoutsTooltip).toContainText('Past Payouts $148.90');
    await page.keyboard.press('Escape');
    await expect(postPage.footerPayoutsTooltip).toBeHidden();
    await expect(payoutTrigger).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(votesTrigger).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(postPage.postVoterList.locator('li').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(postPage.postVoterList).toBeHidden();
    await expect(votesTrigger).toBeFocused();
  });

  test('FOOTER-POPOVER-02: hovering the payout opens the breakdown without moving focus', async ({
    page
  }) => {
    await postPage.footerPayouts.hover();
    await expect(postPage.footerPayoutsTooltip).toContainText('Past Payouts $148.90');
    await expect(page.locator(':focus')).toHaveCount(0);

    await page.mouse.move(0, 0);
    await expect(postPage.footerPayoutsTooltip).toBeHidden();
    await expect(page.locator(':focus')).toHaveCount(0);
  });

  test('FOOTER-POPOVER-03: comment payout and votes triggers are named buttons', async () => {
    const comment = postPage.commentCardsFooters.filter({ hasText: '4 votes' }).first();

    await expect(comment.getByRole('button', { name: 'Payout $0.29, show breakdown' })).toBeVisible();
    await expect(comment.getByRole('button', { name: '4 votes, show voters' })).toBeVisible();
  });
});
