import { test, expect } from '../support/fixture-proxy-test';
import { openPostVoters } from '../support/postVotersContext';

test.use({ fixtureTestName: 'postDetail_votesAfterPayout' });

test.describe('Post voters list, several votes after payout', () => {
  test('VOTERS-AFTER-PAYOUT-03: uses the plural for two votes after payout', async ({ page }) => {
    const voterList = await openPostVoters(page);

    await expect(voterList).not.toContainText('guest4test1');
    await expect(voterList.getByRole('listitem').last()).toHaveText('+2 votes after payout (not counted)');
  });
});
