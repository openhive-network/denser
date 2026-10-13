import { test, expect } from '../support/fixture-proxy-test';
import { openPostVoters } from '../support/postVotersContext';

test.use({ fixtureTestName: 'postDetail_votesCounted' });

test.describe('Post voters list, every vote on chain counted', () => {
  test('VOTERS-AFTER-PAYOUT-01: no after-payout line when the chain has as many votes as the count', async ({
    page
  }) => {
    const voterList = await openPostVoters(page);

    await expect(voterList.getByRole('listitem')).toHaveCount(5);
    await expect(voterList).not.toContainText('after payout');
  });
});
