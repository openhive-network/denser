import { test, expect } from '../support/fixture-proxy-test';
import { openPostVoters } from '../support/postVotersContext';

test.use({ fixtureTestName: 'postDetail_voteAfterPayout' });

test.describe('Post voters list, one vote after payout', () => {
  test('VOTERS-AFTER-PAYOUT-02: lists the counted voters and says one vote came after payout', async ({
    page
  }) => {
    const voterList = await openPostVoters(page);

    await expect(voterList).not.toContainText('guest4test2');
    await expect(voterList.getByRole('listitem').last()).toHaveText('+1 vote after payout (not counted)');
  });
});
