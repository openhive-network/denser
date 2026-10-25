import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * A $0.00 pending payout opens the same breakdown as a voted one, so a first voter can read the
 * beneficiaries, the payout time and a limited max accepted payout. A declined payout stays
 * struck through, with no popover.
 *
 * Fixture set: `postDetail_zeroPayoutPopover` overlays `postDetail_footerPopovers` with the post's
 * discussion, two unvoted comments of it patched to pending payouts (see its `_index.json`).
 */

test.use({ fixtureTestName: 'postDetail_zeroPayoutPopover' });

const POST_URL = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';
const BENEFICIARY_COMMENT_ID = '@hivebuzz/hivebuzz-notify-gtg-20210630t180220000z';
const DECLINED_COMMENT_ID = '@erialos/re-gtg-qxzw2i';

function commentFooter(page: Page, commentId: string): Locator {
  return page.locator(`[id="${commentId}"]`).getByTestId('comment-card-footer').first();
}

async function expectZeroPayoutBreakdown(tooltip: Locator) {
  await expect(tooltip).toContainText('Pending payout amount: $0.00');
  await expect(tooltip).toContainText('Breakdown:');
  await expect(tooltip.getByRole('link', { name: 'hbdstabilizer: 100.00%' })).toBeVisible();
  await expect(tooltip).toContainText('Payout in');
  await expect(tooltip).toContainText('Max accepted payout: $100.00');
}

test.describe('Zero pending payout popover', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
    await page.goto(POST_URL, { waitUntil: 'load' });
    await postPage.waitForPostHydration();
    await page.waitForLoadState('networkidle');
  });

  test('ZERO-PAYOUT-01: hovering a $0.00 payout opens the breakdown with the beneficiaries', async ({
    page
  }) => {
    const trigger = commentFooter(page, BENEFICIARY_COMMENT_ID).getByRole('button', {
      name: 'Payout $0.00, show breakdown'
    });

    await trigger.hover();
    await expect(postPage.footerPayoutsTooltip).toContainText('Pending payout amount: $0.00');
    await expect(postPage.footerPayoutsTooltip.getByRole('link', { name: 'hbdstabilizer: 100.00%' })).toBeVisible();
  });

  test('ZERO-PAYOUT-02: Enter on a focused $0.00 payout shows the beneficiaries, payout time and max payout', async ({ page }) => {
    const trigger = commentFooter(page, BENEFICIARY_COMMENT_ID).getByRole('button', {
      name: 'Payout $0.00, show breakdown'
    });

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expectZeroPayoutBreakdown(postPage.footerPayoutsTooltip);
    await page.keyboard.press('Escape');
    await expect(postPage.footerPayoutsTooltip).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('ZERO-PAYOUT-03: a declined $0.00 payout stays struck through without a popover', async ({ page }) => {
    const footer = commentFooter(page, DECLINED_COMMENT_ID);
    const declined = footer.getByTestId('post-payout-decline');

    await expect(declined).toHaveText('$0.00');
    await expect(declined).toHaveAttribute('title', 'Payout Declined');
    await expect(footer.getByRole('button', { name: /show breakdown/ })).toHaveCount(0);
  });
});
